// src/lib/lockState.js
import { NativeModules, Platform } from "react-native";

let state = {
  streak: 4,
  isLocked: false,
  currentStep: "IDLE", // "IDLE" | "RINGING" | "READING" | "QUIZ" | "UNLOCKED"
  lastQuizScore: null,
};

const listeners = new Set();

function notifyListeners() {
  setTimeout(() => {
    listeners.forEach((fn) => {
      try {
        fn(state);
      } catch {
        // ignore
      }
    });
  }, 0);
}

function syncNativeLockGuard() {
  try {
    if (NativeModules?.LockGuardModule?.setAppLocked) {
      NativeModules.LockGuardModule.setAppLocked(Boolean(state.isLocked));
    }
  } catch {
    // ignore
  }
}

export function getLockState() {
  return { ...state };
}

export function setLockState(updates) {
  state = { ...state, ...updates };
  syncNativeLockGuard();
  notifyListeners();
}

export function subscribeLockState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function incrementStreak() {
  state.streak += 1;
  notifyListeners();
  return state.streak;
}

/**
 * iOS only: Restores lock state from persistent UserDefaults storage.
 * Call this once on app startup (in _layout.tsx) before hiding the splash screen.
 *
 * If an alarm was active when the app was force-quit or the device rebooted,
 * this will resume the correct screen (READING / QUIZ) automatically.
 *
 * Returns true if state was restored, false otherwise.
 */
export async function loadPersistedState() {
  if (Platform.OS !== "ios") return false;

  try {
    const alarmModule = NativeModules?.LockInAlarmModule;
    if (!alarmModule) return false;

    const persisted = await alarmModule.getAlarmState();
    if (!persisted) return false;

    const { currentStep } = persisted;

    // Only resume if we were mid-session (not IDLE or SCHEDULED)
    const activeSteps = ["RINGING", "READING", "QUIZ"];
    if (!activeSteps.includes(currentStep)) return false;

    setLockState({
      isLocked: true,
      currentStep,
    });

    return true;
  } catch (e) {
    console.warn("[iOS] loadPersistedState error:", e);
    return false;
  }
}
