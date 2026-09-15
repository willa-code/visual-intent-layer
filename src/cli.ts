#!/usr/bin/env node
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySetup, formatPlan, formatResult, formatStatus, parseHarnessFilter, planSetup } from './cli-setup.js';
import { createReviewService } from './mcp/service.js';
import { startLocalService } from './service/http.js';

const HELP = `visual-intent — local-first Visual Direction Loop

Usage:
  visual-intent serve [--port 3742]              Start the local review service
  visual-intent open --html <path>               Open a saved HTML artifact and print the review URL
  visual-intent open --app <localhost-url>       Open a running React/Vite app and print the review URL
  visual-intent setup [--global] [--no-skill] [--print-only] [--status] [--harness <name>]
      Detect the harnesses on this machine (pi, codex, claude-code, opencode),
      report what was detected and what was not, and register the MCP server
      with each configured harness. --harness is repeatable and restricts the
      matrix to the named harnesses. --status reports registration without
      writing anything.
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
  if (args[0] === 'setup') {
    const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');
    const harnessValues: string[] = [];
    for (let index = 1; index < args.length; index += 1) {
      const arg = args[index]!;
      if (arg === '--harness') {
        const value = args[index + 1];
        if (value === undefined) {
          console.error('--harness requires a value');
          process.exitCode = 1;
          return;
        }
        harnessValues.push(value);
        index += 1;
      } else if (arg.startsWith('--harness=')) {
        harnessValues.push(arg.slice('--harness='.length));
      }
    }
    let harnesses;
    try {
      harnesses = harnessValues.length > 0 ? parseHarnessFilter(harnessValues) : undefined;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
      return;
    }
    const setupOptions = {
      packageDir,
      homeDir: homedir(),
      projectDir: process.cwd(),
      global: args.includes('--global'),
      printOnly: args.includes('--print-only') || args.includes('--status'),
      withSkill: !args.includes('--no-skill'),
      harnesses
    };
    const plan = planSetup(setupOptions);
    if (args.includes('--status')) {
      console.log(formatStatus(plan));
      return;
    }
    if (setupOptions.printOnly) {
      console.log(formatPlan(plan));
      return;
    }
    const result = applySetup(plan, setupOptions);
    console.log(formatResult(result, plan));
    for (const note of plan.notes) {
      console.log(`note: ${note}`);
    }
    if (result.outcomes.some((outcome) => outcome.action === 'refused')) {
      process.exitCode = 1;
    }
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
