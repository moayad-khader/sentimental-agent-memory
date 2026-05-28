import { DataSource } from "typeorm";
import { requireEnvString } from "@/config/env";
import { ExtractionLog } from "@/modules/memory/infrastructure/persistence/relational/entities/extraction-log.entity";
import { SmgUser } from "@/modules/memory/infrastructure/persistence/relational/entities/smg-user.entity";
import { SmgMemoryEntity } from "@/modules/memory/infrastructure/persistence/relational/entities/smg-entity.entity";
import { SmgSentiment } from "@/modules/memory/infrastructure/persistence/relational/entities/smg-sentiment.entity";
import { SmgFact } from "@/modules/memory/infrastructure/persistence/relational/entities/smg-fact.entity";
import { SmgPreference } from "@/modules/memory/infrastructure/persistence/relational/entities/smg-preference.entity";
import { SmgEpisode } from "@/modules/memory/infrastructure/persistence/relational/entities/smg-episode.entity";
import { SmgEpisodeEntity } from "@/modules/memory/infrastructure/persistence/relational/entities/smg-episode-entity.entity";
import { SmgCoOccurrence } from "@/modules/memory/infrastructure/persistence/relational/entities/smg-co-occurrence.entity";
import { SmgEntityType } from "@/modules/memory/infrastructure/persistence/relational/entities/smg-entity-type.entity";

export class PostgresClient {
  private static instance: PostgresClient | null = null;
  private dataSource: DataSource;

  private constructor() {
    this.dataSource = new DataSource({
      type: "postgres",
      url: requireEnvString("DATABASE_URL"),
      synchronize: true,
      logging: false,
      entities: [
        ExtractionLog,
        SmgEntityType, SmgUser, SmgMemoryEntity, SmgSentiment, SmgFact,
        SmgPreference, SmgEpisode, SmgEpisodeEntity, SmgCoOccurrence,
      ],
    });
  }

  static getInstance(): PostgresClient {
    if (!PostgresClient.instance) {
      PostgresClient.instance = new PostgresClient();
    }
    return PostgresClient.instance;
  }

  async connect(): Promise<void> {
    await this.dataSource.initialize();
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }

  async close(): Promise<void> {
    await this.dataSource.destroy();
    PostgresClient.instance = null;
  }
}
