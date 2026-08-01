/**
 * expo-target.config.js
 *
 * Configuration for the LockInAlarmWidget WidgetKit extension target.
 * @bacons/apple-targets reads this file and generates the Xcode target.
 */
/** @type {import("@bacons/apple-targets").Config} */
module.exports = {
  type: "widget",
  name: "LockInAlarmWidget",
  deploymentTarget: "26.0",
  bundleIdentifier: "com.chamuditha04.lockinapp.LockInAlarmWidget",
  entitlements: {
    "com.apple.security.application-groups": [
      "group.com.chamuditha04.lockinapp",
    ],
  },
  // Colors for the widget extension target's Info.plist
  // NSSupportsLiveActivities must be in the widget extension too
  infoPlist: {
    NSSupportsLiveActivities: true,
    NSSupportsLiveActivitiesFrequentUpdates: true,
  },
};
