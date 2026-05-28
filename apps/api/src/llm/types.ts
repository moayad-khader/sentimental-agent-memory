export interface LLMRequest {
  systemPrompt: string;
  userMessage: string;
  jsonMode?: boolean;
}

export interface ILLMAdapter {
  generate(request: LLMRequest): Promise<string>;
}

export interface ILLMAdapterFactory {
  create(): ILLMAdapter;
}

export type LLMVendor = "gemini";
