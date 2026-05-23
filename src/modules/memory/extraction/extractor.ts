import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { ExtractionResultSchema } from "@/modules/memory/domain/schema/extraction";
import type { ExtractionResult } from "@/modules/memory/domain/schema/types/extraction.types";
import { GEMINI_MODEL } from "@/config/constants";
import { requireEnvString } from "@/config/env";
import { SYSTEM_PROMPT } from "@/modules/memory/extraction/prompt";

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
