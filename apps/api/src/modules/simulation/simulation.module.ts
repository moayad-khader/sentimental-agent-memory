import type { FastifyInstance } from "fastify";
import type { Neo4jClient } from "@/database/neo4j/client";
import { SimulationRepository } from "./infrastructure/simulation.repository";
import { SimulationService } from "./simulation.service";
import { SimulationController } from "./simulation.controller";

export class SimulationModule {
  static register(app: FastifyInstance, neo4j: Neo4jClient): SimulationService {
    const repo = new SimulationRepository(neo4j);
    const service = new SimulationService(repo);
    new SimulationController(service).registerRoutes(app);
    return service;
  }
}
