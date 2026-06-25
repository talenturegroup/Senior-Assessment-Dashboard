/**
 * ElevenLabs Text-to-Speech Configuration
 * Centralized voice and model settings for easy swapping
 */

export const TTS_CONFIG = {
  // ElevenLabs voice ID
  voiceId: process.env.ELEVENLABS_VOICE_ID || "mDYJ5aI19GeZeL0uKqb3",
  
  // ElevenLabs model ID
  modelId: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
  
  // API endpoint
  apiUrl: "https://api.elevenlabs.io/v1/text-to-speech",
  
  // Maximum text length to prevent abuse (characters)
  maxTextLength: 5000,
  
  // Request timeout (milliseconds)
  timeout: 30000,
} as const;
