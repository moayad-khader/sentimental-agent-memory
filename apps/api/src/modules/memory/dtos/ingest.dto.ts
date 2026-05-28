import { z } from "zod";

export const IngestRequestDto = z.object({
  userId: z.string(),
  userName: z.string(),
  conversationTurn: z.string(),
  source: z.string().optional().default("conversation"),
});

export type IngestRequest = z.infer<typeof IngestRequestDto>;
