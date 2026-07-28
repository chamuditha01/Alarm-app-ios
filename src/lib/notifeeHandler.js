// src/lib/notifeeHandler.js
import { NativeModules } from "react-native";
import { startAlarmSound } from "./audioService";
import { getLockState, setLockState } from "./lockState";

let handlerInitialized = false;
let navigationCallback = null;
let notifeeModulePromise = null;

async function getNotifeeModule() {
  if (!NativeModules?.NotifeeApiModule) {
    return null;
  }
  if (!notifeeModulePromise) {
    notifeeModulePromise = import("@notifee/react-native")
      .then((module) => module)
      .catch(() => null);
  }
  return notifeeModulePromise;
}

export function setNavigationCallback(cb) {
  navigationCallback = cb;
}

function handleAlarmNotification(notification) {
  const data = notification?.data;
  if (data?.type !== "LOCKIN_ALARM") return;

  const current = getLockState();
  if (current.isLocked) {
    // Already in active locked flow! Ignore duplicate trigger.
    return;
  }

  startAlarmSound();
  setLockState({ isLocked: true, currentStep: "RINGING" });

  if (navigationCallback) {
    navigationCallback("/ringing");
  }
}

// Top-level Notifee Background Event Registration for Headless JS tasks
try {
  if (NativeModules?.NotifeeApiModule) {
    import("@notifee/react-native").then(({ default: notifee, EventType }) => {
      notifee.onBackgroundEvent(async ({ type, detail }) => {
        if (detail.notification?.data?.type === "LOCKIN_ALARM") {
          const current = getLockState();
          if (current.isLocked) return;

          startAlarmSound();
          setLockState({ isLocked: true, currentStep: "RINGING" });

          if (type === EventType.PRESS || type === EventType.ACTION_PRESS || type === EventType.DELIVERED) {
            if (navigationCallback) {
              navigationCallback("/ringing");
            }
          }
        }
      });
    }).catch(() => {});
  }
} catch {
  // ignore
}

export async function initNotifeeHandler() {
  if (handlerInitialized) return;

  const notifeeModule = await getNotifeeModule();
  if (!notifeeModule) return;

  const notifee = notifeeModule.default || notifeeModule;
  if (!notifee || typeof notifee.requestPermission !== "function") return;

  handlerInitialized = true;

  try {
    const EventType = notifeeModule.EventType;

    await notifee.requestPermission();

    if (EventType) {
      notifee.onForegroundEvent(({ type, detail }) => {
        const current = getLockState();
        if (current.isLocked) return;

        switch (type) {
          case EventType.PRESS:
          case EventType.ACTION_PRESS:
            handleAlarmNotification(detail.notification);
            break;
          case EventType.DELIVERED:
            if (detail.notification?.data?.type === "LOCKIN_ALARM") {
              startAlarmSound();
              setLockState({ isLocked: true, currentStep: "RINGING" });
              if (navigationCallback) {
                navigationCallback("/ringing");
              }
            }
            break;
        }
      });
    }

    const initialNotification = await notifee.getInitialNotification();
    if (initialNotification) {
      handleAlarmNotification(initialNotification.notification);
    }
  } catch (err) {
    console.warn("Failed to initialize Notifee handler:", err);
  }
}

export async function displayAlarmNotification(alarmId, label) {
  const notifeeModule = await getNotifeeModule();
  if (!notifeeModule) return;

  const notifee = notifeeModule.default || notifeeModule;
  if (!notifee || typeof notifee.createChannel !== "function") return;

  try {
    const { AndroidCategory, AndroidImportance, AndroidVisibility } = notifeeModule;

    const channelId = await notifee.createChannel({
      id: "lockin_alarms",
      name: "LockIn Alarms",
      importance: AndroidImportance?.HIGH ?? 4,
      visibility: AndroidVisibility?.PUBLIC ?? 1,
      sound: "default",
      vibration: true,
      bypassDnd: true,
    });

    await notifee.displayNotification({
      id: String(alarmId),
      title: label || "LockIn Ritual",
      body: "Alarm ringing! Time for your focus reading.",
      android: {
        channelId,
        category: AndroidCategory?.ALARM ?? "alarm",
        fullScreenAction: {
          id: "default",
          launchActivity: "default",
        },
        pressAction: {
          id: "default",
          launchActivity: "default",
        },
        autoCancel: false,
        ongoing: true,
      },
      data: { type: "LOCKIN_ALARM", alarmId: String(alarmId) },
    });
  } catch (err) {
    console.warn("Failed to display alarm notification:", err);
  }
}

export async function cancelAllAlarmNotifications() {
  const notifeeModule = await getNotifeeModule();
  if (!notifeeModule) return;

  const notifee = notifeeModule.default || notifeeModule;
  if (!notifee || typeof notifee.cancelAllNotifications !== "function") return;

  try {
    await notifee.cancelAllNotifications();
  } catch (err) {
    console.warn("Failed to cancel alarm notifications:", err);
  }
}
