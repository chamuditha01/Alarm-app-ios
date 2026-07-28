const { withAndroidManifest, withMainActivity } = require("@expo/config-plugins");

module.exports = function withLockScreenActivity(config) {
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

  config = withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("import android.view.WindowManager")) {
      contents = contents.replace(
        "import android.os.Bundle",
        "import android.os.Bundle\nimport android.view.WindowManager"
      );
    }

    const lockFlagsCode = `
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

  return config;
};
