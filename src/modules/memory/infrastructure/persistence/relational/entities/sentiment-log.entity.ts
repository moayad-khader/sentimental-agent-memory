import { Entity, PrimaryColumn, Column } from "typeorm";
import { COL_PK_UUID, COL_VARCHAR, COL_TEXT, COL_FLOAT, COL_BOOL, COL_DATE, COL_TIMESTAMP } from "@/database/postgres/column-types";

@Entity("smg_sentiment_log")
export class SentimentLog {
  @PrimaryColumn(COL_PK_UUID)
  sentiment_log_id!: string;

  @Column(COL_VARCHAR)
  sentiment_log_user_id!: string;

  @Column(COL_VARCHAR)
  sentiment_log_entity_id!: string;

  @Column(COL_VARCHAR)
  sentiment_log_entity_name!: string;

  @Column(COL_VARCHAR)
  sentiment_log_sentiment!: string;

  @Column(COL_VARCHAR)
  sentiment_log_emotion!: string;

  @Column(COL_TEXT)
  sentiment_log_reason!: string;

  @Column(COL_FLOAT)
  sentiment_log_confidence!: number;

  @Column(COL_DATE)
  sentiment_log_observed_at!: string;

  @Column(COL_BOOL)
  sentiment_log_archived!: boolean;

  @Column(COL_TIMESTAMP)
  sentiment_log_recorded_at!: string;
}
