import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

export function readJsonFile<T>(file: string, fallback: T): T {
  if (!existsSync(file)) {
    return fallback;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export function readJsonFileStrict<T>(file: string, fallback: T, label: string): T {
  if (!existsSync(file)) {
    return fallback;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`${label} at ${file} is corrupt; refusing to start rather than lose intent.`);
  }
  return parsed as T;
}

export function writeJsonAtomic(file: string, value: unknown): void {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  renameSync(tmp, file);
}
