import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { ExtractionResultSchema } from "@/schema/extraction.js";
import type { ExtractionResult } from "@/schema/types/extraction.types.js";
import { GEMINI_MODEL } from "@/lib/constants.js";
import { requireEnvString } from "@/lib/env.js";
import { SYSTEM_PROMPT } from "@/extraction/prompt.js";

export class MemoryExtractor {
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: requireEnvString("GEMINI_API_KEY") });
  }

  async extract(conversationTurn: string): Promise<ExtractionResult> {
    const response = await this.client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: conversationTurn }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    });

    const raw = JSON.parse(response.text!);
    return ExtractionResultSchema.parse(raw);
  }
}
