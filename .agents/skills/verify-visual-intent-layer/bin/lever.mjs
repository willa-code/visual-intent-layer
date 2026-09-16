#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXIT = { ok: 0, usage: 2, precondition: 3, unreachable: 4 };

const MAPPED_FEATURES = [
  'open-artifact',
  'annotate-and-send',
  'relational-intent',
  'resolution-and-honesty',
  'verify-each-annotation',
  'never-discard-writing',
  'attachments',
  'decision-drawer',
  'agent-position',
  'session-and-overflow',
  'running-application-mode',
  'accessibility-and-keyboard',
  'setup-and-detection',
  'mcp-agent-loop',
  'journeys'
];

const REPO_ROOT = findRepoRoot();
const RUN_ROOT = join(REPO_ROOT, '.visual-intent-verify');
const RUNS_DIR = join(RUN_ROOT, 'runs');
const LOCKS_DIR = join(RUN_ROOT, 'locks');
const HOST_SCRIPT = join(REPO_ROOT, '.agents', 'skills', 'verify-visual-intent-layer', 'bin', 'browser-host.mjs');
const HELP = `lever — drive the real Visual Intent Layer and capture proof

Usage:
  lever launch --html <path> [--name <label>] [--data-dir <path>] [--no-build] [--headed]
  lever launch --app <localhost-url> [--name <label>] [--no-build] [--headed]
  lever health [--run <name>]
  lever session [--run <name>]
  lever cleanup [--run <name>]
  lever open --html <path> [--name <label>]        (alias of launch)

  lever select --tool element|region|arrange --target <css> [--add] [--nth <n>]
  lever select --tool region --from <css> --to <css>
  lever annotate --note <text>
  lever relate --operator <operator> --from <css> --to <css>
  lever attach --file <path>
  lever queue
  lever reorder --from <index> --direction up|down
  lever send [--intent next-pass|steering|draft]
  lever reload
  lever reload-surface
  lever restart-service
  lever restart-browser
  lever review
  lever verify
  lever decide --verdict approve|reject|another-pass|supersede|obsolete [--row <n>]
  lever choose --row <n> --target <targetId> --node <nodeId>
  lever compare --mode before|after

  lever state [--run <name>]
  lever screenshot --name <state>
  lever snapshot --name <state> [--frame artifact]
  lever record --name <label>
  lever trace [--name <state>]
  lever console
  lever network
  lever wait --target <css> [--frame artifact] [--timeout <ms>]

  lever setup [--global|--print-only|--status|--harness <name> ...]
  lever mcp --tool <name> [--args <json>] [--run <name>]
  lever finish --outcome clean|changed|blocked|aborted [--run <name>]
  lever coverage --driven <feature-id> [--detail <text>] [--run <name>]
  lever press --key <key> [--target <css>] [--frame artifact]
  lever attention
  lever overflow --item <label>

Flags:
  --run <name>     Operate on a named run; defaults to the newest run.
  --dry-run        Report what a state-changing command would do; change nothing.
  --headed         Show the browser (default headless).
  --json           Machine-readable output (always on; accepted for symmetry).
  --help           This help.

Exit codes: 0 success, 2 usage error, 3 unmet precondition, 4 unreachable path.
`;

function findRepoRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        const parsed = JSON.parse(readFileSync(pkg, 'utf8'));
        if (parsed.name === 'visual-intent-layer') {
          return dir;
        }
      } catch {
        // keep walking
      }
    }
    dir = dirname(dir);
  }
  return process.cwd();
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'run';
}

function output(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function fail(exitClass, message, next) {
  output({ ok: false, error: { message, next, class: classOf(exitClass) } });
  process.exit(exitClass);
}

function classOf(exitClass) {
  return exitClass === EXIT.usage ? 'usage' : exitClass === EXIT.precondition ? 'precondition' : 'unreachable';
}

function parseArgs(args) {
  const flags = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      const next = args[index + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[name] = next;
        index += 1;
      } else {
        flags[name] = true;
      }
    } else {
      flags._.push(arg);
    }
  }
  return flags;
}

function sha1(value) {
  return createHash('sha1').update(value).digest('hex');
}

function pidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function resolveRun(runRef) {
  if (runRef) {
    const direct = join(RUNS_DIR, runRef);
    if (existsSync(direct)) return direct;
    const match = existsSync(RUNS_DIR)
      ? readdirSync(RUNS_DIR).find((entry) => entry === runRef || entry.endsWith(`-${runRef}`))
      : undefined;
    if (match) return join(RUNS_DIR, match);
    fail(EXIT.precondition, `No Verification Run named ${runRef}.`, 'Run `lever launch` first or pass an existing --run name.');
  }
  const pointer = join(RUN_ROOT, 'latest');
  if (existsSync(pointer)) {
    const target = readFileSync(pointer, 'utf8').trim();
    const dir = join(RUNS_DIR, target);
    if (existsSync(dir)) return dir;
  }
  fail(EXIT.precondition, 'No Verification Run exists yet.', 'Run `lever launch --html <path>` first.');
}

function secretPath(runDir) {
  return join(runDir, '.session.json');
}

function readSecret(runDir) {
  const secret = readJson(secretPath(runDir), undefined);
  if (!secret) {
    fail(EXIT.precondition, 'This run has no live session state.', 'Run `lever launch` for this run, or choose another with --run.');
  }
  return secret;
}

function readState(runDir) {
  return readJson(join(runDir, 'state.json'), {});
}

function lockPath(dataDir) {
  return join(LOCKS_DIR, `${sha1(resolve(dataDir))}.json`);
}

function assertOwned(runDir, secret) {
  if (!pidAlive(secret.productPid)) {
    fail(EXIT.precondition, `The product process ${secret.productPid} for this run is not alive.`, 'Relaunch with `lever launch`, then run `lever health`.');
  }
  const sessionsFile = join(secret.dataDir, 'service-sessions.json');
  if (!existsSync(sessionsFile)) {
    fail(EXIT.precondition, `The lifecycle data directory ${secret.dataDir} is gone.`, 'Relaunch with `lever launch`.');
  }
  const records = readJson(sessionsFile, {});
  if (!records[secret.sessionId]) {
    fail(EXIT.precondition, `Session ${secret.sessionId} is not owned by this run's lifecycle data directory.`, 'Relaunch with `lever launch`.');
  }
}

async function callHost(endpoint, method, path, body) {
  const response = await fetch(`${endpoint}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.error ?? 'browser host refused');
  }
  return payload;
}

function hostCall(secret) {
  if (!secret.hostEndpoint || !pidAlive(secret.hostPid)) {
    fail(EXIT.precondition, 'The browser session for this run is not alive.', 'Use `lever launch` or `lever health` to restore the run.');
  }
  return async (path, body) => {
    try {
      return await callHost(secret.hostEndpoint, 'POST', path, body ?? {});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      recordUnreachableQuiet(secret.runDir, `browser ${path}`, message);
      fail(EXIT.unreachable, message, 'Check `lever state` and the target selector, then retry.');
    }
  };
}

function recordUnreachableQuiet(runDir, command, precondition) {
  const file = join(runDir, 'state.json');
  if (!existsSync(file)) return;
  const state = readJson(file, {});
  state.unreachable = state.unreachable ?? [];
  state.unreachable.push({ command, precondition, at: new Date().toISOString() });
  writeJson(file, state);
  writeReport(runDir);
  writeRunRecord(runDir);
}

function git(args) {
  const result = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function newestMtime(dir, filter) {
  let newest = 0;
  const walk = (current) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(path);
      } else if (!filter || filter(path)) {
        const mtime = statSync(path).mtimeMs;
        if (mtime > newest) newest = mtime;
      }
    }
  };
  walk(dir);
  return newest;
}

function buildFreshness() {
  const distCli = join(REPO_ROOT, 'dist', 'cli.js');
  if (!existsSync(distCli)) {
    return { fresh: false, reason: 'dist/cli.js does not exist' };
  }
  const builtAt = statSync(distCli).mtimeMs;
  const sourceAt = Math.max(
    newestMtime(join(REPO_ROOT, 'src')),
    newestMtime(join(REPO_ROOT, 'scripts')),
    existsSync(join(REPO_ROOT, 'package.json')) ? statSync(join(REPO_ROOT, 'package.json')).mtimeMs : 0
  );
  if (sourceAt > builtAt) {
    return { fresh: false, reason: 'source is newer than dist', builtAt, sourceAt };
  }
  return { fresh: true, builtAt, sourceAt };
}

function environment() {
  const pkg = readJson(join(REPO_ROOT, 'package.json'), {});
  const freshness = buildFreshness();
  return {
    revision: git(['rev-parse', 'HEAD']) ?? null,
    dirty: (git(['status', '--porcelain']) ?? '') !== '',
    packageVersion: pkg.version ?? null,
    buildFreshness: freshness.fresh,
    buildFreshnessReason: freshness.reason ?? null,
    builtAt: freshness.builtAt ?? null,
    toolVersions: {
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      playwright: readJson(join(REPO_ROOT, 'node_modules', 'playwright', 'package.json'), {}).version ?? 'unknown'
    }
  };
}

function buildProduct() {
  const result = spawnSync('npm', ['run', 'build'], { cwd: REPO_ROOT, stdio: 'ignore' });
  if (result.status !== 0) {
    fail(EXIT.precondition, 'The product build failed, so there is nothing trustworthy to drive.', 'Fix the build with `npm run build`, then relaunch.');
  }
}

function spawnProduct(secret) {
  const args = secret.launchArgs;
  const logFile = join(secret.runDir, 'product.log');
  const logFd = openSync(logFile, 'a');
  const child = spawn(process.execPath, [join(REPO_ROOT, 'dist', 'cli.js'), ...args], {
    cwd: REPO_ROOT,
    env: { ...process.env, VISUAL_INTENT_DATA_DIR: secret.dataDir, VISUAL_INTENT_NO_OPEN: '1' },
    stdio: ['ignore', 'pipe', logFd],
    detached: true
  });
  return new Promise((resolvePromise, rejectPromise) => {
    let buffer = '';
    const timer = setTimeout(() => rejectPromise(new Error('the product did not report a launch record in time')), 30000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const newline = buffer.indexOf('\n');
      if (newline !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        try {
          const record = JSON.parse(line);
          clearTimeout(timer);
          child.stdout.removeAllListeners('data');
          child.stdout.destroy();
          child.unref();
          resolvePromise({ child, record });
        } catch {
          // not the launch record yet
        }
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      rejectPromise(new Error(`the product exited early with code ${code}`));
    });
  });
}

async function spawnHost(secret, headless) {
  const child = spawn(process.execPath, [
    HOST_SCRIPT,
    '--run-dir',
    secret.runDir,
    '--evidence-dir',
    join(secret.runDir, 'evidence'),
    '--video-dir',
    join(secret.runDir, 'evidence', 'video'),
    ...(headless ? [] : ['--headed'])
  ], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true
  });
  child.unref();
  const ready = join(secret.runDir, 'host.json');
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const info = readJson(ready, undefined);
    if (info && info.pid === child.pid) {
      return { pid: child.pid, endpoint: info.endpoint };
    }
    if (!pidAlive(child.pid)) {
      break;
    }
    await sleep(150);
  }
  fail(EXIT.precondition, 'The browser session did not start.', `Read ${join(secret.runDir, 'host.log')} and try again.`);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function sanitizedReviewUrl(url) {
  if (!url) return null;
  return url.replace(/([?&]cap=)[^&]+/, '$1<redacted>');
}

async function productGet(secret, path) {
  const url = new URL(path, secret.baseUrl);
  url.searchParams.set('cap', secret.capability);
  const response = await fetch(url, { headers: { 'x-session-cap': secret.capability } });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { body: text };
  }
  return { status: response.status, json };
}

async function healthReport(runDir) {
  const secret = readSecret(runDir);
  const state = readState(runDir);
  const locked = readJson(lockPath(secret.dataDir), undefined);
  const owned = pidAlive(secret.productPid) && locked?.pid === secret.productPid;
  let liveness = false;
  try {
    const health = await fetch(new URL('/health', secret.baseUrl));
    liveness = health.ok && (await health.text()) === 'ok';
  } catch {
    liveness = false;
  }
  let capability = false;
  if (liveness) {
    const status = await productGet(secret, `/api/sessions/${secret.sessionId}`);
    capability = status.status === 200;
  }
  const freshness = buildFreshness();
  const revisionNow = git(['rev-parse', 'HEAD']);
  const revisionMoved = revisionNow !== undefined && state.environment?.revision !== undefined && revisionNow !== state.environment.revision;
  const stale = !freshness.fresh || revisionMoved;
  return {
    ok: liveness && owned && capability && !stale,
    alive: liveness,
    owned,
    liveness,
    ownership: owned,
    capability,
    capabilityAuthorised: capability,
    stale,
    buildFreshness: freshness.fresh,
    buildFreshnessReason: freshness.fresh ? null : freshness.reason,
    revisionMoved,
    dataDir: secret.dataDir,
    pid: secret.productPid,
    baseUrl: secret.baseUrl,
    sessionId: secret.sessionId,
    reviewUrl: sanitizedReviewUrl(secret.reviewUrl)
  };
}

async function assertHealthy(runDir) {
  const secret = readSecret(runDir);
  assertOwned(runDir, secret);
  const report = await healthReport(runDir);
  if (report.stale) {
    fail(
      EXIT.precondition,
      `The instance for this run is stale: ${report.buildFreshnessReason ?? 'the revision moved since launch'}.`,
      'Relaunch with `lever launch` so the instance reflects the working tree.'
    );
  }
  if (!report.capabilityAuthorised) {
    fail(EXIT.precondition, 'The run capability no longer authorises this session.', 'Relaunch with `lever launch`.');
  }
  return secret;
}

async function commandLaunch(flags) {
  const html = flags.html;
  const app = app_(flags);
  if (!html && !app) {
    fail(EXIT.usage, 'launch needs --html <path> or --app <localhost-url>.', 'Run `lever help` for the surface.');
  }
  const label = typeof flags.name === 'string' ? flags.name : html ? `open-artifact` : `open-app`;
  const runDir = join(RUNS_DIR, `${nowStamp()}-${slug(label)}`);
  const dataDir = typeof flags['data-dir'] === 'string' ? resolve(flags['data-dir']) : join(runDir, 'data');
  guardDataDir(dataDir);
  const existingLock = readJson(lockPath(dataDir), undefined);
  if (existingLock && pidAlive(existingLock.pid)) {
    fail(
      EXIT.precondition,
      `Lifecycle data directory ${dataDir} is already owned by live process ${existingLock.pid} in ${existingLock.runDir}.`,
      'Stop that run with `lever cleanup --run <name>`, or launch with a different --data-dir.'
    );
  }
  const headless = flags.headed !== true;
  const launchArgs = html
    ? ['open', '--html', html, '--port', '0', '--json']
    : ['open', '--app', app, '--port', '0', '--json'];
  if (flags['dry-run']) {
    output({
      dryRun: true,
      would: {
        build: flags['no-build'] !== true,
        createDataDir: dataDir,
        launch: launchArgs,
        browser: headless ? 'headless' : 'headful',
        suppressProductBrowser: true
      }
    });
    return;
  }
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(runDir, 'evidence'), { recursive: true });
  if (flags['no-build'] !== true) {
    buildProduct();
  }
  const secret = {
    runDir,
    dataDir,
    launchArgs,
    productPid: null,
    sessionId: null,
    capability: null,
    reviewUrl: null,
    baseUrl: null,
    hostPid: null,
    hostEndpoint: null
  };
  const { child, record } = await spawnProduct(secret);
  child.unref();
  secret.productPid = child.pid;
  secret.sessionId = record.sessionId;
  secret.reviewUrl = record.reviewUrl;
  secret.baseUrl = record.baseUrl;
  secret.capability = new URL(record.reviewUrl).searchParams.get('cap');
  writeJson(lockPath(dataDir), { pid: child.pid, runDir, dataDir, startedAt: new Date().toISOString() });
  const host = await spawnHost(secret, headless);
  secret.hostPid = host.pid;
  secret.hostEndpoint = host.endpoint;
  writeJson(secretPath(runDir), secret);
  chmodSync(secretPath(runDir), 0o600);
  await callHost(host.endpoint, 'POST', '/navigate', { url: secret.reviewUrl });
  const environmentRecord = environment();
  writeJson(join(runDir, 'state.json'), {
    run: runDir.split('/').pop(),
    startedAt: new Date().toISOString(),
    status: 'running',
    outcome: 'aborted',
    dataDir,
    launch: {
      pid: child.pid,
      baseUrl: record.baseUrl,
      sessionId: record.sessionId,
      reviewUrl: sanitizedReviewUrl(record.reviewUrl),
      artifact: record.artifact
    },
    host: { pid: host.pid },
    environment: environmentRecord,
    evidence: [],
    coverage: { driven: [{ id: 'open-artifact', detail: 'launched and rendered the Artifact', at: new Date().toISOString() }], mapped: MAPPED_FEATURES.map((id) => ({ id })) },
    unreachable: []
  });
  writeReport(runDir);
  writeFileSync(join(RUN_ROOT, 'latest'), runDir.split('/').pop(), 'utf8');
  output({
    ok: true,
    command: 'launch',
    run: runDir.split('/').pop(),
    runDir: runDir.slice(REPO_ROOT.length + 1),
    baseUrl: record.baseUrl,
    reviewUrl: record.reviewUrl,
    sessionId: record.sessionId,
    artifact: record.artifact,
    productPid: child.pid,
    hostPid: host.pid,
    dataDir,
    evidenceDir: join(runDir, 'evidence').slice(REPO_ROOT.length + 1)
  });
}

function app_(flags) {
  return typeof flags.app === 'string' ? flags.app : undefined;
}

function guardDataDir(dataDir) {
  const defaultDir = join(homedir(), '.visual-intent-layer');
  if (resolve(dataDir) === defaultDir || resolve(dataDir).startsWith(`${defaultDir}/`)) {
    fail(
      EXIT.precondition,
      `Refusing to use the Builder-Reviewer's own lifecycle directory ${dataDir}.`,
      'Use a run-scoped --data-dir under the run directory.'
    );
  }
}

async function commandHealth(flags) {
  const runDir = resolveRun(flags.run);
  const report = await healthReport(runDir);
  if (!report.ok) {
    report.next = report.stale ? 'Relaunch with `lever launch`.' : 'Relaunch with `lever launch`, then run `lever health`.';
  }
  output({ ok: report.ok, command: 'health', ...report });
  process.exit(report.ok ? EXIT.ok : EXIT.precondition);
}

async function commandSession(flags) {
  const runDir = resolveRun(flags.run);
  const secret = readSecret(runDir);
  const state = readState(runDir);
  output({
    ok: true,
    command: 'session',
    run: runDir.split('/').pop(),
    sessionId: secret.sessionId,
    baseUrl: secret.baseUrl,
    reviewUrl: sanitizedReviewUrl(secret.reviewUrl),
    artifact: state.launch?.artifact ?? null
  });
}

async function commandCleanup(flags) {
  const runDir = resolveRun(flags.run);
  const secret = readSecret(runDir);
  const state = readState(runDir);
  if (flags['dry-run']) {
    output({
      dryRun: true,
      would: {
        killProductPid: secret.productPid,
        killHostPid: secret.hostPid,
        removeDataDir: secret.dataDir,
        removeLock: lockPath(secret.dataDir),
        removeSecret: secretPath(runDir),
        keepEvidence: true
      }
    });
    return;
  }
  await callHost(secret.hostEndpoint, 'POST', '/close', {}).catch(() => undefined);
  await terminate(secret.hostPid);
  await terminate(secret.productPid);
  rmSync(secret.dataDir, { recursive: true, force: true });
  rmSync(lockPath(secret.dataDir), { force: true });
  rmSync(secretPath(runDir), { force: true });
  rmSync(join(runDir, 'host.json'), { force: true });
  const evidence = await verifyEvidence(runDir);
  state.status = 'stopped';
  state.finishedAt = new Date().toISOString();
  state.outcome = state.outcome === 'aborted' ? 'clean' : state.outcome;
  state.evidenceIntact = evidence.intact;
  writeJson(join(runDir, 'state.json'), state);
  writeReport(runDir);
  output({
    ok: true,
    command: 'cleanup',
    run: runDir.split('/').pop(),
    evidenceIntact: evidence.intact,
    evidence,
    processRemoved: { productPid: secret.productPid, hostPid: secret.hostPid },
    dataDirRemoved: secret.dataDir
  });
}

async function terminate(pid) {
  if (!pid || !pidAlive(pid)) return;
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return;
  }
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && pidAlive(pid)) {
    await sleep(100);
  }
  if (pidAlive(pid)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // already gone
    }
  }
}

async function verifyEvidence(runDir) {
  const state = readState(runDir);
  const files = [];
  const evidenceDir = join(runDir, 'evidence');
  const collected = existsSync(evidenceDir) ? readdirSync(evidenceDir) : [];
  for (const name of collected) {
    if (name === 'video') continue;
    files.push({ name, bytes: statSync(join(evidenceDir, name)).size });
  }
  const recordExists = existsSync(join(runDir, 'state.json'));
  const reportExists = existsSync(join(runDir, 'report.md'));
  return {
    intact: recordExists && reportExists && files.length > 0,
    files,
    runRecord: recordExists,
    report: reportExists,
    evidenceRecorded: state.evidence?.length ?? 0
  };
}

function writeReport(runDir) {
  const state = readState(runDir);
  const lines = [
    `# Verification Run ${state.run ?? ''}`.trim(),
    '',
    `- Outcome: ${state.outcome ?? 'unknown'}`,
    `- Started: ${state.startedAt ?? 'unknown'}`,
    `- Status: ${state.status ?? 'unknown'}`,
    `- Evidence intact: ${state.evidenceIntact ?? 'not yet checked'}`,
    `- Revision: ${state.environment?.revision ?? 'unknown'} (dirty: ${String(state.environment?.dirty ?? 'unknown')})`,
    `- Package: ${state.environment?.packageVersion ?? 'unknown'}`,
    `- Build fresh at launch: ${String(state.environment?.buildFreshness ?? 'unknown')}`,
    '',
    '## Coverage',
    '',
    `- Driven: ${(state.coverage?.driven ?? []).map((entry) => entry.id).join(', ') || 'none recorded'}`,
    `- Mapped: ${(state.coverage?.mapped ?? []).map((entry) => entry.id).join(', ') || 'none recorded'}`,
    '',
    '## Evidence',
    '',
    ...(state.evidence ?? []).map((entry) => `- ${entry.kind}: ${entry.path ?? entry.name}`),
    '',
    '## Unreachable paths',
    '',
    ...(state.unreachable ?? []).map((entry) => `- ${entry.command} — unmet: ${entry.precondition}`)
  ];
  writeFileSync(join(runDir, 'report.md'), `${lines.join('\n')}\n`, 'utf8');
}

function recordEvidence(runDir, entry) {
  const state = readState(runDir);
  state.evidence = state.evidence ?? [];
  state.evidence.push({ at: new Date().toISOString(), ...entry });
  writeJson(join(runDir, 'state.json'), state);
  writeReport(runDir);
}

function recordCoverage(runDir, id, action, detail) {
  const state = readState(runDir);
  state.coverage = state.coverage ?? { driven: [], mapped: [] };
  if (action === 'driven' && !state.coverage.driven.some((entry) => entry.id === id)) {
    state.coverage.driven.push({ id, detail: detail ?? null, at: new Date().toISOString() });
  }
  if (action === 'mapped' && !state.coverage.mapped.some((entry) => entry.id === id)) {
    state.coverage.mapped.push({ id, detail: detail ?? null });
  }
  writeJson(join(runDir, 'state.json'), state);
  writeReport(runDir);
}

function recordUnreachable(runDir, command, precondition) {
  const state = readState(runDir);
  state.unreachable = state.unreachable ?? [];
  state.unreachable.push({ command, precondition, at: new Date().toISOString() });
  writeJson(join(runDir, 'state.json'), state);
  writeReport(runDir);
}

function targetFromFlags(flags) {
  const target = {};
  if (typeof flags.target === 'string') target.selector = flags.target;
  if (typeof flags.role === 'string') target.role = flags.role;
  if (typeof flags.text === 'string') target.text = flags.text;
  if (typeof flags.nth === 'string') target.nth = Number(flags.nth);
  return target;
}

function selector(value) {
  return { selector: value };
}

async function commandSelect(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const tool = typeof flags.tool === 'string' ? flags.tool : 'element';
  if (!['element', 'region', 'arrange'].includes(tool)) {
    fail(EXIT.usage, `Unsupported selection tool ${tool}.`, 'Use element, region or arrange.');
  }
  const host = hostCall(secret);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { tool, target: targetFromFlags(flags), click: tool === 'element' } });
    return;
  }
  await host('/click', { target: { role: 'button', name: 'Review', exact: true } });
  await host('/click', { target: { role: 'button', name: `${capitalize(tool)} tool`, exact: false } });
  if (tool === 'element' || tool === 'arrange') {
    await host('/click', {
      target: targetFromFlags(flags),
      frame: 'artifact',
      ...(flags.add ? { modifiers: ['Shift'] } : {})
    });
  } else if (tool === 'region') {
    if (typeof flags.from !== 'string' || typeof flags.to !== 'string') {
      fail(EXIT.usage, 'region selection needs --from <css> and --to <css>.', 'Run `lever help` for the surface.');
    }
    await host('/drag', { from: selector(flags.from), to: selector(flags.to), frame: 'artifact' });
  }
  await host('/wait', { target: { selector: '.anchored-card' }, state: 'visible' });
  const shot = await host('/screenshot', { name: `select-${tool}-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: `select-${tool}`, path: shot.path });
  await host('/snapshot', { name: `select-${tool}-${Date.now()}` });
  output({ ok: true, command: 'select', tool, screenshot: shot.path });
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function commandAnnotate(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (typeof flags.note !== 'string') {
    fail(EXIT.usage, 'annotate needs --note <text>.', 'Run `lever help` for the surface.');
  }
  if (flags['dry-run']) {
    output({ dryRun: true, would: { fill: '.anchored-card textarea', note: flags.note } });
    return;
  }
  const host = hostCall(secret);
  await host('/wait', { target: { selector: '.anchored-card textarea' }, state: 'visible' });
  await host('/fill', { target: { selector: '.anchored-card textarea' }, value: flags.note });
  await sleep(600);
  const shot = await host('/screenshot', { name: `annotate-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'annotate', path: shot.path });
  recordCoverage(runDir, 'annotate-and-send', 'driven', 'wrote a note onto a selected target');
  output({ ok: true, command: 'annotate', note: flags.note, screenshot: shot.path });
}

async function commandQueue(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { click: '.anchored-card button:has-text("Queue")' } });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { role: 'button', name: 'Queue', exact: true } });
  await host('/wait', { target: { selector: '.queue-item' }, state: 'visible' });
  const shot = await host('/screenshot', { name: `queue-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'queue', path: shot.path });
  recordCoverage(runDir, 'annotate-and-send', 'driven', 'queued an Annotation');
  output({ ok: true, command: 'queue', screenshot: shot.path });
}

async function commandSend(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const intent = typeof flags.intent === 'string' ? flags.intent : 'next-pass';
  if (!['next-pass', 'steering', 'draft'].includes(intent)) {
    fail(EXIT.usage, `Unsupported delivery timing ${intent}.`, 'Use next-pass, steering or draft.');
  }
  if (flags['dry-run']) {
    const before = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
    output({ dryRun: true, would: { intent, deliver: true }, annotationStates: before.json.annotations?.map((a) => a.state) ?? [] });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { role: 'button', name: 'Send the queue' } });
  let delivered = false;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const snapshot = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
    const annotations = snapshot.json.annotations ?? [];
    if (annotations.some((annotation) => annotation.state === 'delivered' || annotation.state === 'resolved')) {
      delivered = true;
      break;
    }
    await sleep(200);
  }
  const shot = await host('/screenshot', { name: `send-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: `send-${intent}`, path: shot.path });
  if (!delivered) {
    fail(EXIT.unreachable, 'The Annotation Queue did not reach a delivered state.', 'Read `lever state` and retry after a `lever health` check.');
  }
  recordCoverage(runDir, 'annotate-and-send', 'driven', `sent with ${intent}`);
  output({ ok: true, command: 'send', intent, delivered: true, screenshot: shot.path });
}

async function commandRelate(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const operator = typeof flags.operator === 'string' ? flags.operator : undefined;
  if (!operator) {
    fail(EXIT.usage, 'relate needs --operator <operator>.', 'Run `lever help` for the surface.');
  }
  if (flags['dry-run']) {
    output({ dryRun: true, would: { operator, manipulate: true } });
    return;
  }
  if (typeof flags.from !== 'string' || typeof flags.to !== 'string') {
    fail(EXIT.usage, 'relate needs --from <css> and --to <css>.', 'Run `lever help` for the surface.');
  }
  const host = hostCall(secret);
  const from = selector(flags.from);
  const to = selector(flags.to);
  await host('/click', { target: { role: 'button', name: 'Review', exact: true } });
  await host('/click', { target: { role: 'button', name: 'Element tool', exact: false } });
  await host('/click', { target: from, frame: 'artifact' });
  await host('/click', { target: to, frame: 'artifact', modifiers: ['Shift'] });
  await host('/click', { target: { role: 'button', name: 'Arrange tool', exact: false } });
  const drag = dragFor(operator);
  await host('/drag', { from, to, frame: 'artifact', ...drag });
  await sleep(400);
  const snapshot = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
  const relations = (snapshot.json.annotations ?? []).flatMap((annotation) => annotation.relationships ?? []);
  const match = relations.find((relation) => relation.operator === operator) ?? relations[0];
  const shot = await host('/screenshot', { name: `relate-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: `relate-${operator}`, path: shot.path });
  recordCoverage(runDir, 'relational-intent', 'driven', operator);
  if (!match) {
    fail(EXIT.unreachable, `The surface did not record a relation from that manipulation.`, 'Read `lever state` and repeat the manipulation.');
  }
  output({ ok: true, command: 'relate', operator, relation: match, screenshot: shot.path });
}

function dragFor(operator) {
  switch (operator) {
    case 'before':
      return { type: 'ordering', nudgeX: -160, nudgeY: 0, modifiers: [] };
    case 'after':
      return { type: 'ordering', nudgeX: 160, nudgeY: 0, modifiers: [] };
    case 'member-of':
      return { type: 'containment', nudgeX: 0, nudgeY: 0, modifiers: [] };
    case 'equal-gap':
      return { type: 'spacing', nudgeX: 0, nudgeY: 0, modifiers: ['Alt'] };
    case 'shared-property':
      return { type: 'equivalence', nudgeX: 0, nudgeY: 0, modifiers: ['Meta'] };
    case 'same-width':
      return { type: 'comparative-size', nudgeX: 40, nudgeY: 0, modifiers: ['Shift'] };
    case 'same-height':
      return { type: 'comparative-size', nudgeX: 0, nudgeY: 40, modifiers: ['Shift'] };
    default:
      return { type: 'alignment', nudgeX: 2, nudgeY: 2, modifiers: [] };
  }
}

async function commandAttach(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (typeof flags.file !== 'string') {
    fail(EXIT.usage, 'attach needs --file <path>.', 'Run `lever help` for the surface.');
  }
  if (flags['dry-run']) {
    output({ dryRun: true, would: { attach: flags.file } });
    return;
  }
  const host = hostCall(secret);
  await host('/chooser/arm', {});
  await host('/click', { target: { role: 'button', name: 'Attach a reference image' } });
  await host('/chooser/set', { path: resolve(flags.file) });
  await sleep(600);
  const snapshot = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
  const attachments = (snapshot.json.annotations ?? []).flatMap((annotation) => annotation.attachments ?? []);
  const shot = await host('/screenshot', { name: `attach-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'attach', path: shot.path });
  recordCoverage(runDir, 'attachments', 'driven', 'attached a reference image');
  output({ ok: true, command: 'attach', attachments, screenshot: shot.path });
}

async function commandReload(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { reloadArtifact: true } });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { role: 'button', name: 'More actions' } });
  await host('/click', { target: { role: 'menuitem', name: 'Reload artifact' } });
  await host('/press', { key: 'Escape' });
  await sleep(800);
  const shot = await host('/screenshot', { name: `reload-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'reload', path: shot.path });
  recordCoverage(runDir, 'resolution-and-honesty', 'driven', 'reloaded the changed Artifact');
  output({ ok: true, command: 'reload', screenshot: shot.path });
}

async function commandRestartService(flags) {
  const runDir = resolveRun(flags.run);
  const secret = readSecret(runDir);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { killProductPid: secret.productPid, relaunch: secret.launchArgs } });
    return;
  }
  await terminate(secret.productPid);
  const { child, record } = await spawnProduct(secret);
  secret.productPid = child.pid;
  secret.sessionId = record.sessionId;
  secret.reviewUrl = record.reviewUrl;
  secret.baseUrl = record.baseUrl;
  secret.capability = new URL(record.reviewUrl).searchParams.get('cap');
  writeJson(secretPath(runDir), secret);
  chmodSync(secretPath(runDir), 0o600);
  writeJson(lockPath(secret.dataDir), { pid: child.pid, runDir, dataDir: secret.dataDir, startedAt: new Date().toISOString() });
  await callHost(secret.hostEndpoint, 'POST', '/navigate', { url: secret.reviewUrl });
  const shot = await hostCall(secret)('/screenshot', { name: `restart-service-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'restart-service', path: shot.path });
  recordCoverage(runDir, 'never-discard-writing', 'driven', 'restarted the service');
  output({ ok: true, command: 'restart-service', productPid: child.pid, baseUrl: record.baseUrl, sessionId: record.sessionId, screenshot: shot.path });
}

async function commandRestartBrowser(flags) {
  const runDir = resolveRun(flags.run);
  const secret = readSecret(runDir);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { restartBrowser: true } });
    return;
  }
  const result = await callHost(secret.hostEndpoint, 'POST', '/restart', { url: secret.reviewUrl });
  const shot = await hostCall(secret)('/screenshot', { name: `restart-browser-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'restart-browser', path: shot.path });
  recordCoverage(runDir, 'never-discard-writing', 'driven', 'restarted the browser');
  output({ ok: true, command: 'restart-browser', url: result.url, screenshot: shot.path });
}

async function commandReloadSurface(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { reloadSurface: true } });
    return;
  }
  const host = hostCall(secret);
  await host('/reload', {});
  await host('/wait', { target: { selector: '.topbar' }, state: 'visible' });
  await sleep(600);
  const shot = await host('/screenshot', { name: `reload-surface-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'reload-surface', path: shot.path });
  recordCoverage(runDir, 'never-discard-writing', 'driven', 'reloaded the Review Surface');
  output({ ok: true, command: 'reload-surface', screenshot: shot.path });
}

async function commandPress(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (typeof flags.key !== 'string') {
    fail(EXIT.usage, 'press needs --key <key>.', 'Run `lever help` for the surface.');
  }
  if (flags['dry-run']) {
    output({ dryRun: true, would: { press: flags.key } });
    return;
  }
  const host = hostCall(secret);
  if (typeof flags.target === 'string' || typeof flags.role === 'string') {
    await host('/press', { target: targetFromFlags(flags), ...(flags.frame === 'artifact' ? { frame: 'artifact' } : {}), key: flags.key });
  } else {
    await host('/press', { key: flags.key });
  }
  await sleep(300);
  output({ ok: true, command: 'press', key: flags.key });
}

async function commandAttention(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { openDrawer: true } });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { selector: '.attention-trigger' } });
  await host('/wait', { target: { selector: '.drawer' }, state: 'visible' });
  const shot = await host('/screenshot', { name: `attention-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'attention', path: shot.path });
  output({ ok: true, command: 'attention', screenshot: shot.path });
}

async function commandOverflow(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (typeof flags.item !== 'string') {
    fail(EXIT.usage, 'overflow needs --item <label>.', 'Use Reload artifact, Copy artifact path, Copy evidence for the queue, Open the disclosure or End session.');
  }
  if (flags['dry-run']) {
    output({ dryRun: true, would: { overflowItem: flags.item } });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { role: 'button', name: 'More actions' } });
  await host('/click', { target: { role: 'menuitem', name: flags.item, exact: true } });
  await sleep(400);
  const shot = await host('/screenshot', { name: `overflow-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: `overflow-${slug(flags.item)}`, path: shot.path });
  output({ ok: true, command: 'overflow', item: flags.item, screenshot: shot.path });
}

async function commandReorder(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const from = Number(flags.from);
  const direction = flags.direction === 'down' ? 'Move down' : 'Move up';
  if (!Number.isInteger(from) || from < 0) {
    fail(EXIT.usage, 'reorder needs --from <index> and --direction up|down.', 'Run `lever help` for the surface.');
  }
  if (flags['dry-run']) {
    output({ dryRun: true, would: { move: direction, from } });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { role: 'button', name: direction, nth: from } });
  await sleep(300);
  const snapshot = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
  const order = (snapshot.json.annotations ?? []).sort((a, b) => a.order - b.order).map((annotation) => annotation.annotationId);
  recordCoverage(runDir, 'annotate-and-send', 'driven', `reordered ${direction.toLowerCase()}`);
  output({ ok: true, command: 'reorder', moved: direction, order });
}

async function commandCoverage(flags) {
  const runDir = resolveRun(flags.run);
  const id = typeof flags.driven === 'string' ? flags.driven : undefined;
  if (!id) {
    fail(EXIT.usage, 'coverage needs --driven <feature-id>.', 'Use the id from the feature map index.');
  }
  const detail = typeof flags.detail === 'string' ? flags.detail : null;
  recordCoverage(runDir, id, 'driven', detail);
  const state = readState(runDir);
  output({ ok: true, command: 'coverage', driven: id, coverage: state.coverage });
}

async function commandFinish(flags) {
  const runDir = resolveRun(flags.run);
  const outcome = flags.outcome;
  if (!['clean', 'changed', 'blocked', 'aborted'].includes(outcome)) {
    fail(EXIT.usage, 'finish needs --outcome clean|changed|blocked|aborted.', 'Run `lever help` for the surface.');
  }
  const state = readState(runDir);
  state.outcome = outcome;
  state.finishedAt = new Date().toISOString();
  writeJson(join(runDir, 'state.json'), state);
  writeRunRecord(runDir);
  writeReport(runDir);
  writeFileSync(join(RUN_ROOT, 'latest'), runDir.split('/').pop(), 'utf8');
  output({ ok: true, command: 'finish', outcome, coverage: state.coverage ?? { driven: [], mapped: [] }, unreachable: state.unreachable ?? [] });
}

async function commandReview(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { enterReview: true } });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { role: 'button', name: 'Review', exact: true } });
  await sleep(300);
  output({ ok: true, command: 'review' });
}

async function commandVerify(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { enterVerify: true } });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { role: 'button', name: 'Verify', exact: true } });
  await host('/wait', { target: { selector: '.annotation-row' }, state: 'visible' });
  await sleep(500);
  const shot = await host('/screenshot', { name: `verify-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'verify', path: shot.path });
  recordCoverage(runDir, 'verify-each-annotation', 'driven', 'entered Verify');
  output({ ok: true, command: 'verify', screenshot: shot.path });
}

async function commandDecide(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const verdict = typeof flags.verdict === 'string' ? flags.verdict : undefined;
  const label = { approve: 'Approve', reject: 'Reject', 'another-pass': 'Request another pass', supersede: 'Supersede', obsolete: 'Mark obsolete' }[verdict];
  if (!label) {
    fail(EXIT.usage, 'decide needs --verdict approve|reject|another-pass|supersede|obsolete.', 'Run `lever help` for the surface.');
  }
  const rowIndex = typeof flags.row === 'string' ? Number(flags.row) : 0;
  if (flags['dry-run']) {
    output({ dryRun: true, would: { verdict, rowIndex } });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { role: 'button', name: label, exact: true, nth: rowIndex } });
  await sleep(500);
  const snapshot = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
  const annotations = snapshot.json.annotations ?? [];
  const shot = await host('/screenshot', { name: `decide-${verdict}-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: `decide-${verdict}`, path: shot.path });
  recordCoverage(runDir, 'verify-each-annotation', 'driven', verdict);
  output({ ok: true, command: 'decide', verdict, states: annotations.map((annotation) => annotation.state), screenshot: shot.path });
}

async function commandChoose(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const node = typeof flags.node === 'string' ? flags.node : undefined;
  const target = typeof flags.target === 'string' ? flags.target : undefined;
  const index = typeof flags.index === 'string' ? Number(flags.index) : 0;
  if (!node) {
    fail(EXIT.usage, 'choose needs --node <nodeId> [--target <targetId>].', 'Read `lever state` for the candidates.');
  }
  if (flags['dry-run']) {
    output({ dryRun: true, would: { node, target, index } });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { selector: `input[type="radio"][value="${node}"]` } });
  await sleep(400);
  const shot = await host('/screenshot', { name: `choose-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'choose', path: shot.path });
  recordCoverage(runDir, 'resolution-and-honesty', 'driven', node);
  output({ ok: true, command: 'choose', node, target, screenshot: shot.path });
}

async function commandCompare(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const mode = flags.mode === 'before' ? 'before' : 'after';
  if (flags['dry-run']) {
    output({ dryRun: true, would: { compare: mode } });
    return;
  }
  const host = hostCall(secret);
  const label = mode === 'before' ? 'Before the change' : 'After the change';
  await host('/click', { target: { role: 'button', name: label, exact: true } });
  await sleep(500);
  const shot = await host('/screenshot', { name: `compare-${mode}-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: `compare-${mode}`, path: shot.path });
  output({ ok: true, command: 'compare', mode, screenshot: shot.path });
}

async function commandState(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const snapshot = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
  const status = await productGet(secret, `/api/sessions/${secret.sessionId}`);
  const agent = await productGet(secret, `/api/sessions/${secret.sessionId}/agent`);
  output({
    ok: true,
    command: 'state',
    sessionId: secret.sessionId,
    changed: status.json.changed ?? false,
    currentRevision: status.json.currentRevision ?? null,
    agent: agent.json,
    batches: snapshot.json.batches ?? [],
    annotations: (snapshot.json.annotations ?? []).map(safeAnnotation)
  });
}

function safeAnnotation(annotation) {
  return {
    annotationId: annotation.annotationId,
    state: annotation.state,
    note: annotation.note,
    order: annotation.order,
    reorderable: annotation.order,
    revisionRelation: annotation.revisionRelation,
    relationships: annotation.relationships,
    attachments: annotation.attachments,
    resolutions: annotation.resolutions,
    chosenCandidates: annotation.chosenCandidates,
    verification: annotation.verification ?? null,
    targets: (annotation.targets ?? []).map((target) => ({
      targetId: target.targetId,
      kind: target.kind,
      label: target.label,
      provenanceConfidence: target.provenanceConfidence,
      selectors: target.renderedGrounding?.selectors ?? []
    }))
  };
}

async function commandScreenshot(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const name = typeof flags.name === 'string' ? flags.name : `state-${Date.now()}`;
  const host = hostCall(secret);
  const shot = await host('/screenshot', { name });
  recordEvidence(runDir, { kind: 'screenshot', name, path: shot.path });
  output({ ok: true, command: 'screenshot', name, path: shot.path, bytes: shot.bytes });
}

async function commandSnapshot(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const name = typeof flags.name === 'string' ? flags.name : `state-${Date.now()}`;
  const host = hostCall(secret);
  const snap = await host('/snapshot', { name, ...(flags.frame === 'artifact' ? { frame: 'artifact' } : {}) });
  recordEvidence(runDir, { kind: 'accessibilitySnapshot', name, path: snap.path });
  output({ ok: true, command: 'snapshot', name, path: snap.path, bytes: snap.bytes });
}

async function commandRecord(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const name = typeof flags.name === 'string' ? flags.name : 'action';
  const host = hostCall(secret);
  const shot = await host('/screenshot', { name: `record-${name}-${Date.now()}` });
  const recordings = existsSync(join(runDir, 'evidence'))
    ? readdirSync(join(runDir, 'evidence')).filter((entry) => /^recording.*\.webm$/.test(entry))
    : [];
  const recording = recordings.length > 0 ? join(runDir, 'evidence', recordings[recordings.length - 1]) : null;
  recordEvidence(runDir, { kind: 'recording', name, path: recording ?? join(runDir, 'evidence', 'video') });
  recordEvidence(runDir, { kind: 'screenshot', name: `record-${name}`, path: shot.path });
  output({ ok: true, command: 'record', name, screenshot: shot.path, recording });
}

async function commandTrace(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const name = typeof flags.name === 'string' ? flags.name : 'trace';
  const host = hostCall(secret);
  const trace = await host('/trace', { name });
  recordEvidence(runDir, { kind: 'trace', name, path: trace.path });
  output({ ok: true, command: 'trace', name, path: trace.path, bytes: trace.bytes });
}

async function commandConsole(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const host = hostCall(secret);
  const collected = await host('/collect', {});
  recordEvidence(runDir, { kind: 'console', name: 'console', path: null, entries: collected.console.length });
  output({ ok: true, command: 'console', entries: collected.console, problems: collected.console.filter((entry) => entry.type === 'error' || entry.type === 'pageerror') });
}

async function commandNetwork(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const host = hostCall(secret);
  const collected = await host('/collect', {});
  recordEvidence(runDir, { kind: 'network', name: 'network', path: null, entries: collected.network.length });
  output({ ok: true, command: 'network', entries: collected.network });
}

async function commandWait(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const host = hostCall(secret);
  await host('/wait', {
    ...(flags.target ? { target: targetFromFlags(flags) } : {}),
    ...(flags.frame === 'artifact' ? { frame: 'artifact' } : {}),
    ...(flags.timeout ? { timeoutMs: Number(flags.timeout) } : {})
  });
  output({ ok: true, command: 'wait' });
}

async function commandSetup(flags) {
  if (flags['dry-run']) {
    output({ dryRun: true, would: { run: 'visual-intent setup', sandboxHome: join(RUN_ROOT, 'sandbox-home') } });
    return;
  }
  const home = join(RUN_ROOT, 'sandbox-home');
  mkdirSync(home, { recursive: true });
  const passthrough = [];
  for (const key of ['global', 'print-only', 'status', 'no-skill']) {
    if (flags[key]) passthrough.push(`--${key}`);
  }
  if (typeof flags.harness === 'string') passthrough.push('--harness', flags.harness);
  const runDir = flags.run ? resolveRun(flags.run) : undefined;
  const result = spawnSync(process.execPath, [join(REPO_ROOT, 'dist', 'cli.js'), 'setup', ...passthrough], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home }
  });
  if (runDir) {
    const sandboxed = join(runDir, 'evidence', 'setup-output.txt');
    mkdirSync(dirname(sandboxed), { recursive: true });
    writeFileSync(sandboxed, `${result.stdout}\n${result.stderr}`, 'utf8');
    recordEvidence(runDir, { kind: 'setupOutput', name: 'setup', path: sandboxed });
  }
  output({
    ok: result.status === 0,
    command: 'setup',
    exitCode: result.status,
    sandboxHome: home,
    stdout: result.stdout,
    stderr: result.stderr,
    version: environment().packageVersion
  });
  process.exit(result.status === 0 ? EXIT.ok : EXIT.precondition);
}

async function commandMcp(flags) {
  const tool = typeof flags.tool === 'string' ? flags.tool : undefined;
  if (!tool) {
    fail(EXIT.usage, 'mcp needs --tool <name>.', 'Run `lever help` for the surface.');
  }
  const args = typeof flags.args === 'string' ? JSON.parse(flags.args) : {};
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  const runDir = flags.run ? resolveRun(flags.run) : undefined;
  const dataDir = typeof flags['data-dir'] === 'string'
    ? resolve(flags['data-dir'])
    : runDir
      ? (readJson(secretPath(runDir), undefined)?.dataDir ?? join(runDir, 'data'))
      : join(RUN_ROOT, 'mcp-data', 'default');
  guardDataDir(dataDir);
  mkdirSync(dataDir, { recursive: true });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(REPO_ROOT, 'dist', 'mcp', 'stdio.js')],
    env: { ...process.env, VISUAL_INTENT_DATA_DIR: dataDir, VISUAL_INTENT_NO_OPEN: '1' }
  });
  const client = new Client({ name: 'lever', version: '0.0.0' });
  await client.connect(transport);
  const tools = await client.listTools();
  const result = await client.callTool({ name: tool, arguments: args });
  await transport.close();
  if (runDir) {
    recordEvidence(runDir, { kind: 'mcp', name: tool, path: null });
  }
  output({ ok: !result.isError, command: 'mcp', tool, dataDir, tools: tools.tools.map((entry) => entry.name), result });
}

function writeRunRecord(runDir) {
  const state = readState(runDir);
  writeJson(join(runDir, 'run.json'), {
    run: state.run,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt ?? null,
    outcome: state.outcome ?? 'aborted',
    status: state.status ?? 'unknown',
    environment: state.environment ?? null,
    launch: state.launch ?? null,
    coverage: state.coverage ?? { driven: [], mapped: [] },
    evidence: state.evidence ?? [],
    unreachable: state.unreachable ?? [],
    evidenceIntact: state.evidenceIntact ?? null
  });
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('--help') || argv[0] === 'help') {
    process.stdout.write(HELP);
    return;
  }
  const command = argv[0];
  const flags = parseArgs(argv.slice(1));
  const commands = {
    launch: commandLaunch,
    open: commandLaunch,
    health: commandHealth,
    session: commandSession,
    cleanup: commandCleanup,
    select: commandSelect,
    annotate: commandAnnotate,
    queue: commandQueue,
    reorder: commandReorder,
    send: commandSend,
    relate: commandRelate,
    attach: commandAttach,
    reload: commandReload,
    'reload-surface': commandReloadSurface,
    'restart-service': commandRestartService,
    'restart-browser': commandRestartBrowser,
    press: commandPress,
    attention: commandAttention,
    overflow: commandOverflow,
    review: commandReview,
    verify: commandVerify,
    decide: commandDecide,
    choose: commandChoose,
    compare: commandCompare,
    state: commandState,
    screenshot: commandScreenshot,
    snapshot: commandSnapshot,
    record: commandRecord,
    trace: commandTrace,
    console: commandConsole,
    network: commandNetwork,
    wait: commandWait,
    setup: commandSetup,
    mcp: commandMcp,
    coverage: commandCoverage,
    finish: commandFinish
  };
  const handler = commands[command];
  if (!handler) {
    fail(EXIT.usage, `Unknown command ${command}.`, 'Run `lever help` for the surface.');
  }
  try {
    await handler(flags);
  } catch (error) {
    fail(EXIT.precondition, error instanceof Error ? error.message : String(error), 'Run `lever health` before blaming the change.');
  } finally {
    const runRef = flags.run;
    if (runRef !== undefined) {
      const runDir = resolveRunQuiet(runRef);
      if (runDir && existsSync(join(runDir, 'state.json'))) {
        writeRunRecord(runDir);
      }
    } else if (existsSync(join(RUN_ROOT, 'latest'))) {
      const runDir = resolveRunQuiet(readFileSync(join(RUN_ROOT, 'latest'), 'utf8').trim());
      if (runDir && existsSync(join(runDir, 'state.json'))) {
        writeRunRecord(runDir);
      }
    }
  }
}

function resolveRunQuiet(runRef) {
  if (!runRef) return undefined;
  const direct = join(RUNS_DIR, runRef);
  if (existsSync(direct)) return direct;
  if (!existsSync(RUNS_DIR)) return undefined;
  const match = readdirSync(RUNS_DIR).find((entry) => entry === runRef || entry.endsWith(`-${runRef}`));
  return match ? join(RUNS_DIR, match) : undefined;
}

await main();
