import Fastify from "fastify";
import { queryRoute } from "@/api/routes/query.js";
import { memoryRoute } from "@/api/routes/memory.js";
import { historyRoute } from "@/api/routes/history.js";
import type { MemoryPipeline } from "@/pipeline.js";
import type { GraphReader } from "@/storage/neo4j/reader.js";
import type { PostgresStore } from "@/storage/postgres/store.js";

export function buildServer(pipeline: MemoryPipeline, reader: GraphReader, history: PostgresStore) {
  const app = Fastify({ logger: true });

  app.register(async (instance) => {
    await queryRoute(instance, pipeline);
    await memoryRoute(instance, reader);
    await historyRoute(instance, history);
  });

  return app;
}
