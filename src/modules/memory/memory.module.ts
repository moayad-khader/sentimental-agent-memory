import type { FastifyInstance } from "fastify";
import { Neo4jClient } from "@/database/neo4j/client";
import { PostgresClient } from "@/database/postgres/data-source";
import { DecayEngine } from "@/modules/memory/domain/decay";
import { HebbianEngine } from "@/modules/memory/domain/hebbian";
import { MemoryExtractor } from "@/modules/memory/extraction/extractor";
import { LLMVendorStrategy } from "@/llm/strategy";
import { EntityRepository } from "@/modules/memory/infrastructure/persistence/neo4j/entity.repository";
import { MemoryRepository } from "@/modules/memory/infrastructure/persistence/neo4j/memory.repository";
import { LogRepository } from "@/modules/memory/infrastructure/persistence/relational/repositories/log.repository";
import { StoreRepository } from "@/modules/memory/infrastructure/persistence/relational/repositories/store.repository";
import { MemoryService } from "@/modules/memory/memory.service";
import { MemoryController } from "@/modules/memory/memory.controller";
import { LLM_VENDOR } from "@/config/constants";

export class MemoryModule {
  static register(app: FastifyInstance): void {
    const llm = new LLMVendorStrategy().resolve(LLM_VENDOR);
    const hebbian = new HebbianEngine();
    const ds = PostgresClient.getInstance().getDataSource();

    const entityRepository = new EntityRepository(Neo4jClient.getInstance(), new DecayEngine(), hebbian);
    const memoryRepository = new MemoryRepository(Neo4jClient.getInstance());
    const logRepository = new LogRepository(ds);
    const storeRepository = new StoreRepository(ds, hebbian);

    const service = new MemoryService(
      new MemoryExtractor(llm),
      entityRepository,
      memoryRepository,
      logRepository,
      storeRepository
    );

    new MemoryController(service).registerRoutes(app);
  }
}
