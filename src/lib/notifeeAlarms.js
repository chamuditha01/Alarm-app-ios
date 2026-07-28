// src/lib/notifeeAlarms.js
import { NativeModules } from "react-native";

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

export async function setupChannel() {
  const notifeeModule = await getNotifeeModule();
  if (!notifeeModule) return;

  const { default: notifee, AndroidImportance, AndroidVisibility } = notifeeModule;
  await notifee.createChannel({
    id: "alarms",
    name: "Founder's Ritual Alarms",
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: "default",
    vibration: true,
    bypassDnd: true,
  });
}

export async function scheduleAlarm(hour, minute, id) {
  const notifeeModule = await getNotifeeModule();
  if (!notifeeModule) return;

  const { default: notifee, AndroidCategory, TriggerType } = notifeeModule;
  const now = new Date();
  const trigger = new Date();
  trigger.setHours(hour, minute, 0, 0);
  if (trigger <= now) trigger.setDate(trigger.getDate() + 1);

  await notifee.createTriggerNotification(
    {
      id: String(id),
      title: "Founder's ritual",
      body: "Time to read before anything else opens.",
      android: {
        channelId: "alarms",
        category: AndroidCategory.ALARM,
        fullScreenAction: {
          id: "default",
        },
        pressAction: { id: "default" },
        autoCancel: false,
        ongoing: true,
      },
      data: { type: "LOCKIN_ALARM", alarmId: String(id) },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: trigger.getTime(),
      alarmManager: { allowWhileIdle: true },
    }
  );
}