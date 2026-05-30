import Fastify from "fastify";
import { Neo4jClient } from "@/database/neo4j/client";
import { PostgresClient } from "@/database/postgres/data-source";
import { MemoryModule } from "@/modules/memory/memory.module";
import { AgentModule } from "@/modules/agent/agent.module";
import { SimulationModule } from "@/modules/simulation/simulation.module";

export class AppModule {
  static async bootstrap(): Promise<void> {
    await Neo4jClient.getInstance().initConstraints();
    await PostgresClient.getInstance().connect();

    const app = Fastify({ logger: true });

    app.addHook("onRequest", (req, reply, done) => {
      reply.header("Access-Control-Allow-Origin", "*");
      reply.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      reply.header("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") { reply.status(204).send(); return; }
      done();
    });

    app.get("/health", async () => ({ status: "ok" }));

    app.delete("/flush", async (_req, reply) => {
      const neo4j = Neo4jClient.getInstance();
      const session = neo4j.getSession();
      try {
        await session.run("MATCH (n) DETACH DELETE n");
      } finally {
        await session.close();
      }
      const ds = PostgresClient.getInstance().getDataSource();
      await ds.query(`
        TRUNCATE TABLE
          smg_extraction_log, smg_co_occurrences, smg_episode_entities,
          smg_episodes, smg_preferences, smg_facts,
          smg_sentiments, smg_entities, smg_users
        RESTART IDENTITY CASCADE
      `);
      reply.send({ flushed: true });
    });

    app.register(async (instance) => {
      const memoryService = MemoryModule.register(instance);
      AgentModule.register(instance, memoryService);
      SimulationModule.register(instance, Neo4jClient.getInstance());
    });

    const port = Number(process.env.PORT) || 3000;
    await app.listen({ port, host: "0.0.0.0" });
  }
}
