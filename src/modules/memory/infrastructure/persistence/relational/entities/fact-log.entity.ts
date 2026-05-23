import { Entity, PrimaryColumn, Column } from "typeorm";
import { COL_DATE, COL_TIMESTAMP, COL_FLOAT } from "@/database/postgres/column-types";

@Entity("smg_fact_log")
export class FactLog {
  @PrimaryColumn()
  fact_log_id!: string;

  @Column()
  fact_log_user_id!: string;

  @Column()
  fact_log_entity_id!: string;

  @Column()
  fact_log_entity_name!: string;

  @Column()
  fact_log_relation!: string;

  @Column(COL_FLOAT)
  fact_log_confidence!: number;

  @Column(COL_DATE)
  fact_log_observed_at!: string;

  @Column(COL_TIMESTAMP)
  fact_log_recorded_at!: string;
}
