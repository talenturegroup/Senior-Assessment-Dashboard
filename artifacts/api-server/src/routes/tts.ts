import { Router, type IRouter } from "express";
import { z } from "zod";
import { TTS_CONFIG } from "../lib/tts-config";

const router: IRouter = Router();

// Request body validation schema
const TTSRequestSchema = z.object({
  text: z.string().min(1).max(TTS_CONFIG.maxTextLength),
});

/**
 * POST /api/tts
 * Generates audio using ElevenLabs Text-to-Speech
 */
router.post("/tts", async (req, res): Promise<void> => {
  console.log("[TTS] Generating speech for text:", req.body.text?.substring(0, 50) + "...");
  
  // Validate request body
  const parseResult = TTSRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    console.error("[TTS] Invalid request body:", parseResult.error.message);
    res.status(400).json({ error: "Invalid request body", details: parseResult.error.message });
    return;
  }

  const { text } = parseResult.data;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error("[TTS] ELEVENLABS_API_KEY not configured");
    res.status(500).json({ error: "TTS service not configured" });
    return;
  }

  try {
    const url = `${TTS_CONFIG.apiUrl}/${TTS_CONFIG.voiceId}`;
    
    console.log("[TTS] Calling ElevenLabs API:", {
      url,
      model: TTS_CONFIG.modelId,
      textLength: text.length,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: TTS_CONFIG.modelId,
        output_format: "mp3_44100_128",
      }),
      signal: AbortSignal.timeout(TTS_CONFIG.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[TTS] ElevenLabs API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      
      if (response.status === 401) {
        res.status(500).json({ error: "TTS authentication failed" });
        return;
      }
      if (response.status === 429) {
        res.status(429).json({ error: "TTS quota exceeded" });
        return;
      }
      res.status(500).json({ error: "TTS generation failed" });
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("[TTS] Audio generated successfully:", {
      size: audioBuffer.byteLength,
      contentType: response.headers.get("content-type"),
    });

    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Length", audioBuffer.byteLength.toString());
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("[TTS] Request timeout");
        res.status(504).json({ error: "TTS request timeout" });
        return;
      }
      console.error("[TTS] Error:", error.message);
    } else {
      console.error("[TTS] Unknown error:", error);
    }
    res.status(500).json({ error: "TTS generation failed" });
  }
});

export default router;
