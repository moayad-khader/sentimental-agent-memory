import { distance } from "fastest-levenshtein";
import { randomUUID } from "crypto";
import { Neo4jClient } from "@/storage/neo4j/client.js";
import type { ExtractedEntity } from "@/schema/types/extraction.types.js";
import type { EntityNode } from "@/schema/types/nodes.types.js";
import { FUZZY_MATCH_THRESHOLD } from "@/lib/constants.js";

export class EntityResolver {
  constructor(private neo4j: Neo4jClient) {}

  private similarity(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - distance(a.toLowerCase(), b.toLowerCase()) / maxLen;
  }

  private async loadExistingEntities(): Promise<EntityNode[]> {
    const session = this.neo4j.getSession();
    try {
      const result = await session.run("MATCH (e:Entity) RETURN e");
      return result.records.map((r) => {
        const node = r.get("e").properties;
        return {
          id: node.id,
          name: node.name,
          type: node.type,
          aliases: node.aliases ?? [],
        };
      });
    } finally {
      await session.close();
    }
  }

  async resolve(extracted: ExtractedEntity[]): Promise<EntityNode[]> {
    const existing = await this.loadExistingEntities();
    const resolved: EntityNode[] = [];

    for (const candidate of extracted) {
      let matched: EntityNode | undefined;

      for (const known of [...existing, ...resolved]) {
        const nameSimilarity = this.similarity(candidate.name, known.name);
        const aliasSimilarity = known.aliases.reduce(
          (best, alias) => Math.max(best, this.similarity(candidate.name, alias)),
          0
        );
        if (Math.max(nameSimilarity, aliasSimilarity) >= FUZZY_MATCH_THRESHOLD) {
          matched = known;
          break;
        }
      }

      if (matched) {
        resolved.push({
          ...matched,
          aliases: Array.from(
            new Set([
              ...matched.aliases,
              ...candidate.aliases,
              candidate.name !== matched.name ? candidate.name : "",
            ])
          ).filter(Boolean),
        });
      } else {
        resolved.push({
          id: randomUUID(),
          name: candidate.name,
          type: candidate.type,
          aliases: candidate.aliases,
        });
      }
    }

    return resolved;
  }
}
