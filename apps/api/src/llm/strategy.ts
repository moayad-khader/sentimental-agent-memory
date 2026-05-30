import { GeminiAdapterFactory } from "@/llm/vendors/gemini/factory";
import type { ILLMAdapter, LLMVendor } from "@/llm/types";

export class LLMVendorStrategy {
  resolve(vendor: string, model?: string): ILLMAdapter {
    if ((vendor as LLMVendor) === "gemini") {
      return new GeminiAdapterFactory(model).create();
    }
    throw new Error(`Unsupported LLM vendor: "${vendor}". Supported: gemini`);
  }
}
