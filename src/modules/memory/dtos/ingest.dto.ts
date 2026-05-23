import { z } from "zod";

export const IngestRequestDto = z.object({
  userId: z.string(),
  userName: z.string(),
  conversationTurn: z.string(),
});

export type IngestRequest = z.infer<typeof IngestRequestDto>;
