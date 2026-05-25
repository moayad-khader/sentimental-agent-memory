import type { ColumnOptions, ColumnType } from "typeorm";

export const COL_PK_UUID: ColumnType = "uuid";

export const COL_UUID: ColumnOptions = { type: "uuid" };
export const COL_VARCHAR: ColumnOptions = { type: "varchar" };
export const COL_TEXT: ColumnOptions = { type: "text" };
export const COL_INT: ColumnOptions = { type: "int" };
export const COL_FLOAT: ColumnOptions = { type: "double precision" };
export const COL_BOOL: ColumnOptions = { type: "boolean" };
export const COL_DATE: ColumnOptions = { type: "date" };
export const COL_TIMESTAMP: ColumnOptions = { type: "timestamp" };
export const COL_JSONB: ColumnOptions = { type: "jsonb" };
