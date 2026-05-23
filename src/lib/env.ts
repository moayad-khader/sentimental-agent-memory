export function requireEnvFloat(key: string): number {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return parseFloat(val);
}

export function requireEnvInt(key: string): number {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return parseInt(val, 10);
}

export function requireEnvString(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}
