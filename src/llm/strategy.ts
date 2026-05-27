import { GeminiAdapterFactory } from "@/llm/vendors/gemini/factory";
import type { ILLMAdapter, ILLMAdapterFactory, LLMVendor } from "@/llm/types";

export class LLMVendorStrategy {
  private readonly registry = new Map<LLMVendor, ILLMAdapterFactory>([
    ["gemini", new GeminiAdapterFactory()],
  ]);

  resolve(vendor: string): ILLMAdapter {
    const factory = this.registry.get(vendor as LLMVendor);
    if (!factory) {
      throw new Error(
        `Unsupported LLM vendor: "${vendor}". Supported: ${[...this.registry.keys()].join(", ")}`
      );
    }
    return factory.create();
  }
}
