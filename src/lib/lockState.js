// src/lib/lockState.js
import { NativeModules } from "react-native";

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
