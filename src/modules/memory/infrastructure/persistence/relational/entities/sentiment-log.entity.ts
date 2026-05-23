import { Entity, PrimaryColumn, Column } from "typeorm";
import { COL_TEXT, COL_DATE, COL_TIMESTAMP, COL_FLOAT } from "@/database/postgres/column-types";

@Entity("smg_sentiment_log")
export class SentimentLog {
  @PrimaryColumn()
  sentiment_log_id!: string;

  @Column()
  sentiment_log_user_id!: string;

  @Column()
  sentiment_log_entity_id!: string;

  @Column()
  sentiment_log_entity_name!: string;

  @Column()
  sentiment_log_sentiment!: string;

  @Column()
  sentiment_log_emotion!: string;

  @Column(COL_TEXT)
  sentiment_log_reason!: string;

  @Column(COL_FLOAT)
  sentiment_log_confidence!: number;

  @Column(COL_DATE)
  sentiment_log_observed_at!: string;

  @Column()
  sentiment_log_archived!: boolean;

  @Column(COL_TIMESTAMP)
  sentiment_log_recorded_at!: string;
}
