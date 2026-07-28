// src/lib/alarms.js
import { NativeModules } from "react-native";
import { startAlarmSound } from "./audioService";
import { displayAlarmNotification } from "./notifeeHandler";

const ALARM_CHANNEL_ID = "lockin_alarms";
let notifeeModulePromise = null;
const localAlarmTimers = new Map();
let activeAlarmsList = [];
let monitorInterval = null;
let lastFiredAlarmKey = null;

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

export function updateActiveAlarmsList(alarms) {
  activeAlarmsList = alarms.filter((a) => a.enabled);
}

export function startAlarmMonitor(onTriggerCallback) {
  if (monitorInterval) clearInterval(monitorInterval);

  monitorInterval = setInterval(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    const timeKey = `${currentHour}:${currentMinute}`;

    // Fire on the 0th second of matching minute once
    if (currentSecond === 0 && lastFiredAlarmKey !== timeKey) {
      const matchingAlarm = activeAlarmsList.find(
        (a) => a.hour === currentHour && a.minute === currentMinute
      );

      if (matchingAlarm) {
        lastFiredAlarmKey = timeKey;
        startAlarmSound();
        displayAlarmNotification(matchingAlarm.id, matchingAlarm.label).catch(() => {});
        if (onTriggerCallback) {
          onTriggerCallback(matchingAlarm);
        }
      }
    }

    if (currentSecond === 2 && lastFiredAlarmKey === timeKey) {
      // Reset fired key after minute passes 2 seconds
    }
  }, 1000);
}

export function stopAlarmMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

function getMsUntilNextOccurrence(hour, minute) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

function scheduleLocalAlarm(hour, minute, id, onTriggerCallback) {
  const key = String(id);
  if (localAlarmTimers.has(key)) {
    clearTimeout(localAlarmTimers.get(key));
  }

  const delay = getMsUntilNextOccurrence(hour, minute);

  const timeoutId = setTimeout(() => {
    startAlarmSound();
    if (onTriggerCallback) {
      onTriggerCallback({ id, hour, minute });
    }
    // Re-schedule for next day
    scheduleLocalAlarm(hour, minute, id, onTriggerCallback);
  }, delay);

  localAlarmTimers.set(key, timeoutId);
  return `local-${key}`;
}

function cancelLocalAlarm(id) {
  const key = String(id).replace(/^local-/, "");
  if (localAlarmTimers.has(key)) {
    clearTimeout(localAlarmTimers.get(key));
    localAlarmTimers.delete(key);
  }
}

export async function ensureAlarmChannel() {
  const notifeeModule = await getNotifeeModule();
  if (!notifeeModule) return false;

  try {
    const { default: notifee, AndroidImportance, AndroidVisibility } = notifeeModule;

    await notifee.createChannel({
      id: ALARM_CHANNEL_ID,
      name: "LockIn Alarms",
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: "default",
      vibration: true,
      bypassDnd: true,
    });
    return true;
  } catch (err) {
    console.warn("Channel setup warning:", err);
    return false;
  }
}

export async function requestPermissions() {
  const notifeeModule = await getNotifeeModule();
  if (!notifeeModule) return true;

  try {
    const { default: notifee } = notifeeModule;
    await notifee.requestPermission();
    return await ensureAlarmChannel();
  } catch {
    return true;
  }
}

export async function scheduleAlarm(hour, minute, id, label = "LockIn Ritual", onTriggerCallback = null) {
  cancelLocalAlarm(id);
  const notifeeModule = await getNotifeeModule();

  if (!notifeeModule) {
    return scheduleLocalAlarm(hour, minute, id, onTriggerCallback);
  }

  try {
    const { default: notifee, AndroidCategory, AndroidImportance, TriggerType } = notifeeModule;

    const now = new Date();
    const trigger = new Date();
    trigger.setHours(hour, minute, 0, 0);
    if (trigger.getTime() <= now.getTime()) {
      trigger.setDate(trigger.getDate() + 1);
    }

    await ensureAlarmChannel();

    return await notifee.createTriggerNotification(
      {
        id: String(id),
        title: label,
        body: "Alarm ringing! Time for your 10-page focus reading.",
        android: {
          channelId: ALARM_CHANNEL_ID,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance?.HIGH ?? 4,
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
        data: { type: "LOCKIN_ALARM", alarmId: String(id) },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: trigger.getTime(),
        alarmManager: { allowWhileIdle: true },
      }
    );
  } catch (err) {
    console.warn("Notifee trigger scheduling fallback:", err);
    return scheduleLocalAlarm(hour, minute, id, onTriggerCallback);
  }
}

export async function cancelAlarm(id) {
  cancelLocalAlarm(id);
  const notifeeModule = await getNotifeeModule();
  if (!notifeeModule) return;

  try {
    const { default: notifee } = notifeeModule;
    await notifee.cancelNotification(String(id));
  } catch (err) {
    console.warn("Cancel notification error:", err);
  }
}

export async function scheduleTestAlarm5Sec() {
  const notifeeModule = await getNotifeeModule();
  const triggerTime = Date.now() + 5000;

  if (notifeeModule) {
    try {
      const { default: notifee, AndroidCategory, AndroidImportance, TriggerType } = notifeeModule;
      await ensureAlarmChannel();

      return await notifee.createTriggerNotification(
        {
          id: "test_alarm_5s",
          title: "⚡ LockIn Test Alarm",
          body: "Alarm ringing! Time for your focus reading.",
          android: {
            channelId: ALARM_CHANNEL_ID,
            category: AndroidCategory.ALARM,
            importance: AndroidImportance?.HIGH ?? 4,
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
          data: { type: "LOCKIN_ALARM", alarmId: "test_alarm_5s" },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: triggerTime,
          alarmManager: { allowWhileIdle: true },
        }
      );
    } catch (err) {
      console.warn("Failed to schedule native 5s test alarm:", err);
    }
  }
}