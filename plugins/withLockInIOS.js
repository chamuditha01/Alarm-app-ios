/**
 * withLockInIOS.js
 *
 * Expo Config Plugin — applies iOS-specific configuration for LockIn AlarmKit support:
 *  1. Info.plist: NSAlarmKitUsageDescription, NSSupportsLiveActivities
 *  2. Entitlements: App Group for shared UserDefaults between app + widget extension
 *  3. Podfile: ensure minimum iOS 26.0 platform target
 */
const {
  withInfoPlist,
  withEntitlementsPlist,
  withDangerousMod,
  withPodfile,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const APP_GROUP = "group.com.chamuditha04.lockinapp";

// ─── 1. Info.plist keys ──────────────────────────────────────────────────────
function addInfoPlistKeys(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSAlarmKitUsageDescription =
      "LockIn needs alarm access to wake you up at the scheduled time and display the reading task.";
    cfg.modResults.NSSupportsLiveActivities = true;
    cfg.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return cfg;
  });
}

// ─── 2. Entitlements: App Group ───────────────────────────────────────────────
function addEntitlements(config) {
  return withEntitlementsPlist(config, (cfg) => {
    const existing =
      cfg.modResults["com.apple.security.application-groups"] || [];
    if (!existing.includes(APP_GROUP)) {
      cfg.modResults["com.apple.security.application-groups"] = [
        ...existing,
        APP_GROUP,
      ];
    }
    return cfg;
  });
}

// ─── 3. Podfile: platform target ─────────────────────────────────────────────
function setPodfilePlatform(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfilePath)) return cfg;

      let contents = fs.readFileSync(podfilePath, "utf8");

      // Replace any existing platform :ios, 'X.X' line with 26.0
      contents = contents.replace(
        /platform :ios, ['"][\d.]+['"]/,
        "platform :ios, '26.0'"
      );

      fs.writeFileSync(podfilePath, contents, "utf8");
      return cfg;
    },
  ]);
}

// ─── 4. Inject LockInAlarmModule Swift files into Xcode project ──────────────
function injectNativeModule(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const moduleDir = path.join(iosRoot, "LockInAlarmModule");

      if (!fs.existsSync(moduleDir)) {
        fs.mkdirSync(moduleDir, { recursive: true });
      }

      // Copy Swift source files from project source into iOS build directory
      const srcDir = path.join(cfg.modRequest.projectRoot, "ios", "LockInAlarmModule");
      if (!fs.existsSync(srcDir)) return cfg;

      const files = fs.readdirSync(srcDir);
      for (const file of files) {
        const src = path.join(srcDir, file);
        const dest = path.join(moduleDir, file);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }

      return cfg;
    },
  ]);
}

module.exports = function withLockInIOS(config) {
  config = addInfoPlistKeys(config);
  config = addEntitlements(config);
  config = setPodfilePlatform(config);
  config = injectNativeModule(config);
  return config;
};
