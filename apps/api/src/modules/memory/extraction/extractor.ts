import { ExtractionResultSchema } from "@/modules/memory/domain/schema/extraction";
import type { ExtractionResult } from "@/modules/memory/domain/schema/types/extraction.types";
import type { ILLMAdapter } from "@/llm/types";
import { buildExtractionPrompt } from "@/modules/memory/extraction/prompt";

export class MemoryExtractor {
  constructor(private readonly llm: ILLMAdapter) {}

  async extract(conversationTurn: string, knownTypes: string[]): Promise<ExtractionResult> {
    const text = await this.llm.generate({
      systemPrompt: buildExtractionPrompt(knownTypes),
      userMessage: conversationTurn,
      jsonMode: true,
    });

    return ExtractionResultSchema.parse(JSON.parse(text));
  }
}
