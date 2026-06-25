/**
 * Text-to-speech wrapper using ElevenLabs API with browser SpeechSynthesis fallback.
 * The AI interviewer uses this to speak questions to candidates.
 */

// Audio element for ElevenLabs playback
let currentAudio: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Check if browser SpeechSynthesis is available (for fallback)
 */
export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Cancel any currently playing audio (both ElevenLabs and SpeechSynthesis)
 */
export function cancelSpeech(): void {
  // Stop ElevenLabs audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  // Cleanup blob URL to prevent memory leaks
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  // Stop browser SpeechSynthesis
  if (speechSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Pick a browser voice for fallback SpeechSynthesis
 */
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

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  rate?: number;
  pitch?: number;
}

/**
 * Speak text using ElevenLabs API, falling back to browser SpeechSynthesis on failure.
 * Returns true if speech was started, false if unsupported/muted-out.
 */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<boolean> {
  if (!text.trim()) {
    opts.onEnd?.();
    return false;
  }

  // Cancel any current speech
  cancelSpeech();

  // Try ElevenLabs first
  try {
    console.log("[Speech] Attempting ElevenLabs TTS");
    const response = await fetch(`${API_BASE_URL}/api/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`TTS API returned ${response.status}`);
    }

    const blob = await response.blob();
    currentBlobUrl = URL.createObjectURL(blob);
    currentAudio = new Audio(currentBlobUrl);

    currentAudio.onplay = () => {
      console.log("[Speech] ElevenLabs audio playing");
      opts.onStart?.();
    };

    currentAudio.onended = () => {
      console.log("[Speech] ElevenLabs audio ended");
      cleanup();
      opts.onEnd?.();
    };

    currentAudio.onerror = (error) => {
      console.error("[Speech] ElevenLabs audio error:", error);
      cleanup();
      opts.onError?.("Audio playback failed");
      // Fall back to browser SpeechSynthesis
      fallbackToBrowserSpeech(text, opts);
    };

    await currentAudio.play();
    return true;
  } catch (error) {
    console.error("[Speech] ElevenLabs TTS failed, falling back to browser:", error);
    opts.onError?.(error instanceof Error ? error.message : "TTS failed");
    // Fall back to browser SpeechSynthesis
    return fallbackToBrowserSpeech(text, opts);
  }
}

/**
 * Fallback to browser SpeechSynthesis when ElevenLabs fails
 */
function fallbackToBrowserSpeech(text: string, opts: SpeakOptions = {}): boolean {
  if (!speechSupported()) {
    opts.onEnd?.();
    return false;
  }

  console.log("[Speech] Using browser SpeechSynthesis fallback");
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = opts.rate ?? 1;
  utterance.pitch = opts.pitch ?? 1;
  
  if (opts.onStart) utterance.onstart = () => opts.onStart?.();
  if (opts.onEnd) utterance.onend = () => opts.onEnd?.();
  if (opts.onError) utterance.onerror = () => opts.onError?.("Browser speech failed");
  
  window.speechSynthesis.speak(utterance);
  return true;
}

/**
 * Cleanup audio resources
 */
function cleanup(): void {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  currentAudio = null;
}
