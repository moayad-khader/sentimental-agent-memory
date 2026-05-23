import type { ColumnOptions } from "typeorm";

export const COL_TEXT: ColumnOptions = { type: "text" };
export const COL_DATE: ColumnOptions = { type: "date" };
export const COL_TIMESTAMP: ColumnOptions = { type: "timestamp" };
export const COL_FLOAT: ColumnOptions = { type: "double precision" };
export const COL_JSONB: ColumnOptions = { type: "jsonb" };
