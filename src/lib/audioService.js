// src/lib/audioService.js
// Dual Native & Web Audio Sound Synthesizer Engine

let playerObject = null;
let isRinging = false;
let audioContext = null;
let webAlarmInterval = null;

async function startNativeAudio() {
  try {
    const { createAudioPlayer } = await import("expo-audio");

    if (playerObject) {
      try {
        playerObject.pause();
        playerObject.release();
      } catch {
        // ignore unload errors
      }
      playerObject = null;
    }

    const player = createAudioPlayer(require("../../assets/sounds/alarm.wav"));
    player.loop = true;
    player.play();

    playerObject = player;
    return true;
  } catch (err) {
    console.warn("Native expo-audio playback notice:", err);
    return false;
  }
}

function getWebAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioCtx();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function playWebAlarmTonePair() {
  const ctx = getWebAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1174.66, now + 0.22);
    gain2.gain.setValueAtTime(0.45, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.22);
    osc2.stop(now + 0.42);
  } catch {
    // ignore
  }
}

export async function startAlarmSound() {
  if (isRinging) return;
  isRinging = true;

  // Try native expo-audio playback first
  const nativeSuccess = await startNativeAudio();

  // If native audio isn't available or fails (e.g. web platform), fall back to Web Audio API
  if (!nativeSuccess) {
    playWebAlarmTonePair();
    if (webAlarmInterval) clearInterval(webAlarmInterval);
    webAlarmInterval = setInterval(() => {
      if (isRinging) {
        playWebAlarmTonePair();
      }
    }, 600);
  }
}

export async function stopAlarmSound() {
  isRinging = false;

  try {
    const { cancelAllAlarmNotifications } = await import("./notifeeHandler");
    await cancelAllAlarmNotifications();
  } catch {
    // ignore
  }

  if (webAlarmInterval) {
    clearInterval(webAlarmInterval);
    webAlarmInterval = null;
  }

  if (audioContext && audioContext.state === "running") {
    audioContext.suspend().catch(() => {});
  }

  if (playerObject) {
    try {
      playerObject.pause();
      playerObject.release();
    } catch {
      // ignore
    }
    playerObject = null;
  }
}

export function isAlarmSoundPlaying() {
  return isRinging;
}
