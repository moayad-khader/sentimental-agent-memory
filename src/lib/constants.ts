import "dotenv/config";
import { requireEnvFloat, requireEnvInt, requireEnvString } from "@/lib/env.js";

export const ARCHIVE_THRESHOLD = requireEnvFloat("ARCHIVE_THRESHOLD");
export const REINFORCEMENT_DELTA = requireEnvFloat("REINFORCEMENT_DELTA");
export const FUZZY_MATCH_THRESHOLD = requireEnvFloat("FUZZY_MATCH_THRESHOLD");
export const DEFAULT_HALF_LIFE_DAYS = requireEnvInt("DEFAULT_HALF_LIFE_DAYS");
export const GEMINI_MODEL = requireEnvString("GEMINI_MODEL");
