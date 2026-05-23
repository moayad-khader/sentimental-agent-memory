import type { FastifyInstance } from "fastify";
import { Neo4jClient } from "@/database/neo4j/client";
import { PostgresClient } from "@/database/postgres/data-source";
import { DecayEngine } from "@/modules/memory/domain/decay";
import { MemoryExtractor } from "@/modules/memory/extraction/extractor";
import { EntityRepository } from "@/modules/memory/infrastructure/persistence/neo4j/entity.repository";
import { MemoryRepository } from "@/modules/memory/infrastructure/persistence/neo4j/memory.repository";
import { LogRepository } from "@/modules/memory/infrastructure/persistence/relational/repositories/log.repository";
import { MemoryService } from "@/modules/memory/memory.service";
import { MemoryController } from "@/modules/memory/memory.controller";

export class MemoryModule {
  static register(app: FastifyInstance): void {
    const entityRepository = new EntityRepository(Neo4jClient.getInstance(), new DecayEngine());
    const memoryRepository = new MemoryRepository(Neo4jClient.getInstance());
    const logRepository = new LogRepository(PostgresClient.getInstance().getDataSource());

    const service = new MemoryService(
      new MemoryExtractor(),
      entityRepository,
      memoryRepository,
      logRepository
    );

    new MemoryController(service).registerRoutes(app);
  }
}
