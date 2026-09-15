import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export class SnapshotStore {
  private readonly dir: string;

  constructor(dataDir: string) {
    this.dir = join(dataDir, 'snapshots');
    mkdirSync(this.dir, { recursive: true });
  }

  save(artifactId: string, revision: string, bytes: Buffer): void {
    const file = this.pathFor(artifactId, revision);
    if (existsSync(file)) {
      return;
    }
    writeFileSync(file, bytes);
  }

  read(artifactId: string, revision: string): Buffer | undefined {
    const file = this.pathFor(artifactId, revision);
    return existsSync(file) ? readFileSync(file) : undefined;
  }

  private pathFor(artifactId: string, revision: string): string {
    return join(this.dir, `${safe(artifactId)}__${safe(revision)}.html`);
  }
}

function safe(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}