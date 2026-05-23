import type { FastifyInstance } from "fastify";
import type { PostgresStore } from "@/storage/postgres/store.js";

export async function historyRoute(app: FastifyInstance, history: PostgresStore): Promise<void> {
  app.get("/history/:userId", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const data = await history.getHistory(userId);
    return reply.send(data);
  });
}
