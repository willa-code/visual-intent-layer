import type { OpenedArtifact } from '../mcp/service.js';

export type LaunchArtifact = OpenedArtifact['artifact'];

export type LaunchRecord = {
  command: 'open' | 'serve';
  baseUrl: string;
  port: number;
  reviewUrl: string | null;
  sessionId: string | null;
  artifact: LaunchArtifact | null;
  reused: boolean | null;
};

export function serveLaunchRecord(baseUrl: string, port: number): LaunchRecord {
  return {
    command: 'serve',
    baseUrl,
    port,
    reviewUrl: null,
    sessionId: null,
    artifact: null,
    reused: null
  };
}

export function openLaunchRecord(opened: OpenedArtifact, baseUrl: string, port: number): LaunchRecord {
  return {
    command: 'open',
    baseUrl,
    port,
    reviewUrl: opened.reviewUrl,
    sessionId: opened.sessionId,
    artifact: opened.artifact,
    reused: opened.reused
  };
}

export function launchRecordJson(record: LaunchRecord): string {
  return JSON.stringify(record);
}
