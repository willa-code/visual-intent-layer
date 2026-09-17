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
  'captured-view',
  'decision-drawer',
  'agent-position',
  'session-and-overflow',
  'proxied-application',
  'accessibility-and-keyboard',
  'setup-and-detection',
  'mcp-agent-loop',
  'check-in',
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

  lever select --tool point --target <css> [--text <css>]
  lever select --tool box --from <css> --to <css>
  lever select --tool operate
  lever mode --to point|box|operate
  lever annotate --note <text>
  lever attach --file <path>
  lever queue
  lever reorder --from <index> --direction up|down
  lever send [--intent next-pass]
  lever amend --note <text> [--row <n>|--match <text>]
  lever stop
  lever reload
  lever reload-surface
  lever restart-service
  lever restart-browser
  lever review
  lever verify
  lever decide --verdict approve|reject|not-fixed|obsolete [--row <n>|--match <text>]
  lever repoint --row <n> --target <css>
  lever compare --mode before|after [--row <n>]
  lever closed-rows
  lever measure
  lever unreachable --command <text> --precondition <text>

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
  lever coverage --driven <feature-id> [--sub <id,id>] [--detail <text>] [--run <name>]
  lever press --key <key> [--target <css>] [--frame artifact]
  lever attention
  lever overflow --item <label>
  lever theme --to auto|light|dark

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
    if (packageNameAt(dir) === 'visual-intent-layer') {
      return dir;
    }
    dir = dirname(dir);
  }
  return process.cwd();
}

function packageNameAt(dir) {
  const pkg = join(dir, 'package.json');
  if (!existsSync(pkg)) {
    return undefined;
  }
  return tryJson(readFileSync(pkg, 'utf8'))?.name;
}

function tryJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function signalProcess(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'run';
}

function sameColour(hex, rgb) {
  if (typeof hex !== 'string' || typeof rgb !== 'string') {
    return false;
  }
  const parsed = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const channels = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(rgb.trim());
  if (!parsed || !channels) {
    return false;
  }
  const value = parsed[1].toLowerCase();
  const expected = [value.slice(0, 2), value.slice(2, 4), value.slice(4, 6)].map((part) => parseInt(part, 16));
  const actual = [Number(channels[1]), Number(channels[2]), Number(channels[3])];
  return expected.every((channel, index) => channel === actual[index]);
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
  return tryJson(readFileSync(file, 'utf8')) ?? fallback;
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

function runName(runDir) {
  return runDir.split(/[/\\]/).pop();
}

function persistSecret(runDir, secret) {
  writeJson(secretPath(runDir), secret);
  chmodSync(secretPath(runDir), 0o600);
}

function adoptProduct(secret, child, record) {
  secret.productPid = child.pid;
  secret.sessionId = record.sessionId;
  secret.reviewUrl = record.reviewUrl;
  secret.baseUrl = record.baseUrl;
  secret.capability = new URL(record.reviewUrl).searchParams.get('cap');
  persistSecret(secret.runDir, secret);
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

function mutateState(runDir, mutate, options = {}) {
  const file = join(runDir, 'state.json');
  if (!existsSync(file)) return;
  const state = readJson(file, {});
  mutate(state);
  writeJson(file, state);
  writeReport(runDir);
  if (options.runRecord) {
    writeRunRecord(runDir);
  }
}

function recordUnreachableQuiet(runDir, command, precondition) {
  mutateState(
    runDir,
    (state) => {
      state.unreachable = state.unreachable ?? [];
      state.unreachable.push({ command, precondition, at: new Date().toISOString() });
    },
    { runRecord: true }
  );
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
        const record = tryJson(line);
        if (record) {
          clearTimeout(timer);
          child.stdout.removeAllListeners('data');
          child.stdout.destroy();
          child.unref();
          resolvePromise({ child, record });
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

async function productPost(secret, path, body) {
  const url = new URL(path, secret.baseUrl);
  url.searchParams.set('cap', secret.capability);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'x-session-cap': secret.capability, 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {})
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { body: text };
  }
  return { status: response.status, json };
}

async function waitForAnnotations(secret, predicate, description, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let last = [];
  while (Date.now() < deadline) {
    const snapshot = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
    last = snapshot.json.annotations ?? [];
    if (last.some(predicate)) {
      return last;
    }
    await sleep(150);
  }
  fail(EXIT.unreachable, `Stored state never showed ${description}.`, 'Read `lever state`, then retry after a `lever health` check.');
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
  const app = appUrl(flags);
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
  adoptProduct(secret, child, record);
  writeJson(lockPath(dataDir), { pid: child.pid, runDir, dataDir, startedAt: new Date().toISOString() });
  const host = await spawnHost(secret, headless);
  secret.hostPid = host.pid;
  secret.hostEndpoint = host.endpoint;
  persistSecret(runDir, secret);
  await callHost(host.endpoint, 'POST', '/navigate', { url: secret.reviewUrl });
  const environmentRecord = environment();
  writeJson(join(runDir, 'state.json'), {
    run: runName(runDir),
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
    coverage: { driven: [{ id: 'open-artifact', detail: 'launched and rendered the Artifact', subFeatures: ['open-html', 'open-identity', 'open-isolation', 'open-faithful', 'open-health'], at: new Date().toISOString() }], mapped: MAPPED_FEATURES.map((id) => ({ id })) },
    unreachable: []
  });
  writeReport(runDir);
  writeFileSync(join(RUN_ROOT, 'latest'), runName(runDir), 'utf8');
  output({
    ok: true,
    command: 'launch',
    run: runName(runDir),
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

function appUrl(flags) {
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
    run: runName(runDir),
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
  state.evidenceIntact = evidence.intact;
  writeJson(join(runDir, 'state.json'), state);
  writeReport(runDir);
  output({
    ok: true,
    command: 'cleanup',
    run: runName(runDir),
    evidenceIntact: evidence.intact,
    evidence,
    processRemoved: { productPid: secret.productPid, hostPid: secret.hostPid },
    dataDirRemoved: secret.dataDir
  });
}

async function terminate(pid) {
  if (!pid || !pidAlive(pid)) return;
  if (!signalProcess(pid, 'SIGTERM')) {
    return;
  }
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && pidAlive(pid)) {
    await sleep(100);
  }
  if (pidAlive(pid)) {
    signalProcess(pid, 'SIGKILL');
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
    `- Driven: ${(state.coverage?.driven ?? []).map((entry) => `${entry.id}${entry.subFeatures?.length ? ` [${entry.subFeatures.join(', ')}]` : ''}`).join(', ') || 'none recorded'}`,
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
  mutateState(runDir, (state) => {
    state.evidence = state.evidence ?? [];
    state.evidence.push({ at: new Date().toISOString(), ...entry });
  });
}

function recordCoverage(runDir, id, action, detail, subFeatures = []) {
  mutateState(runDir, (state) => {
    state.coverage = state.coverage ?? { driven: [], mapped: [] };
    if (action === 'driven') {
      const existing = state.coverage.driven.find((entry) => entry.id === id);
      if (existing) {
        existing.subFeatures = [...new Set([...(existing.subFeatures ?? []), ...subFeatures])];
        if (detail) {
          existing.detail = detail;
        }
      } else {
        state.coverage.driven.push({ id, detail: detail ?? null, subFeatures, at: new Date().toISOString() });
      }
    }
    if (action === 'mapped' && !state.coverage.mapped.some((entry) => entry.id === id)) {
      state.coverage.mapped.push({ id, detail: detail ?? null });
    }
  });
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

const MODES = ['point', 'box', 'operate'];

async function armTile(host, mode) {
  const tileName = mode === 'point' ? 'Point at things' : 'Box an area';
  const armedName = `${tileName}, armed`;
  const alreadyArmed = (await host('/count', { target: { role: 'button', name: armedName } })).count > 0;
  if (!alreadyArmed) {
    await host('/click', { target: { role: 'button', name: tileName, exact: false } });
  }
}

async function commandSelect(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const tool = typeof flags.tool === 'string' ? flags.tool : 'point';
  if (!MODES.includes(tool)) {
    fail(EXIT.usage, `Unsupported mode ${tool}.`, 'Use point, box or operate.');
  }
  const host = hostCall(secret);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { tool, target: targetFromFlags(flags), click: tool === 'point' } });
    return;
  }
  if (tool === 'operate') {
    await host('/press', { key: 'v' });
    await sleep(200);
    output({ ok: true, command: 'select', tool, operating: true });
    return;
  }
  await armTile(host, tool);
  if (tool === 'point') {
    if (typeof flags.text === 'string') {
      await host('/select-text', { target: selector(flags.text), frame: 'artifact' });
    } else {
      await host('/click', {
        target: targetFromFlags(flags),
        frame: 'artifact'
      });
    }
  } else {
    if (typeof flags.from !== 'string' || typeof flags.to !== 'string') {
      fail(EXIT.usage, 'box selection needs --from <css> and --to <css>.', 'Run `lever help` for the surface.');
    }
    await host('/drag-box', { from: selector(flags.from), to: selector(flags.to), frame: 'artifact' });
  }
  await host('/wait', { target: { selector: '.anchored-card' }, state: 'visible' });
  const shot = await host('/screenshot', { name: `select-${tool}-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: `select-${tool}`, path: shot.path });
  await host('/snapshot', { name: `select-${tool}-${Date.now()}` });
  recordCoverage(runDir, 'annotate-and-send', 'driven', `selected with the ${tool} mode`, [`select-${tool}`]);
  output({ ok: true, command: 'select', tool, screenshot: shot.path });
}

async function commandMode(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const to = typeof flags.to === 'string' ? flags.to : 'operate';
  if (!MODES.includes(to)) {
    fail(EXIT.usage, `Unsupported mode ${to}.`, 'Use point, box or operate.');
  }
  if (flags['dry-run']) {
    output({ dryRun: true, would: { mode: to } });
    return;
  }
  const host = hostCall(secret);
  if (to === 'operate') {
    await host('/press', { key: 'v' });
  } else {
    await armTile(host, to);
  }
  await sleep(200);
  recordCoverage(runDir, 'accessibility-and-keyboard', 'driven', `armed ${to}`, [`mode-${to}`]);
  output({ ok: true, command: 'mode', mode: to });
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
  await waitForAnnotations(secret, (annotation) => annotation.note === flags.note, `the note "${flags.note}"`);
  const shot = await host('/screenshot', { name: `annotate-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'annotate', path: shot.path });
  recordCoverage(runDir, 'annotate-and-send', 'driven', 'wrote a note onto a selected target', ['annotate-note']);
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
  await host('/wait', { target: { selector: '.annotation-row' }, state: 'visible' });
  const shot = await host('/screenshot', { name: `queue-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'queue', path: shot.path });
  recordCoverage(runDir, 'annotate-and-send', 'driven', 'queued an Annotation', ['queue-add']);
  output({ ok: true, command: 'queue', screenshot: shot.path });
}

async function commandSend(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const intent = typeof flags.intent === 'string' ? flags.intent : 'next-pass';
  if (intent !== 'next-pass') {
    fail(
      EXIT.usage,
      `The one send action always delivers Next-Pass Intent; ${intent} is a different act.`,
      'Use `lever amend` for Steering Intent or `lever stop` for Review Interruption.'
    );
  }
  if (flags['dry-run']) {
    const before = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
    output({ dryRun: true, would: { intent, deliver: true }, annotationStates: before.json.annotations?.map((a) => a.state) ?? [] });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { role: 'button', name: 'Send the queue' } });
  let delivered = false;
  let deliveredIntent;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const snapshot = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
    const annotations = snapshot.json.annotations ?? [];
    if (annotations.some((annotation) => annotation.state === 'delivered' || annotation.state === 'resolved')) {
      delivered = true;
      deliveredIntent = (snapshot.json.passes ?? []).at(-1)?.intent;
      break;
    }
    await sleep(200);
  }
  const shot = await host('/screenshot', { name: `send-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: `send-${intent}`, path: shot.path });
  if (!delivered) {
    fail(EXIT.unreachable, 'The Annotation Queue did not reach a delivered state.', 'Read `lever state` and retry after a `lever health` check.');
  }
  if (deliveredIntent !== intent) {
    fail(EXIT.unreachable, `The queue was delivered as ${deliveredIntent} rather than ${intent}.`, 'Read `lever state` and retry the send.');
  }
  recordCoverage(runDir, 'annotate-and-send', 'driven', `sent with ${intent}`, [`send-${intent}`]);
  output({ ok: true, command: 'send', intent, delivered: true, screenshot: shot.path });
}

async function commandAmend(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (typeof flags.note !== 'string') {
    fail(EXIT.usage, 'amend needs --note <text>.', 'Run `lever help` for the surface.');
  }
  if (flags['dry-run']) {
    output({ dryRun: true, would: { amend: flags.note } });
    return;
  }
  const host = hostCall(secret);
  const rowIndex = typeof flags.row === 'string' ? Number(flags.row) : 0;
  const match = typeof flags.match === 'string' ? flags.match : undefined;
  if (match) {
    await host('/click', {
      target: { selector: `.annotation-row:has-text(${JSON.stringify(match)}) [data-action="amend"]` }
    });
  } else {
    await host('/click', { target: { role: 'button', name: 'Amend', exact: true, nth: rowIndex } });
  }
  await host('/wait', { target: { selector: '.amend-editor textarea' }, state: 'visible' });
  await host('/fill', { target: { selector: '.amend-editor textarea' }, value: flags.note });
  await host('/click', { target: { role: 'button', name: 'Deliver the amendment', exact: true } });
  let replaced = false;
  let steering = false;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const snapshot = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
    const annotations = snapshot.json.annotations ?? [];
    replaced = annotations.some((annotation) => annotation.state === 'replaced' && annotation.replacedBy);
    steering = (snapshot.json.passes ?? []).some((pass) => pass.intent === 'steering');
    if (replaced && steering) {
      break;
    }
    await sleep(200);
  }
  const shot = await host('/screenshot', { name: `amend-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'amend', path: shot.path });
  if (!replaced || !steering) {
    fail(EXIT.unreachable, 'Amending did not replace the original with a Steering Intent delivery.', 'Read `lever state` to see what the amendment did.');
  }
  recordCoverage(runDir, 'annotate-and-send', 'driven', 'replaced a sent Annotation', ['amend-replace', 'amend-steering']);
  output({ ok: true, command: 'amend', note: flags.note, replaced, steering, screenshot: shot.path });
}

async function commandStop(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { requestInterruption: true } });
    return;
  }
  const host = hostCall(secret);
  let offered = (await host('/count', { target: { role: 'button', name: 'Ask the agent to stop' } })).count > 0;
  if (!offered) {
    const snapshot = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
    const lastPass = (snapshot.json.passes ?? []).at(-1);
    const lastBatch = lastPass;
    if (lastBatch) {
      await productPost(secret, `/api/intents/${encodeURIComponent(lastBatch.envelopeId)}/acknowledge`, { agentId: 'lever' });
    }
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline && !offered) {
      await sleep(300);
      offered = (await host('/count', { target: { role: 'button', name: 'Ask the agent to stop' } })).count > 0;
    }
  }
  if (!offered) {
    fail(EXIT.unreachable, 'The stop action is not offered.', 'It is offered only while the agent is working or has acknowledged an Annotation.');
  }
  await host('/click', { target: { role: 'button', name: 'Ask the agent to stop' } });
  let requested = false;
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const agent = await productGet(secret, `/api/sessions/${secret.sessionId}/agent`);
    if (agent.json.pendingInterruption) {
      requested = true;
      break;
    }
    await sleep(200);
  }
  const shot = await host('/screenshot', { name: `stop-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'stop', path: shot.path });
  if (!requested) {
    fail(EXIT.unreachable, 'The stop request was not recorded.', 'The action is offered only while the agent is working or has acknowledged an Annotation.');
  }
  recordCoverage(runDir, 'agent-position', 'driven', 'asked the agent to stop', ['stop-request']);
  output({ ok: true, command: 'stop', requested: true, screenshot: shot.path });
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
  recordCoverage(runDir, 'attachments', 'driven', 'attached a reference image', ['attach-pick', 'attach-stored']);
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
  recordCoverage(runDir, 'resolution-and-honesty', 'driven', 'reloaded the changed Artifact', ['resolution-reload']);
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
  child.unref();
  adoptProduct(secret, child, record);
  writeJson(lockPath(secret.dataDir), { pid: child.pid, runDir, dataDir: secret.dataDir, startedAt: new Date().toISOString() });
  await callHost(secret.hostEndpoint, 'POST', '/navigate', { url: secret.reviewUrl });
  const shot = await hostCall(secret)('/screenshot', { name: `restart-service-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'restart-service', path: shot.path });
  recordCoverage(runDir, 'never-discard-writing', 'driven', 'restarted the service', ['survive-service-restart']);
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
  recordCoverage(runDir, 'never-discard-writing', 'driven', 'restarted the browser', ['survive-browser-restart']);
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
  await host('/wait', { target: { selector: '.rail' }, state: 'visible' });
  await sleep(600);
  const shot = await host('/screenshot', { name: `reload-surface-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'reload-surface', path: shot.path });
  recordCoverage(runDir, 'never-discard-writing', 'driven', 'reloaded the Review Surface', ['survive-reload']);
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

async function commandTheme(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const to = typeof flags.to === 'string' ? flags.to : undefined;
  const label = { auto: 'Match the platform', light: 'Light', dark: 'Dark' }[to];
  if (!label) {
    fail(EXIT.usage, 'theme needs --to auto|light|dark.', 'Run `lever help` for the surface.');
  }
  if (flags['dry-run']) {
    output({ dryRun: true, would: { theme: to } });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { role: 'button', name: 'More actions' } });
  await host('/click', { target: { role: 'radio', name: label } });
  await host('/press', { key: 'Escape' });
  await sleep(300);
  const measured = await host('/measure');
  const applied = measured.material?.theme ?? 'auto';
  if (applied !== to) {
    fail(
      EXIT.unreachable,
      `The theme control did not take effect: asked for ${to}, the surface reports ${applied}.`,
      'Run `lever measure` and inspect the theme control.'
    );
  }
  const shot = await host('/screenshot', { name: `theme-${to}-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: `theme-${to}`, path: shot.path });
  recordCoverage(runDir, 'session-and-overflow', 'driven', `chose the ${to} theme`, ['overflow-theme']);
  output({ ok: true, command: 'theme', theme: to, applied, material: measured.material, screenshot: shot.path });
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
  recordCoverage(runDir, 'annotate-and-send', 'driven', `reordered ${direction.toLowerCase()}`, ['queue-reorder']);
  output({ ok: true, command: 'reorder', moved: direction, order });
}

async function commandUnreachable(flags) {
  const runDir = resolveRun(flags.run);
  const command = typeof flags.command === 'string' ? flags.command : undefined;
  const precondition = typeof flags.precondition === 'string' ? flags.precondition : undefined;
  if (!command || !precondition) {
    fail(EXIT.usage, 'unreachable needs --command <text> and --precondition <text>.', 'Run `lever help` for the surface.');
  }
  recordUnreachableQuiet(runDir, command, precondition);
  output({ ok: false, command: 'unreachable', unreachable: { command, precondition } });
  process.exit(EXIT.unreachable);
}

async function commandCoverage(flags) {
  const runDir = resolveRun(flags.run);
  const id = typeof flags.driven === 'string' ? flags.driven : undefined;
  if (!id) {
    fail(EXIT.usage, 'coverage needs --driven <feature-id>.', 'Use the id from the feature map index.');
  }
  const detail = typeof flags.detail === 'string' ? flags.detail : null;
  const subFeatures = typeof flags.sub === 'string' ? flags.sub.split(',').map((entry) => entry.trim()).filter(Boolean) : [];
  recordCoverage(runDir, id, 'driven', detail, subFeatures);
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
  writeFileSync(join(RUN_ROOT, 'latest'), runName(runDir), 'utf8');
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
  await host('/press', { key: 'v' });
  await host('/wait', { target: { selector: '.rail' }, state: 'visible' });
  await sleep(300);
  output({ ok: true, command: 'review', operating: true });
}

async function commandVerify(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { waitForRows: true } });
    return;
  }
  const host = hostCall(secret);
  await host('/wait', { target: { selector: '.annotation-row' }, state: 'visible' });
  await sleep(500);
  const shot = await host('/screenshot', { name: `verify-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'verify', path: shot.path });
  recordCoverage(runDir, 'verify-each-annotation', 'driven', 'judged a result where it sits', ['verify-in-place']);
  output({ ok: true, command: 'verify', screenshot: shot.path });
}

async function commandDecide(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const verdict = typeof flags.verdict === 'string' ? flags.verdict : undefined;
  const label = { approve: 'Approve', reject: 'Reject', 'not-fixed': 'Not Fixed', obsolete: 'Mark obsolete' }[verdict];
  if (!label) {
    fail(EXIT.usage, 'decide needs --verdict approve|reject|not-fixed|obsolete.', 'A Replacement is reached through `lever amend`, not as a row verdict.');
  }
  const behindOverflow = verdict === 'not-fixed' || verdict === 'obsolete';
  const rowIndex = typeof flags.row === 'string' ? Number(flags.row) : 0;
  const match = typeof flags.match === 'string' ? flags.match : undefined;
  if (flags['dry-run']) {
    output({ dryRun: true, would: { verdict, rowIndex, match } });
    return;
  }
  const host = hostCall(secret);
  if (behindOverflow) {
    const rowScope = match ? `.annotation-row:has-text(${JSON.stringify(match)})` : '.annotation-row';
    await host('/click', { target: { selector: `${rowScope} .verdict-overflow summary`, nth: match ? 0 : rowIndex } });
  }
  if (match) {
    await host('/click', {
      target: { selector: `.annotation-row:has-text(${JSON.stringify(match)}) [data-verdict="${verdict}"]` }
    });
  } else {
    await host('/click', { target: { selector: `.annotation-row [data-verdict="${verdict}"]`, nth: rowIndex } });
  }
  const expected = { approve: 'verified', reject: 'rejected', 'not-fixed': 'not-fixed', obsolete: 'obsolete' }[verdict];
  const deadline = Date.now() + 10000;
  let annotations = [];
  let landed = false;
  while (Date.now() < deadline) {
    const snapshot = await productGet(secret, `/api/sessions/${secret.sessionId}/annotations`);
    annotations = snapshot.json.annotations ?? [];
    const target = match
      ? annotations.find((annotation) => String(annotation.note ?? '').includes(match))
      : annotations[rowIndex];
    if (target?.state === expected) {
      landed = true;
      break;
    }
    await sleep(150);
  }
  const shot = await host('/screenshot', { name: `decide-${verdict}-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: `decide-${verdict}`, path: shot.path });
  if (!landed) {
    fail(EXIT.unreachable, `The ${verdict} verdict did not land on row ${rowIndex}.`, 'The decision may be blocked; read `lever state` for the refusal reason.');
  }
  recordCoverage(runDir, 'verify-each-annotation', 'driven', verdict, [`verify-${verdict}`]);
  output({ ok: true, command: 'decide', verdict, states: annotations.map((annotation) => annotation.state), screenshot: shot.path });
}

async function commandRepoint(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const target = typeof flags.target === 'string' ? flags.target : undefined;
  const rowIndex = typeof flags.row === 'string' ? Number(flags.row) : 0;
  if (!target) {
    fail(EXIT.usage, 'repoint needs --target <css>.', 'Point at the target that should replace the lost one.');
  }
  if (flags['dry-run']) {
    output({ dryRun: true, would: { repoint: target, rowIndex } });
    return;
  }
  const host = hostCall(secret);
  await host('/click', { target: { selector: '[data-action="repoint"]', nth: rowIndex } });
  await host('/click', { target: { selector: target }, frame: 'artifact' });
  await waitForAnnotations(
    secret,
    (annotation) =>
      (annotation.targets ?? []).some((entry) =>
        (entry.renderedGrounding?.selectors ?? []).some((selector) => selector.includes(target.replace(/^[.#]/, '')))
      ),
    `the re-pointed Annotation to carry ${target}`
  );
  const shot = await host('/screenshot', { name: `repoint-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'repoint', path: shot.path });
  recordCoverage(runDir, 'resolution-and-honesty', 'driven', target, ['resolution-repoint']);
  output({ ok: true, command: 'repoint', target, row: rowIndex, screenshot: shot.path });
}

async function commandMeasure(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { measure: ['rail', 'island', 'pointer-events'] } });
    return;
  }
  const host = hostCall(secret);
  const measured = await host('/measure');
  const path = join(runDir, 'evidence', `measure-${Date.now()}.json`);
  writeJson(path, measured);
  recordEvidence(runDir, { kind: 'measurement', name: 'rail-and-island', path });
  recordCoverage(runDir, 'accessibility-and-keyboard', 'driven', `measured rail ${measured.rail?.width}px and tiles`, [
    'rail-legibility',
    'island-pointer-events',
    'tile-minimum-size'
  ]);
  const problems = [];
  if (measured.railHeadOverflow) problems.push('the rail head overflows its fixed width');
  if (measured.railHorizontalOverflow) problems.push('the rail list scrolls horizontally');
  if (measured.smallestTile < 24) problems.push(`a mode tile is ${measured.smallestTile}px, below the 24px floor`);
  if (!measured.islandReceivesPointerEvents) problems.push('the island did not receive the pointer over the live iframe');
  const material = measured.material ?? {};
  const tokens = material.tokens ?? {};
  if (!sameColour(tokens.canvas, material.railBackground)) {
    problems.push(`the rail is ${material.railBackground} rather than the canvas primitive ${tokens.canvas}`);
  }
  if (!sameColour(tokens.surfaceSunken, material.stageBackground)) {
    problems.push(`the stage is ${material.stageBackground} rather than the sunken surface ${tokens.surfaceSunken}`);
  }
  if (!sameColour('#ffffff', material.artifactBackground)) {
    problems.push(`the artifact is served on ${material.artifactBackground} rather than its own white`);
  }
  if (sameColour(tokens.canvas, tokens.surface)) {
    problems.push('canvas and surface resolve to the same colour, so the tool and the work are one plane');
  }
  const armedTiles = (measured.tiles ?? []).filter((tile) => tile.armed);
  const unarmedTiles = (measured.tiles ?? []).filter((tile) => !tile.armed);
  if (armedTiles.some((tile) => !tile.filledGlyph)) problems.push('an armed tile does not render the filled glyph');
  if (unarmedTiles.some((tile) => tile.filledGlyph)) problems.push('an unarmed tile renders the filled glyph');
  output({ ok: problems.length === 0, command: 'measure', measured, problems, path });
}

async function commandCompare(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  const mode = flags.mode === 'before' ? 'before' : 'after';
  const requestedRow = typeof flags.row === 'string' ? Number(flags.row) : undefined;
  if (flags['dry-run']) {
    output({ dryRun: true, would: { compare: mode, row: requestedRow ?? 'first row with a result' } });
    return;
  }
  const host = hostCall(secret);
  if (requestedRow === undefined) {
    await host('/click', {
      target: { selector: '.annotation-row:has(.annotation-row__result-revision) .annotation-row__note' }
    });
  } else {
    await host('/click', { target: { selector: '.annotation-row__note', nth: requestedRow } });
  }
  const comparison = await host('/count', { target: { selector: '.before-after' } });
  if (comparison.count === 0) {
    fail(
      EXIT.unreachable,
      'The selected row has nothing to compare: it has no result, or its result came from the revision it was written against.',
      'Change the artifact under review, reload it, then select a row whose target re-resolved against the new revision, or omit --row to let the Lever pick the first row with a result.'
    );
  }
  const label = mode === 'before' ? 'Before (' : 'After (';
  await host('/click', { target: { role: 'button', name: label, exact: false, nth: 0 } });
  await sleep(500);
  const shot = await host('/screenshot', { name: `compare-${mode}-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: `compare-${mode}`, path: shot.path });
  recordCoverage(runDir, 'resolution-and-honesty', 'driven', `compared a row ${mode}`, [`compare-${mode}-row`]);
  output({ ok: true, command: 'compare', mode, row: requestedRow ?? 'first-with-result', screenshot: shot.path });
}

async function commandClosedRows(flags) {
  const runDir = resolveRun(flags.run);
  const secret = await assertHealthy(runDir);
  if (flags['dry-run']) {
    output({ dryRun: true, would: { toggleClosed: true } });
    return;
  }
  const host = hostCall(secret);
  const hidden = await host('/count', { target: { selector: '.annotation-list .annotation-row' } });
  await host('/click', { target: { selector: 'button[data-toggle="closed"]' } });
  await sleep(300);
  const shown = await host('/count', { target: { selector: '.annotation-list .annotation-row' } });
  const shot = await host('/screenshot', { name: `closed-rows-${Date.now()}` });
  recordEvidence(runDir, { kind: 'screenshot', name: 'closed-rows', path: shot.path });
  recordCoverage(runDir, 'decision-drawer', 'driven', 'toggled closed rows', ['closed-toggle']);
  output({ ok: true, command: 'closed-rows', before: hidden.count, after: shown.count, screenshot: shot.path });
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
    adoptedRevision: status.json.adoptedRevision ?? null,
    revisionBasis: status.json.revisionBasis ?? null,
    agent: agent.json,
    passes: snapshot.json.passes ?? [],
    annotations: (snapshot.json.annotations ?? []).map(safeAnnotation)
  });
}

function safeAnnotation(annotation) {
  return {
    annotationId: annotation.annotationId,
    state: annotation.state,
    note: annotation.note,
    order: annotation.order,
    writtenRevision: annotation.writtenRevision ?? null,
    revisionRelation: annotation.revisionRelation,
    relationships: annotation.relationships,
    attachments: annotation.attachments,
    resolutions: annotation.resolutions,
    verification: annotation.verification ?? null,
    replaces: annotation.replaces ?? null,
    replacedBy: annotation.replacedBy ?? null,
    passId: annotation.passId ?? null,
    resolvedRevision: annotation.resolvedRevision ?? null,
    targets: (annotation.targets ?? []).map((target) => ({
      targetId: target.targetId,
      kind: target.kind,
      label: target.label,
      provenanceConfidence: target.provenanceConfidence,
      selectors: target.renderedGrounding?.selectors ?? [],
      ...(target.runtimeState ? { runtimeState: target.runtimeState } : {}),
      ...(target.sourceProvenance ? { sourceProvenance: target.sourceProvenance } : {})
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
  const recordingPending = recording === null;
  const willFinalizeAt = join(runDir, 'evidence', 'recording.webm');
  recordEvidence(runDir, { kind: 'recording', name, path: recording ?? willFinalizeAt });
  recordEvidence(runDir, { kind: 'screenshot', name: `record-${name}`, path: shot.path });
  output({ ok: true, command: 'record', name, screenshot: shot.path, recording, recordingPending, willFinalizeAt });
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
    mode: commandMode,
    annotate: commandAnnotate,
    queue: commandQueue,
    reorder: commandReorder,
    send: commandSend,
    amend: commandAmend,
    stop: commandStop,
    attach: commandAttach,
    reload: commandReload,
    'reload-surface': commandReloadSurface,
    'restart-service': commandRestartService,
    'restart-browser': commandRestartBrowser,
    press: commandPress,
    attention: commandAttention,
    overflow: commandOverflow,
    theme: commandTheme,
    review: commandReview,
    verify: commandVerify,
    decide: commandDecide,
    repoint: commandRepoint,
    compare: commandCompare,
    'closed-rows': commandClosedRows,
    measure: commandMeasure,
    unreachable: commandUnreachable,
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
