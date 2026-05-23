import neo4j, { Driver, Session } from "neo4j-driver";
import { requireEnvString } from "@/config/env";

export class Neo4jClient {
  private static instance: Neo4jClient | null = null;
  private driver: Driver;

  private constructor() {
    this.driver = neo4j.driver(
      requireEnvString("NEO4J_URI"),
      neo4j.auth.basic(requireEnvString("NEO4J_USER"), requireEnvString("NEO4J_PASSWORD"))
    );
  }

  static getInstance(): Neo4jClient {
    if (!Neo4jClient.instance) {
      Neo4jClient.instance = new Neo4jClient();
    }
    return Neo4jClient.instance;
  }

  getSession(): Session {
    return this.driver.session();
  }

  async initConstraints(): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE"
      );
      await session.run(
        "CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE"
      );
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
    Neo4jClient.instance = null;
  }
}
