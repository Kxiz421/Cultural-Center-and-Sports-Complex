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

/** Play a short rising two-note chime (best-effort; never throws). */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const start = ctx.currentTime + 0.02;
    [880, 1174.66].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = start + index * 0.16;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.22);
    });
  } catch {
    /* audio is a nicety — ignore any failure */
  }
}
