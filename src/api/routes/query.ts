import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { MemoryPipeline } from "@/pipeline.js";

const QueryBodySchema = z.object({
  userId: z.string(),
  userName: z.string(),
  conversationTurn: z.string(),
});

export async function queryRoute(app: FastifyInstance, pipeline: MemoryPipeline): Promise<void> {
  app.post("/query", async (request, reply) => {
    const parsed = QueryBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const result = await pipeline.ingest(parsed.data);
    return reply.send(result);
  });
}
