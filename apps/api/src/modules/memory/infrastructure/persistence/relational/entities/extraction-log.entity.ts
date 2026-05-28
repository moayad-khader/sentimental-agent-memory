import { Entity, PrimaryColumn, Column } from "typeorm";
import { COL_PK_UUID, COL_VARCHAR, COL_INT, COL_TEXT, COL_TIMESTAMP, COL_JSONB } from "@/database/postgres/column-types";

@Entity("smg_extraction_log")
export class ExtractionLog {
  @PrimaryColumn(COL_PK_UUID)
  extraction_log_id!: string;

  @Column(COL_VARCHAR)
  extraction_log_user_id!: string;

  @Column(COL_TEXT)
  extraction_log_conversation!: string;

  @Column(COL_TIMESTAMP)
  extraction_log_occurred_at!: string;

  @Column(COL_INT)
  extraction_log_entities_count!: number;

  @Column(COL_INT)
  extraction_log_facts_count!: number;

  @Column(COL_INT)
  extraction_log_preferences_count!: number;

  @Column(COL_INT)
  extraction_log_sentiments_count!: number;

  @Column(COL_JSONB)
  extraction_log_raw_json!: object;
}
