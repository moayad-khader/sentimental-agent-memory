import { GeminiAdapter } from "@/llm/vendors/gemini/adapter";
import { requireEnvString } from "@/config/env";
import { GEMINI_MODEL } from "@/config/constants";
import type { ILLMAdapterFactory, ILLMAdapter } from "@/llm/types";

export class GeminiAdapterFactory implements ILLMAdapterFactory {
  create(): ILLMAdapter {
    return new GeminiAdapter(requireEnvString("GEMINI_API_KEY"), GEMINI_MODEL);
  }
}
