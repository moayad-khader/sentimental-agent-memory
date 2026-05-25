import { Entity, PrimaryColumn, Column } from "typeorm";
import { COL_PK_UUID, COL_VARCHAR, COL_TEXT, COL_FLOAT, COL_DATE, COL_TIMESTAMP } from "@/database/postgres/column-types";

@Entity("smg_preference_log")
export class PreferenceLog {
  @PrimaryColumn(COL_PK_UUID)
  preference_log_id!: string;

  @Column(COL_VARCHAR)
  preference_log_user_id!: string;

  @Column(COL_VARCHAR)
  preference_log_entity_id!: string;

  @Column(COL_VARCHAR)
  preference_log_entity_name!: string;

  @Column(COL_VARCHAR)
  preference_log_polarity!: string;

  @Column(COL_TEXT)
  preference_log_reason!: string;

  @Column(COL_FLOAT)
  preference_log_confidence!: number;

  @Column(COL_DATE)
  preference_log_observed_at!: string;

  @Column(COL_TIMESTAMP)
  preference_log_recorded_at!: string;
}
