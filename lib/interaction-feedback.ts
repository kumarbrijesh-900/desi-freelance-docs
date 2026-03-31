export type InteractionCue =
  | "uploadAccepted"
  | "autofillComplete"
  | "stepComplete"
  | "saveSuccess";

const FEEDBACK_MUTE_STORAGE_KEY = "dfd-feedback-muted";

export function isInteractionFeedbackMuted() {
  if (typeof window === "undefined") return true;

  return window.localStorage.getItem(FEEDBACK_MUTE_STORAGE_KEY) === "true";
}

export function setInteractionFeedbackMuted(muted: boolean) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(FEEDBACK_MUTE_STORAGE_KEY, muted ? "true" : "false");
}

export function playInteractionCue(cue: InteractionCue) {
  if (typeof window === "undefined") return false;
  void cue;
  if (isInteractionFeedbackMuted()) return false;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return false;

  // Placeholder foundation for future opt-in audio cues.
  return false;
}
