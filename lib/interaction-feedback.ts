export type InteractionCue =
  | "uploadAccepted"
  | "autofillComplete"
  | "stepComplete"
  | "saveSuccess"
  | "previewReady";

const FEEDBACK_MUTE_STORAGE_KEY = "dfd-feedback-muted";

const cueToneMap: Record<
  InteractionCue,
  Array<{ frequency: number; duration: number; gain: number; gap?: number }>
> = {
  uploadAccepted: [{ frequency: 440, duration: 0.06, gain: 0.018 }],
  autofillComplete: [
    { frequency: 554.37, duration: 0.08, gain: 0.02, gap: 0.025 },
    { frequency: 659.25, duration: 0.11, gain: 0.024 },
  ],
  stepComplete: [
    { frequency: 523.25, duration: 0.06, gain: 0.016, gap: 0.02 },
    { frequency: 659.25, duration: 0.08, gain: 0.018 },
  ],
  saveSuccess: [
    { frequency: 493.88, duration: 0.06, gain: 0.016, gap: 0.02 },
    { frequency: 587.33, duration: 0.08, gain: 0.02 },
  ],
  previewReady: [
    { frequency: 587.33, duration: 0.07, gain: 0.018, gap: 0.02 },
    { frequency: 739.99, duration: 0.1, gain: 0.022 },
  ],
};

export function isInteractionFeedbackMuted() {
  if (typeof window === "undefined") return true;

  return window.localStorage.getItem(FEEDBACK_MUTE_STORAGE_KEY) === "true";
}

export function setInteractionFeedbackMuted(muted: boolean) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(FEEDBACK_MUTE_STORAGE_KEY, muted ? "true" : "false");
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextCtor) return null;

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextCtor();
  }

  return sharedAudioContext;
}

export function playInteractionCue(cue: InteractionCue) {
  if (typeof window === "undefined") return false;
  if (isInteractionFeedbackMuted()) return false;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return false;

  const audioContext = getAudioContext();

  if (!audioContext) {
    return false;
  }

  const tones = cueToneMap[cue];

  if (!tones?.length) {
    return false;
  }

  try {
    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => {
        return undefined;
      });
    }

    const startTime = audioContext.currentTime + 0.01;
    let cursor = startTime;

    for (const tone of tones) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = cue === "previewReady" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(tone.frequency, cursor);

      gainNode.gain.setValueAtTime(0.0001, cursor);
      gainNode.gain.exponentialRampToValueAtTime(tone.gain, cursor + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        cursor + tone.duration
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(cursor);
      oscillator.stop(cursor + tone.duration + 0.02);

      cursor += tone.duration + (tone.gap ?? 0);
    }

    return true;
  } catch (error) {
    console.warn("Interaction cue playback failed:", error);
    return false;
  }
}
