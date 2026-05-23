import "dotenv/config";
import { Neo4jClient } from "@/storage/neo4j/client.js";
import { EntityResolver } from "@/storage/neo4j/resolver.js";
import { GraphStore } from "@/storage/neo4j/store.js";
import { GraphReader } from "@/storage/neo4j/reader.js";
import { PostgresStore } from "@/storage/postgres/store.js";
import { MemoryExtractor } from "@/extraction/extractor.js";
import { DecayEngine } from "@/domain/decay.js";
import { MemoryPipeline } from "@/pipeline.js";
import { buildServer } from "@/api/server.js";

async function main() {
  const neo4j = Neo4jClient.getInstance();
  const duckdb = PostgresStore.getInstance();

  await neo4j.initConstraints();
  await duckdb.init();

  const pipeline = new MemoryPipeline(
    new MemoryExtractor(),
    new EntityResolver(neo4j),
    new GraphStore(neo4j, new DecayEngine()),
    duckdb
  );
  const reader = new GraphReader(neo4j);

  const app = buildServer(pipeline, reader, duckdb);
  const port = Number(process.env.PORT) || 3000;
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch(console.error);
