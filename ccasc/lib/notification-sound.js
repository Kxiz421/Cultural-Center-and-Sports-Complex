/**
 * Notification chime — a short two-note tone generated with the browser's
 * built-in Web Audio API. No audio file, no library and no paid service, so it
 * is free and works offline.
 *
 * Browsers block audio until the user has interacted with the page, so call
 * `primeNotificationSound()` once (it unlocks the audio context on the first
 * pointer/key press) and then `playNotificationSound()` whenever a new
 * notification arrives.
 */

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

function tone(ctx, { freq, start, dur }) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + dur + 0.02);
}

/** Play the short two-note notification chime (best-effort; never throws). */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const base = ctx.currentTime + 0.02;
    tone(ctx, { freq: 880, start: base, dur: 0.2 });
    tone(ctx, { freq: 1174.66, start: base + 0.16, dur: 0.22 });
  } catch {
    /* audio is a nicety — ignore any failure */
  }
}
