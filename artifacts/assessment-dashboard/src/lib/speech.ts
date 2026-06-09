/**
 * Lightweight wrapper around the browser SpeechSynthesis API so the AI
 * interviewer can speak. Gracefully no-ops where speech is unavailable.
 */

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer a natural-sounding English voice when available.
  const preferred =
    voices.find((v) => /en[-_]US/i.test(v.lang) && /natural|google|samantha|aria/i.test(v.name)) ??
    voices.find((v) => /en[-_]US/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang));
  return preferred ?? voices[0] ?? null;
}

export function cancelSpeech(): void {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  rate?: number;
  pitch?: number;
}

/**
 * Speaks the given text aloud, cancelling anything currently being spoken.
 * Returns true if speech was started, false if unsupported/muted-out.
 */
export function speak(text: string, opts: SpeakOptions = {}): boolean {
  if (!speechSupported() || !text.trim()) {
    opts.onEnd?.();
    return false;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = opts.rate ?? 1;
  utterance.pitch = opts.pitch ?? 1;
  if (opts.onStart) utterance.onstart = () => opts.onStart?.();
  if (opts.onEnd) utterance.onend = () => opts.onEnd?.();
  window.speechSynthesis.speak(utterance);
  return true;
}
