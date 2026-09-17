import { mkdirSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';
import type { HostCapabilities } from '../host/capabilities.js';
import { readJsonFile, writeJsonAtomic } from './json-file.js';

export type SessionRecord = {
  sessionId: string;
  capability: string;
  source: string;
  kind: string;
  artifactId: string;
  revision: string;
  adoptedRevision?: string;
  sourceRoot?: string;
  displayName: string;
  capabilities?: HostCapabilities;
  endedAt?: string;
};

export class SessionRecords {
  private readonly file: string;
  private records: Record<string, SessionRecord>;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.file = join(dataDir, 'service-sessions.json');
    this.records = this.load();
  }

  put(record: SessionRecord): void {
    this.records[record.sessionId] = record;
    this.persist();
  }

  mint(entry: Omit<SessionRecord, 'capability'>): SessionRecord {
    const record: SessionRecord = { ...entry, capability: randomBytes(32).toString('hex') };
    this.put(record);
    return record;
  }

  get(sessionId: string): SessionRecord | undefined {
    this.records = this.load();
    const record = this.records[sessionId];
    return record && !record.endedAt ? record : undefined;
  }

  end(sessionId: string): void {
    this.records = this.load();
    const record = this.records[sessionId];
    if (!record || record.endedAt) {
      return;
    }
    this.records[sessionId] = { ...record, endedAt: new Date().toISOString() };
    this.persist();
  }

  findByArtifactRevision(artifactId: string, revision: string): SessionRecord | undefined {
    this.records = this.load();
    return this.liveRecords().find(
      (record) => record.artifactId === artifactId && record.revision === revision
    );
  }

  findByArtifact(artifactId: string): SessionRecord | undefined {
    this.records = this.load();
    return this.liveRecords()
      .filter((record) => record.artifactId === artifactId)
      .sort((a, b) => (a.sessionId < b.sessionId ? 1 : -1))[0];
  }

  authorized(sessionId: string, capability: string | null): SessionRecord | undefined {
    const record = this.get(sessionId);
    if (!record || !capability) {
      return undefined;
    }
    const expected = Buffer.from(record.capability, 'utf8');
    const actual = Buffer.from(capability, 'utf8');
    if (expected.byteLength !== actual.byteLength || !timingSafeEqual(expected, actual)) {
      return undefined;
    }
    return record;
  }

  private liveRecords(): SessionRecord[] {
    return Object.values(this.records).filter((record) => !record.endedAt);
  }

  private load(): Record<string, SessionRecord> {
    return readJsonFile<Record<string, SessionRecord>>(this.file, {});
  }

  private persist(): void {
    writeJsonAtomic(this.file, this.records);
  }
}
