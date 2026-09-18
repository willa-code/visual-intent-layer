import { readFileSync } from 'node:fs';

export function packageVersion(): string {
  try {
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      version?: unknown;
    };
    return typeof manifest.version === 'string' && manifest.version.length > 0
      ? manifest.version
      : 'unknown';
  } catch {
    return 'unknown';
  }
}
