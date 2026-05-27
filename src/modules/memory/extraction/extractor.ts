import { ExtractionResultSchema } from "@/modules/memory/domain/schema/extraction";
import type { ExtractionResult } from "@/modules/memory/domain/schema/types/extraction.types";
import type { ILLMAdapter } from "@/llm/types";
import { SYSTEM_PROMPT } from "@/modules/memory/extraction/prompt";

export class MemoryExtractor {
  constructor(private readonly llm: ILLMAdapter) {}

  async extract(conversationTurn: string): Promise<ExtractionResult> {
    const text = await this.llm.generate({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: conversationTurn,
      jsonMode: true,
    });

    return ExtractionResultSchema.parse(JSON.parse(text));
  }
}
