#!/usr/bin/env node
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createReviewService } from './mcp/service.js';
import { autoOpenSuppressed } from './service/browser.js';
import { startLocalService } from './service/http.js';
import { launchRecordJson, openLaunchRecord, serveLaunchRecord } from './service/launch.js';

const HELP = `visual-intent — local-first Visual Direction Loop

Usage:
  visual-intent serve [--port 3742] [--json]        Start the local review service
  visual-intent open --html <path> [--port 0] [--json] [--no-open]
      Open a saved HTML artifact and print the review URL.
  visual-intent open --app <localhost-url> [--source-root <path>] [--port 0] [--json] [--no-open]
      Open a running local app and print the review URL.
  visual-intent mcp                              Run the MCP server over stdio (used by agent hosts)
  visual-intent --help                           Show this help

open chooses its own port unless --port names one: port 0 lets the operating
system pick a free port, so two artifacts can be open at once. Opening a
session launches the default browser on this machine unless --no-open or
VISUAL_INTENT_NO_OPEN suppresses it. The review URL is always printed.

--json prints one machine-readable launch record instead of the human output.
The record names the base URL, the review URL, the session identity and the
artifact revision. The per-session capability appears only inside the review
URL.

Environment:
  VISUAL_INTENT_DATA_DIR   Lifecycle data directory (default ~/.visual-intent-layer/data)
  VISUAL_INTENT_PORT       Default service port (default 3742)
  VISUAL_INTENT_NO_OPEN    Set to 1 to suppress automatic browser opening
  VISUAL_INTENT_WAIT_MS    How long the agent-facing entry tool holds the call
`;

const dataDir =
  process.env['VISUAL_INTENT_DATA_DIR'] ?? join(homedir(), '.visual-intent-layer', 'data');

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(HELP);
    return;
  }
  const reviewService = createReviewService({ dataDir });
  if (args[0] === 'mcp') {
    await import('./mcp/stdio.js');
    return;
  }
  if (args[0] === 'serve') {
    const port = portFlag(args, Number(process.env['VISUAL_INTENT_PORT'] ?? 3742));
    if (port === undefined) {
      return;
    }
    const service = await startLocalService({ dataDir, reviewService, port }).catch(serviceFailure);
    if (!service) {
      return;
    }
    if (args.includes('--json')) {
      console.log(launchRecordJson(serveLaunchRecord(service.baseUrl, service.port)));
    } else {
      console.log(`Visual Intent review service on ${service.baseUrl}`);
      console.log(`Open an artifact: visual-intent open --html <path>`);
    }
    await new Promise(() => undefined);
    return;
  }
  if (args[0] === 'open') {
    const htmlFlag = args.indexOf('--html');
    const appFlag = args.indexOf('--app');
    const sourceRootFlag = args.indexOf('--source-root');
    const openBrowser = autoOpenSuppressed() || args.includes('--no-open') ? false : true;
    const port = portFlag(args, 0);
    if (port === undefined) {
      return;
    }
    if (!(htmlFlag !== -1 && args[htmlFlag + 1]) && !(appFlag !== -1 && args[appFlag + 1])) {
      console.error('open requires --html <path> or --app <localhost-url>');
      process.exitCode = 1;
      return;
    }
    const service = await startLocalService({ dataDir, reviewService, port }).catch(serviceFailure);
    if (!service) {
      return;
    }
    const input =
      htmlFlag !== -1 && args[htmlFlag + 1]
        ? ({ kind: 'saved-html', path: args[htmlFlag + 1]! } as const)
        : ({
            kind: 'react-vite-app',
            url: args[appFlag + 1]!,
            ...(sourceRootFlag !== -1 && args[sourceRootFlag + 1] ? { sourceRoot: args[sourceRootFlag + 1]! } : {})
          } as const);
    const opened = await reviewService
      .openArtifact(input, { baseUrl: service.baseUrl, openBrowser })
      .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
        return undefined;
      });
    if (!opened) {
      return;
    }
    if (args.includes('--json')) {
      console.log(launchRecordJson(openLaunchRecord(opened, service.baseUrl, service.port)));
    } else {
      console.log(opened.reviewUrl);
      console.log(`artifact ${opened.artifact.id} revision ${opened.artifact.revision}`);
      console.log(opened.reused ? 'reused the open session for this revision' : 'opened a new session');
      if (opened.browserOpened === false) {
        console.log('could not open a browser on this machine; open the URL above yourself');
      }
    }
    await new Promise(() => undefined);
    return;
  }
  console.error(`Unknown command: ${args[0]}\n${HELP}`);
  process.exitCode = 1;
}

function portFlag(args: string[], fallback: number): number | undefined {
  const index = args.indexOf('--port');
  if (index === -1) {
    return fallback;
  }
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    console.error('--port requires an integer between 0 and 65535');
    process.exitCode = 1;
    return undefined;
  }
  return value;
}

function serviceFailure(error: unknown): undefined {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
  return undefined;
}

await main();
