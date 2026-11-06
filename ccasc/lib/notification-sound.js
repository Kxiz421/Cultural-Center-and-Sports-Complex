/**
 * Notification sounds — short tones generated with the browser's built-in Web
 * Audio API. No audio files, no library and no paid service, so it is free and
 * works offline.
 *
 * The chosen sound is remembered per browser in localStorage. Browsers block
 * audio until the user has interacted with the page, so `primeNotificationSound`
 * unlocks the audio context on the first pointer/key press.
 */

const STORAGE_KEY = "ccasc_notification_sound";

/** Sounds offered in the profile "Notification sound" picker. */
export const NOTIFICATION_SOUND_OPTIONS = [
  { id: "chime", label: "Chime" },
  { id: "bell", label: "Bell" },
  { id: "ping", label: "Ping" },
  { id: "alert", label: "Alert" },
  { id: "none", label: "None" },
];

/** Note sequences per sound: { freq, at (seconds), dur, type, peak }. */
const PATTERNS = {
  chime: [
    { freq: 880, at: 0, dur: 0.2 },
    { freq: 1174.66, at: 0.16, dur: 0.22 },
  ],
  bell: [
    { freq: 1046.5, at: 0, dur: 0.6, type: "triangle" },
    { freq: 1568, at: 0.04, dur: 0.42, type: "sine", peak: 0.12 },
  ],
  ping: [{ freq: 1568, at: 0, dur: 0.13 }],
  alert: [
    { freq: 660, at: 0, dur: 0.12, type: "square", peak: 0.16 },
    { freq: 660, at: 0.18, dur: 0.12, type: "square", peak: 0.16 },
  ],
};

let audioContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctx();
    } catch {
      return null;
    }
  }
  return audioContext;
}

/** The saved sound choice for this browser (defaults to "chime"). */
export function getNotificationSoundChoice() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "chime";
  } catch {
    return "chime";
  }
}

/** Remember the chosen sound for this browser. */
export function setNotificationSoundChoice(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage may be unavailable; ignore */
  }
}

/** Unlock audio on the first user gesture. Returns a cleanup function. */
export function primeNotificationSound() {
  if (typeof window === "undefined") return () => {};
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

function tone(ctx, { freq, start, dur, type = "sine", peak = 0.22 }) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + dur + 0.02);
}

/**
 * Play the notification sound. Pass an id to preview a specific sound (used by
 * the picker); otherwise the saved choice is used. "none" stays silent.
 */
export function playNotificationSound(choiceOverride) {
  try {
    const choice = choiceOverride || getNotificationSoundChoice();
    if (choice === "none") return;
    const pattern = PATTERNS[choice] || PATTERNS.chime;

    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const base = ctx.currentTime + 0.02;
    for (const note of pattern) {
      tone(ctx, { ...note, start: base + note.at });
    }
  } catch {
    /* audio is a nicety — ignore any failure */
  }
}
