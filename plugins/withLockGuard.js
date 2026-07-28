const { withAndroidManifest, withMainActivity, withMainApplication, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withLockGuard(config) {
  // Generate Kotlin module files during dangerous mod pass
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const androidSrcDir = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/java/com/chamuditha04/lockinapp"
      );

      if (!fs.existsSync(androidSrcDir)) {
        fs.mkdirSync(androidSrcDir, { recursive: true });
      }

      const lockGuardModuleCode = `package com.chamuditha04.lockinapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LockGuardModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "LockGuardModule"

    @ReactMethod
    fun setAppLocked(locked: Boolean) {
        MainActivity.isAppLocked = locked
    }
}
`;

      const lockGuardPackageCode = `package com.chamuditha04.lockinapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class LockGuardPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(LockGuardModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

      fs.writeFileSync(path.join(androidSrcDir, "LockGuardModule.kt"), lockGuardModuleCode);
      fs.writeFileSync(path.join(androidSrcDir, "LockGuardPackage.kt"), lockGuardPackageCode);

      return config;
    },
  ]);

  // 1. Android Manifest updates (showWhenLocked & turnScreenOn)
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    if (!application.activity) {
      application.activity = [];
    }

    const activities = application.activity;

    const mainActivity = activities.find(
      (activity) => activity["$"]["android:name"] === ".MainActivity"
    );

    if (mainActivity) {
      mainActivity["$"]["android:showWhenLocked"] = "true";
      mainActivity["$"]["android:turnScreenOn"] = "true";
    }

    let notifeeReceiver = activities.find(
      (activity) => activity["$"]["android:name"] === "app.notifee.core.NotificationReceiverActivity"
    );

    if (!notifeeReceiver) {
      notifeeReceiver = {
        "$": {
          "android:name": "app.notifee.core.NotificationReceiverActivity",
          "android:exported": "true",
          "android:taskAffinity": "",
          "android:theme": "@android:style/Theme.Translucent.NoTitleBar",
        },
      };
      activities.push(notifeeReceiver);
    }

    notifeeReceiver["$"]["android:showWhenLocked"] = "true";
    notifeeReceiver["$"]["android:turnScreenOn"] = "true";

    return config;
  });

  // 2. Modify MainActivity.kt for strict lockdown (onUserLeaveHint, onWindowFocusChanged, Immersive Sticky)
  config = withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("import android.view.WindowManager")) {
      contents = contents.replace(
        "import android.os.Bundle",
        "import android.os.Bundle\nimport android.view.WindowManager\nimport android.view.View\nimport android.content.Intent"
      );
    }

    const lockClassAdditions = `
  companion object {
    @JvmStatic
    var isAppLocked: Boolean = false
      set(value) {
        field = value
        instance?.updateLockStateUI(value)
      }

    private var instance: MainActivity? = null
  }

  override fun onResume() {
    super.onResume()
    instance = this
    if (isAppLocked) {
      enableStickyImmersiveMode()
    }
  }

  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    if (isAppLocked) {
      val intent = Intent(this, MainActivity::class.java)
      intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
      startActivity(intent)
    }
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (isAppLocked) {
      if (!hasFocus) {
        try {
          @Suppress("DEPRECATION")
          sendBroadcast(Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS))
        } catch (_: Exception) {}

        val intent = Intent(this, MainActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        startActivity(intent)
      }
      enableStickyImmersiveMode()
    }
  }

  private fun enableStickyImmersiveMode() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      window.setDecorFitsSystemWindows(false)
      window.insetsController?.let { controller ->
        controller.hide(android.view.WindowInsets.Type.statusBars() or android.view.WindowInsets.Type.navigationBars())
        controller.systemBarsBehavior = android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      }
    } else {
      @Suppress("DEPRECATION")
      window.decorView.systemUiVisibility = (
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        or View.SYSTEM_UI_FLAG_FULLSCREEN
      )
    }
  }

  fun updateLockStateUI(locked: Boolean) {
    runOnUiThread {
      if (locked) {
        enableStickyImmersiveMode()
      } else {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          window.setDecorFitsSystemWindows(true)
          window.insetsController?.show(android.view.WindowInsets.Type.statusBars() or android.view.WindowInsets.Type.navigationBars())
        } else {
          @Suppress("DEPRECATION")
          window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
        }
      }
    }
  }
`;

    if (!contents.includes("isAppLocked")) {
      contents = contents.replace(
        "class MainActivity : ReactActivity() {",
        `class MainActivity : ReactActivity() {\n${lockClassAdditions}`
      );
    }

    const lockFlagsCode = `
    instance = this
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    }
    window.addFlags(
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
      WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
      WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
      WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
    )
`;

    if (!contents.includes("setShowWhenLocked")) {
      contents = contents.replace(
        "super.onCreate(null)",
        `super.onCreate(null)\n${lockFlagsCode}`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  // 3. Register LockGuardPackage in MainApplication.kt
  config = withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("LockGuardPackage")) {
      contents = contents.replace(
        "PackageList(this).packages.apply {",
        "PackageList(this).packages.apply {\n          add(LockGuardPackage())"
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};
