import { DataSource } from "typeorm";
import { requireEnvString } from "@/config/env";
import { ExtractionLog } from "@/modules/memory/infrastructure/persistence/relational/entities/extraction-log.entity";
import { SentimentLog } from "@/modules/memory/infrastructure/persistence/relational/entities/sentiment-log.entity";
import { FactLog } from "@/modules/memory/infrastructure/persistence/relational/entities/fact-log.entity";
import { PreferenceLog } from "@/modules/memory/infrastructure/persistence/relational/entities/preference-log.entity";

export class PostgresClient {
  private static instance: PostgresClient | null = null;
  private dataSource: DataSource;

  private constructor() {
    this.dataSource = new DataSource({
      type: "postgres",
      url: requireEnvString("DATABASE_URL"),
      synchronize: true,
      logging: false,
      entities: [ExtractionLog, SentimentLog, FactLog, PreferenceLog],
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
