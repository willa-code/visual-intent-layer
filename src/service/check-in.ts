import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readJsonFile, writeJsonAtomic } from './json-file.js';

export type InterruptionRecord = {
  interruptionId: string;
  sessionId: string;
  requestedAt: string;
  collectedAt?: string;
  requestedBy?: string;
};

type SessionAgentState = {
  lastContactAt?: string;
  interruptions: InterruptionRecord[];
};

type Persisted = {
  version: number;
  sessions: Record<string, SessionAgentState>;
};

const VERSION = 1;

export class CheckInStore {
  private readonly file: string;
  private state: Persisted;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.file = join(dataDir, 'check-in.json');
    this.state = this.load();
  }

  lastContact(sessionId: string): string | undefined {
    this.reload();
    return this.session(sessionId).lastContactAt;
  }

  recordContact(sessionId: string, at = new Date().toISOString()): string {
    this.reload();
    const session = this.session(sessionId);
    session.lastContactAt = at;
    this.persist();
    return at;
  }

  requestInterruption(sessionId: string, options: { requestedBy?: string } = {}): InterruptionRecord {
    this.reload();
    const record: InterruptionRecord = {
      interruptionId: `int-${randomUUID()}`,
      sessionId,
      requestedAt: new Date().toISOString(),
      ...(options.requestedBy ? { requestedBy: options.requestedBy } : {})
    };
    this.session(sessionId).interruptions.push(record);
    this.persist();
    return record;
  }

  pendingInterruption(sessionId: string): InterruptionRecord | undefined {
    this.reload();
    return this.session(sessionId).interruptions.find((entry) => entry.collectedAt === undefined);
  }

  collectInterruption(sessionId: string, interruptionId: string): InterruptionRecord | undefined {
    this.reload();
    const record = this.session(sessionId).interruptions.find((entry) => entry.interruptionId === interruptionId);
    if (!record) {
      return undefined;
    }
    record.collectedAt = new Date().toISOString();
    this.persist();
    return record;
  }

  listInterruptions(sessionId: string): InterruptionRecord[] {
    this.reload();
    return [...this.session(sessionId).interruptions];
  }

  private reload(): void {
    this.state = this.load();
  }

  private session(sessionId: string): SessionAgentState {
    const existing = this.state.sessions[sessionId];
    if (existing) {
      return existing;
    }
    const created: SessionAgentState = { interruptions: [] };
    this.state.sessions[sessionId] = created;
    return created;
  }

  private load(): Persisted {
    const parsed = readJsonFile<Persisted | undefined>(this.file, undefined);
    if (!parsed || parsed.version !== VERSION || typeof parsed.sessions !== 'object' || parsed.sessions === null) {
      return { version: VERSION, sessions: {} };
    }
    return parsed;
  }

  private persist(): void {
    writeJsonAtomic(this.file, this.state);
  }
}
