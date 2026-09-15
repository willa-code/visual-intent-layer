import { homedir } from 'node:os';
import { join } from 'node:path';
import { createReviewService } from './mcp/service.js';
import { startLocalService } from './service/http.js';

const HELP = `visual-intent — local-first Visual Direction Loop

Usage:
  visual-intent serve [--port 3742]              Start the local review service
  visual-intent open --html <path>               Open a saved HTML artifact and print the review URL
  visual-intent open --app <localhost-url>       Open a running React/Vite app and print the review URL
  visual-intent mcp                              Run the MCP server over stdio (used by agent hosts)
  visual-intent --help                           Show this help

Environment:
  VISUAL_INTENT_DATA_DIR   Lifecycle data directory (default ~/.visual-intent-layer/data)
  VISUAL_INTENT_PORT       Default service port (default 3742)
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
    const portFlag = args.indexOf('--port');
    const port =
      portFlag === -1 ? Number(process.env['VISUAL_INTENT_PORT'] ?? 3742) : Number(args[portFlag + 1]);
    const service = await startLocalService({ dataDir, reviewService, port });
    console.log(`Visual Intent review service on ${service.baseUrl}`);
    console.log(`Open an artifact: visual-intent open --html <path>`);
    await new Promise(() => undefined);
    return;
  }
  if (args[0] === 'open') {
    const htmlFlag = args.indexOf('--html');
    const appFlag = args.indexOf('--app');
    const service = await startLocalService({ dataDir, reviewService });
    if (htmlFlag !== -1 && args[htmlFlag + 1]) {
      const opened = await service.openSession({ kind: 'saved-html', path: args[htmlFlag + 1]! });
      console.log(opened.reviewUrl);
      console.log(`artifact ${opened.artifact.id} revision ${opened.artifact.revision}`);
      await new Promise(() => undefined);
      return;
    }
    if (appFlag !== -1 && args[appFlag + 1]) {
      const opened = await service.openSession({ kind: 'react-vite-app', url: args[appFlag + 1]! });
      console.log(opened.reviewUrl);
      await new Promise(() => undefined);
      return;
    }
    console.error('open requires --html <path> or --app <localhost-url>');
    process.exitCode = 1;
    return;
  }
  console.error(`Unknown command: ${args[0]}\n${HELP}`);
  process.exitCode = 1;
}

await main();
