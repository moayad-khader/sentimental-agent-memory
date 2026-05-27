import Fastify from "fastify";
import { Neo4jClient } from "@/database/neo4j/client";
import { PostgresClient } from "@/database/postgres/data-source";
import { MemoryModule } from "@/modules/memory/memory.module";
import { AgentModule } from "@/modules/agent/agent.module";

export class AppModule {
  static async bootstrap(): Promise<void> {
    await Neo4jClient.getInstance().initConstraints();
    await PostgresClient.getInstance().connect();

    const app = Fastify({ logger: true });

    app.register(async (instance) => {
      const memoryService = MemoryModule.register(instance);
      AgentModule.register(instance, memoryService);
    });

    const port = Number(process.env.PORT) || 3000;
    await app.listen({ port, host: "0.0.0.0" });
  }
}
