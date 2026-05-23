import type { FastifyInstance } from "fastify";
import type { GraphReader } from "@/storage/neo4j/reader.js";

export async function memoryRoute(app: FastifyInstance, reader: GraphReader): Promise<void> {
  app.get("/memory/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const memory = await reader.getMemory(userId);
    return reply.send(memory);
  });
}
