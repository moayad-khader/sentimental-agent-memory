import "dotenv/config";
import { requireEnvFloat, requireEnvInt, requireEnvString } from "@/config/env";

export const ARCHIVE_THRESHOLD = requireEnvFloat("ARCHIVE_THRESHOLD");
export const REINFORCEMENT_DELTA = requireEnvFloat("REINFORCEMENT_DELTA");
export const FUZZY_MATCH_THRESHOLD = requireEnvFloat("FUZZY_MATCH_THRESHOLD");
export const DEFAULT_HALF_LIFE_DAYS = requireEnvInt("DEFAULT_HALF_LIFE_DAYS");
export const LLM_VENDOR = requireEnvString("LLM_VENDOR");
export const GEMINI_MODEL = requireEnvString("GEMINI_MODEL");
export const HEBBIAN_DELTA = requireEnvFloat("HEBBIAN_DELTA");
export const EPISODE_WINDOW_MINUTES = requireEnvInt("EPISODE_WINDOW_MINUTES");
