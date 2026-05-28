import { GoogleGenAI } from "@google/genai";
import type { ILLMAdapter, LLMRequest } from "@/llm/types";

export class GeminiAdapter implements ILLMAdapter {
  private client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly model: string
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(request: LLMRequest): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: "user", parts: [{ text: request.userMessage }] }],
      config: {
        systemInstruction: request.systemPrompt,
        responseMimeType: request.jsonMode ? "application/json" : "text/plain",
      },
    });

    return response.text!;
  }
}
