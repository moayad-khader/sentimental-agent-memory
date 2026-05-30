import { z } from "zod";

export const ChatRequestSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  message: z.string().min(1),
  useMemory: z.boolean().default(true),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface ChatResponse {
  response: string;
  userId: string;
  useMemory: boolean;
  extracted?: { entities: Array<{ name: string; type: string; sentiment?: string; emotion?: string }>; factsCount: number; preferencesCount: number };
}
