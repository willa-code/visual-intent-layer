import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  HARNESSES,
  claudeUserStatePath,
  codexHome,
  describeCheckedEvidence,
  detectHarnessPresence,
  opencodeConfigDir,
  piAgentDir,
  resolveCommand,
  type Harness,
  type HarnessPresence,
  type SetupEnvironment
} from './harness-registry.js';

export const SERVER_NAME = 'visual-intent-layer';
export const SKILL_DIR = 'visual-intent';

export type Scope = 'project' | 'global';
export type Transport = { command: string; args: string[] };

export type CommandResult = { status: number | null };
export type CommandRunner = (command: string, args: string[]) => CommandResult;

export type SetupOptions = {
  packageDir: string;
  homeDir: string;
  projectDir: string;
  global: boolean;
  printOnly: boolean;
  withSkill: boolean;
  harnesses?: Harness[];
  pathEnv?: string;
  env?: SetupEnvironment;
  runCommand?: CommandRunner;
};

export type SetupAction =
  | 'wrote'
  | 'repaired'
  | 'skipped'
  | 'delegated'
  | 'manual'
  | 'refused';

export type SetupOutcome = {
  harnesses: Harness[];
  action: SetupAction;
  target: string;
  detail?: string;
  instructions?: string;
};

export type FileDisposition = 'write' | 'repair' | 'current' | 'manual' | 'refuse';
export type ExecDisposition = 'delegate' | 'current' | 'manual';

export type FileTarget = {
  kind: 'file';
  harnesses: Harness[];
  path: string;
  content: string;
  disposition: FileDisposition;
  diff?: string;
  reason?: string;
  snippet?: string;
  instructions?: string;
};

export type ExecTarget = {
  kind: 'exec';
  harnesses: Harness[];
  command: string;
  args: string[];
  disposition: ExecDisposition;
  diff?: string;
  reason?: string;
  snippet?: string;
  instructions?: string;
};

export type SkillTarget = {
  kind: 'skill';
  harnesses: Harness[];
  source: string;
  path: string;
};

export type SetupTarget = FileTarget | ExecTarget | SkillTarget;

export type SetupPlan = {
  scope: Scope;
  version: string;
  transport: Transport;
  presence: HarnessPresence[];
  harnesses: Harness[];
  filtered: boolean;
  targets: SetupTarget[];
  notes: string[];
};

export type ApplyResult = {
  outcomes: SetupOutcome[];
};

export function packageVersion(packageDir: string): string {
  try {
    const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as {
      version?: unknown;
    };
    return typeof manifest.version === 'string' && manifest.version.length > 0
      ? manifest.version
      : 'latest';
  } catch {
    return 'latest';
  }
}

function pathEnvOf(options: Pick<SetupOptions, 'pathEnv' | 'env'>): string | undefined {
  return options.pathEnv ?? (options.env ?? process.env)['PATH'];
}

export function selectTransport(
  options: Pick<SetupOptions, 'packageDir' | 'pathEnv' | 'env'>
): Transport {
  if (resolveCommand('visual-intent', pathEnvOf(options)) !== undefined) {
    return { command: 'visual-intent', args: ['mcp'] };
  }
  return {
    command: 'npx',
    args: [
      '-y',
      '--package',
      `visual-intent-layer@${packageVersion(options.packageDir)}`,
      'visual-intent-mcp'
    ]
  };
}

export function serverEntry(transport: Transport): Record<string, unknown> {
  return { [SERVER_NAME]: { command: transport.command, args: [...transport.args] } };
}

export function defaultRunner(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  return { status: result.status };
}

export function parseHarnessFilter(values: string[]): Harness[] {
  for (const value of values) {
    if (!HARNESSES.includes(value as Harness)) {
      throw new Error(`Unknown harness: ${value}. Expected one of ${HARNESSES.join(', ')}.`);
    }
  }
  return canonicalHarnesses(values);
}

function canonicalHarnesses(values: Iterable<string>): Harness[] {
  const requested = new Set(values);
  return HARNESSES.filter((harness) => requested.has(harness));
}

function commandLine(command: string, args: string[]): string {
  return [command, ...args].join(' ');
}

function effectiveHarnesses(options: SetupOptions, presence: HarnessPresence[]): Harness[] {
  if (options.harnesses !== undefined) {
    return canonicalHarnesses(options.harnesses);
  }
  const detected = presence.filter((item) => item.present).map((item) => item.harness);
  if (detected.length > 0) {
    return detected;
  }
  return options.global ? [] : ['pi'];
}

function inScope(harnesses: Harness[], readers: Harness[]): Harness[] {
  return harnesses.filter((harness) => readers.includes(harness));
}

function sharedConfigPath(options: SetupOptions): string {
  return options.global
    ? join(options.homeDir, '.config', 'mcp', 'mcp.json')
    : join(options.projectDir, '.mcp.json');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function equalEntries(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => equalEntries(item, right[index]))
    );
  }
  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) {
      return false;
    }
    const keys = Object.keys(left);
    return (
      keys.length === Object.keys(right).length &&
      keys.every((key) => Object.hasOwn(right, key) && equalEntries(left[key], right[key]))
    );
  }
  return left === right;
}

function describeEntryDiff(existing: unknown, intended: unknown, label: string): string {
  if (!isRecord(existing) || !isRecord(intended)) {
    return `${label} differs`;
  }
  const fields = [...new Set([...Object.keys(existing), ...Object.keys(intended)])];
  const differing = fields.filter((field) => !equalEntries(existing[field], intended[field]));
  return differing.length === 0 ? `${label} differs` : `${label} differs in ${differing.join(', ')}`;
}

function parseMcpConfig(existingJson: string): {
  root: Record<string, unknown>;
  servers: Record<string, unknown>;
} {
  if (existingJson.trim().length === 0) {
    return { root: {}, servers: {} };
  }
  let root: unknown;
  try {
    root = JSON.parse(existingJson);
  } catch {
    throw new Error('Existing MCP config is not valid JSON; refusing to overwrite it.');
  }
  if (!isRecord(root)) {
    throw new Error('Existing MCP config is not a JSON object; refusing to overwrite it.');
  }
  const group = root['mcpServers'];
  if (group !== undefined && !isRecord(group)) {
    throw new Error('Existing MCP config has an invalid mcpServers field; refusing to overwrite it.');
  }
  return { root, servers: (group ?? {}) as Record<string, unknown> };
}

export function mergeMcpConfig(existingJson: string, entry: Record<string, unknown>): string {
  const { root, servers } = parseMcpConfig(existingJson);
  return `${JSON.stringify({ ...root, mcpServers: { ...servers, ...entry } }, null, 2)}\n`;
}

function readUserScopedEntry(path: string, name: string): unknown {
  if (!existsSync(path)) {
    return undefined;
  }
  try {
    return parseMcpConfig(readFileSync(path, 'utf8')).servers[name];
  } catch {
    return undefined;
  }
}

function planSharedFile(
  options: SetupOptions,
  harnesses: Harness[],
  transport: Transport
): FileTarget | undefined {
  const readers: Harness[] = options.global ? ['pi'] : ['pi', 'claude-code'];
  const scoped = inScope(harnesses, readers);
  if (scoped.length === 0) {
    return undefined;
  }
  const path = sharedConfigPath(options);
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const intended = serverEntry(transport);
  let servers: Record<string, unknown>;
  try {
    servers = parseMcpConfig(existing).servers;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      kind: 'file',
      harnesses: scoped,
      path,
      content: '',
      disposition: 'refuse',
      reason: `${scoped.join(', ')} ${path}: ${detail}`
    };
  }
  const current = servers[SERVER_NAME];
  if (current !== undefined && equalEntries(current, intended[SERVER_NAME])) {
    return { kind: 'file', harnesses: scoped, path, content: existing, disposition: 'current' };
  }
  const content = mergeMcpConfig(existing, intended);
  if (current === undefined) {
    return { kind: 'file', harnesses: scoped, path, content, disposition: 'write' };
  }
  return {
    kind: 'file',
    harnesses: scoped,
    path,
    content,
    disposition: 'repair',
    diff: describeEntryDiff(current, intended[SERVER_NAME], 'entry')
  };
}

function setupEnvironment(options: Pick<SetupOptions, 'env'>): SetupEnvironment {
  return options.env ?? process.env;
}

function codexConfigPath(options: SetupOptions): string {
  return options.global
    ? join(codexHome(options.homeDir, setupEnvironment(options)), 'config.toml')
    : join(options.projectDir, '.codex', 'config.toml');
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function codexFields(transport: Transport): { command: string; args: string } {
  return {
    command: `command = ${tomlString(transport.command)}`,
    args: `args = [${transport.args.map(tomlString).join(', ')}]`
  };
}

function codexTable(transport: Transport): string {
  const fields = codexFields(transport);
  return `[mcp_servers.${SERVER_NAME}]\n${fields.command}\n${fields.args}\n`;
}

function appendCodexTable(existing: string, transport: Transport): string {
  const separator = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
  return `${existing}${separator}${codexTable(transport)}`;
}

function parseTomlStringArray(body: string): string[] | undefined {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return [];
  }
  const items = trimmed.split(',').map((item) => /^\s*"(.*)"\s*$/.exec(item)?.[1]);
  if (items.some((item) => item === undefined)) {
    return undefined;
  }
  return items as string[];
}

function codexTableBounds(lines: string[]): { header: number; end: number } | undefined {
  const header = lines.findIndex((line) => line.trim() === `[mcp_servers.${SERVER_NAME}]`);
  if (header === -1) {
    return undefined;
  }
  let end = header + 1;
  while (end < lines.length && !lines[end]!.trim().startsWith('[')) {
    end += 1;
  }
  return { header, end };
}

function readCodexTable(existing: string): { command?: string; args?: string[] } | undefined {
  const lines = existing.split('\n');
  const bounds = codexTableBounds(lines);
  if (bounds === undefined) {
    return undefined;
  }
  const table: { command?: string; args?: string[] } = {};
  for (let index = bounds.header + 1; index < bounds.end; index += 1) {
    const line = lines[index]!.trim();
    const command = /^command\s*=\s*"(.*)"$/.exec(line);
    if (command !== null) {
      table.command = command[1];
    }
    const args = /^args\s*=\s*\[(.*)\]$/.exec(line);
    if (args !== null) {
      const parsed = parseTomlStringArray(args[1]!);
      if (parsed !== undefined) {
        table.args = parsed;
      }
    }
  }
  return table;
}

function repairCodexTable(existing: string, transport: Transport): string {
  const lines = existing.split('\n');
  const bounds = codexTableBounds(lines);
  if (bounds === undefined) {
    return appendCodexTable(existing, transport);
  }
  const fields = codexFields(transport);
  const replaced = { command: false, args: false };
  const body = lines.slice(bounds.header + 1, bounds.end).map((line) => {
    if (/^\s*command\s*=/.test(line)) {
      replaced.command = true;
      return fields.command;
    }
    if (/^\s*args\s*=/.test(line)) {
      replaced.args = true;
      return fields.args;
    }
    return line;
  });
  if (!replaced.command) {
    body.push(fields.command);
  }
  if (!replaced.args) {
    body.push(fields.args);
  }
  return [...lines.slice(0, bounds.header + 1), ...body, ...lines.slice(bounds.end)].join('\n');
}

function planCodex(options: SetupOptions, transport: Transport): SetupTarget {
  const path = codexConfigPath(options);
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const intended = { command: transport.command, args: transport.args };
  const table = readCodexTable(existing);
  if (table !== undefined) {
    if (table.command === intended.command && equalEntries(table.args, intended.args)) {
      return { kind: 'file', harnesses: ['codex'], path, content: existing, disposition: 'current' };
    }
    return {
      kind: 'file',
      harnesses: ['codex'],
      path,
      content: repairCodexTable(existing, transport),
      disposition: 'repair',
      diff: describeEntryDiff(table, intended, 'table')
    };
  }
  if (/^\s*mcp_servers\s*=/m.test(existing)) {
    return {
      kind: 'file',
      harnesses: ['codex'],
      path,
      content: '',
      disposition: 'refuse',
      reason: `codex ${path}: existing config defines mcp_servers as a value; refusing to append`
    };
  }
  if (options.global && resolveCommand('codex', pathEnvOf(options)) !== undefined) {
    const args = ['mcp', 'add', SERVER_NAME, '--', transport.command, ...transport.args];
    return { kind: 'exec', harnesses: ['codex'], command: 'codex', args, disposition: 'delegate' };
  }
  return {
    kind: 'file',
    harnesses: ['codex'],
    path,
    content: appendCodexTable(existing, transport),
    disposition: 'write'
  };
}

function planSkill(options: SetupOptions, harnesses: Harness[]): SkillTarget | undefined {
  if (!options.withSkill) {
    return undefined;
  }
  if (options.harnesses !== undefined && !harnesses.includes('pi')) {
    return undefined;
  }
  return {
    kind: 'skill',
    harnesses: ['pi'],
    source: join(options.packageDir, 'skills', SKILL_DIR, 'SKILL.md'),
    path: join(
      piAgentDir(options.homeDir, setupEnvironment(options)),
      'skills',
      SKILL_DIR,
      'SKILL.md'
    )
  };
}

function opencodeEntry(transport: Transport): Record<string, unknown> {
  return { type: 'local', command: [transport.command, ...transport.args], enabled: true };
}

function opencodePath(options: SetupOptions): string {
  const dir = options.global
    ? opencodeConfigDir(options.homeDir, setupEnvironment(options))
    : options.projectDir;
  const jsonc = join(dir, 'opencode.jsonc');
  return existsSync(jsonc) ? jsonc : join(dir, 'opencode.json');
}

function hasJsonComments(text: string): boolean {
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '/' && (text[index + 1] === '/' || text[index + 1] === '*')) {
      return true;
    }
  }
  return false;
}

function opencodeSnippet(transport: Transport): string {
  return `${JSON.stringify({ mcp: { [SERVER_NAME]: opencodeEntry(transport) } }, null, 2)}\n`;
}

function planClaudeGlobal(options: SetupOptions, transport: Transport): ExecTarget {
  const intended = { command: transport.command, args: [...transport.args] };
  const args = ['mcp', 'add-json', SERVER_NAME, JSON.stringify(intended), '--scope', 'user'];
  const registered = readUserScopedEntry(claudeUserStatePath(options.homeDir), SERVER_NAME);
  if (registered !== undefined && equalEntries(registered, intended)) {
    return {
      kind: 'exec',
      harnesses: ['claude-code'],
      command: 'claude',
      args,
      disposition: 'current'
    };
  }
  const diff =
    registered === undefined ? undefined : describeEntryDiff(registered, intended, 'entry');
  if (resolveCommand('claude', pathEnvOf(options)) !== undefined) {
    return {
      kind: 'exec',
      harnesses: ['claude-code'],
      command: 'claude',
      args,
      disposition: 'delegate',
      diff
    };
  }
  return {
    kind: 'exec',
    harnesses: ['claude-code'],
    command: 'claude',
    args,
    disposition: 'manual',
    diff,
    snippet: commandLine('claude', args),
    instructions:
      'Install Claude Code, then run this command to register the server at user scope. Claude Code state files are never hand-edited by setup.'
  };
}

function planOpencode(options: SetupOptions, transport: Transport): FileTarget {
  const path = opencodePath(options);
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (hasJsonComments(existing)) {
    return {
      kind: 'file',
      harnesses: ['opencode'],
      path,
      content: existing,
      disposition: 'manual',
      snippet: opencodeSnippet(transport),
      instructions: `Add this entry under the "mcp" key in ${path} by hand; setup leaves commented opencode config untouched.`
    };
  }
  let parsed: Record<string, unknown> = {};
  if (existing.trim().length > 0) {
    try {
      const decoded = JSON.parse(existing) as unknown;
      if (!isRecord(decoded)) {
        throw new Error('not a JSON object');
      }
      parsed = decoded;
    } catch {
      return {
        kind: 'file',
        harnesses: ['opencode'],
        path,
        content: '',
        disposition: 'refuse',
        reason: `opencode ${path}: existing config is not valid JSON; refusing to overwrite it`
      };
    }
  }
  const mcp = parsed['mcp'];
  if (mcp !== undefined && !isRecord(mcp)) {
    return {
      kind: 'file',
      harnesses: ['opencode'],
      path,
      content: '',
      disposition: 'refuse',
      reason: `opencode ${path}: existing config has an invalid mcp field; refusing to overwrite it`
    };
  }
  const servers = (mcp ?? {}) as Record<string, unknown>;
  const intended = opencodeEntry(transport);
  const current = servers[SERVER_NAME];
  if (current !== undefined && equalEntries(current, intended)) {
    return { kind: 'file', harnesses: ['opencode'], path, content: existing, disposition: 'current' };
  }
  const content = `${JSON.stringify(
    { ...parsed, mcp: { ...servers, [SERVER_NAME]: intended } },
    null,
    2
  )}\n`;
  if (current === undefined) {
    return { kind: 'file', harnesses: ['opencode'], path, content, disposition: 'write' };
  }
  return {
    kind: 'file',
    harnesses: ['opencode'],
    path,
    content,
    disposition: 'repair',
    diff: describeEntryDiff(current, intended, 'entry')
  };
}

export function planSetup(options: SetupOptions): SetupPlan {
  const scope: Scope = options.global ? 'global' : 'project';
  const transport = selectTransport(options);
  const presence = detectHarnessPresence({
    homeDir: options.homeDir,
    projectDir: options.projectDir,
    pathEnv: options.pathEnv,
    env: options.env
  });
  const harnesses = effectiveHarnesses(options, presence);
  const targets: SetupTarget[] = [];
  const shared = planSharedFile(options, harnesses, transport);
  if (shared !== undefined) {
    targets.push(shared);
  }
  if (harnesses.includes('codex')) {
    targets.push(planCodex(options, transport));
  }
  if (scope === 'global' && harnesses.includes('claude-code')) {
    targets.push(planClaudeGlobal(options, transport));
  }
  if (harnesses.includes('opencode')) {
    targets.push(planOpencode(options, transport));
  }
  const skill = planSkill(options, harnesses);
  if (skill !== undefined) {
    targets.push(skill);
  }
  const notes: string[] = [];
  if (scope === 'project' && harnesses.includes('claude-code')) {
    notes.push(
      'Claude Code requires first-use approval for project-scoped servers: open Claude Code in this project and approve the visual-intent-layer server.'
    );
  }
  return {
    scope,
    version: packageVersion(options.packageDir),
    transport,
    presence,
    harnesses,
    filtered: options.harnesses !== undefined,
    targets,
    notes
  };
}

export function applySetup(plan: SetupPlan, options: SetupOptions): ApplyResult {
  const outcomes: SetupOutcome[] = [];
  if (options.printOnly) {
    return { outcomes };
  }
  const run = options.runCommand ?? defaultRunner;
  for (const target of plan.targets) {
    if (target.kind === 'file') {
      if (target.disposition === 'write' || target.disposition === 'repair') {
        mkdirSync(dirname(target.path), { recursive: true });
        writeFileSync(target.path, target.content, 'utf8');
        outcomes.push({
          harnesses: target.harnesses,
          action: target.disposition === 'repair' ? 'repaired' : 'wrote',
          target: target.path,
          detail: target.diff
        });
      } else if (target.disposition === 'current') {
        outcomes.push({
          harnesses: target.harnesses,
          action: 'skipped',
          target: target.path,
          detail: 'already current'
        });
      } else if (target.disposition === 'manual') {
        outcomes.push({
          harnesses: target.harnesses,
          action: 'manual',
          target: target.path,
          detail: target.snippet,
          instructions: target.instructions
        });
      } else {
        outcomes.push({
          harnesses: target.harnesses,
          action: 'refused',
          target: target.path,
          detail: target.reason
        });
      }
    } else if (target.kind === 'exec') {
      const line = commandLine(target.command, target.args);
      if (target.disposition === 'delegate') {
        const status = run(target.command, target.args).status ?? 0;
        if (status !== 0) {
          throw new Error(
            `${target.harnesses.join(', ')} delegation failed: ${line} (exit ${String(status)})`
          );
        }
        outcomes.push({
          harnesses: target.harnesses,
          action: 'delegated',
          target: line,
          detail: target.diff
        });
      } else if (target.disposition === 'current') {
        outcomes.push({
          harnesses: target.harnesses,
          action: 'skipped',
          target: line,
          detail: 'already current'
        });
      } else {
        outcomes.push({
          harnesses: target.harnesses,
          action: 'manual',
          target: line,
          detail: target.snippet,
          instructions: target.instructions
        });
      }
    } else {
      if (!existsSync(target.source)) {
        throw new Error(`Skill source missing from install: ${target.source}`);
      }
      mkdirSync(dirname(target.path), { recursive: true });
      copyFileSync(target.source, target.path);
      outcomes.push({ harnesses: target.harnesses, action: 'wrote', target: target.path });
    }
  }
  return { outcomes };
}

function indent(text: string): string {
  return text
    .replace(/\n$/, '')
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
}

function matchedEvidence(presence: HarnessPresence): string {
  return presence.evidence
    .filter((item) => item.matched)
    .map((item) => (item.kind === 'command' ? `command ${item.detail}` : item.detail))
    .join(', ');
}

function detectionHeader(plan: SetupPlan): string[] {
  const detected = plan.presence.filter((presence) => presence.present);
  const lines = [
    `visual-intent setup ${plan.version}`,
    `scope: ${plan.scope}`,
    `configured: ${plan.harnesses.join(', ') || '(none)'}`,
    `transport: ${commandLine(plan.transport.command, plan.transport.args)}`,
    `detected: ${detected.map((presence) => presence.harness).join(', ') || '(none)'}`
  ];
  if (detected.length === 0) {
    const writesSharedDefault = plan.targets.some(
      (target) => target.kind === 'file' && target.path.endsWith('.mcp.json')
    );
    const writesSkillOnly =
      plan.targets.length === 1 && plan.targets[0]?.kind === 'skill';
    if (plan.targets.length === 0) {
      lines.push('no harness detected: nothing to register');
    } else if (plan.filtered) {
      lines.push(
        `no harness detected: registering the harnesses named by --harness (${plan.harnesses.join(', ')})`
      );
    } else if (writesSharedDefault) {
      lines.push(
        'no harness detected: writing the shared .mcp.json default so pi and Claude Code work'
      );
    } else if (writesSkillOnly) {
      lines.push('no harness detected: installing the pi Skill only');
    } else {
      lines.push('no harness detected: nothing to register');
    }
  }
  for (const presence of plan.presence.filter((item) => !item.present)) {
    lines.push(`absent: ${presence.harness} (checked ${describeCheckedEvidence(presence)})`);
  }
  return lines;
}

function describeDiff(diff: string | undefined): string {
  return diff === undefined ? '' : ` (${diff})`;
}

export function formatPlan(plan: SetupPlan): string {
  const lines = detectionHeader(plan);
  for (const target of plan.targets) {
    if (target.kind === 'file') {
      if (target.disposition === 'write') {
        lines.push(`${target.harnesses.join(', ')}: would write ${target.path}`);
        lines.push(indent(target.content));
      } else if (target.disposition === 'repair') {
        lines.push(
          `${target.harnesses.join(', ')}: would repair ${target.path}${describeDiff(target.diff)}`
        );
        lines.push(indent(target.content));
      } else if (target.disposition === 'current') {
        lines.push(`${target.harnesses.join(', ')}: already current in ${target.path}`);
      } else if (target.disposition === 'manual') {
        lines.push(`${target.harnesses.join(', ')}: manual paste required for ${target.path}`);
        lines.push(indent(target.snippet ?? ''));
        if (target.instructions !== undefined) {
          lines.push(indent(target.instructions));
        }
      } else {
        lines.push(
          `${target.harnesses.join(', ')}: refuse ${target.path} (${target.reason ?? 'refused'})`
        );
      }
    } else if (target.kind === 'exec') {
      const line = commandLine(target.command, target.args);
      if (target.disposition === 'delegate') {
        lines.push(
          `${target.harnesses.join(', ')}: would delegate ${line}${describeDiff(target.diff)}`
        );
      } else if (target.disposition === 'current') {
        lines.push(`${target.harnesses.join(', ')}: already current (${line})`);
      } else {
        lines.push(`${target.harnesses.join(', ')}: manual command required${describeDiff(target.diff)}`);
        lines.push(indent(target.snippet ?? line));
        if (target.instructions !== undefined) {
          lines.push(indent(target.instructions));
        }
      }
    } else {
      lines.push(`pi: would install skill ${target.path}`);
    }
  }
  return lines.join('\n');
}

export function formatResult(result: ApplyResult, plan: SetupPlan): string {
  const lines = detectionHeader(plan);
  if (result.outcomes.length === 0) {
    lines.push('nothing written.');
    return lines.join('\n');
  }
  for (const outcome of result.outcomes) {
    lines.push(`${outcome.harnesses.join(', ')}: ${outcome.action} ${outcome.target}`);
    if (outcome.detail !== undefined && outcome.detail !== outcome.target) {
      lines.push(indent(outcome.detail));
    }
    if (outcome.instructions !== undefined) {
      lines.push(indent(outcome.instructions));
    }
  }
  return lines.join('\n');
}

function registrationLabel(disposition: FileDisposition | ExecDisposition): string {
  if (disposition === 'write' || disposition === 'delegate') {
    return 'not registered';
  }
  if (disposition === 'repair') {
    return 'outdated';
  }
  if (disposition === 'current') {
    return 'current';
  }
  if (disposition === 'manual') {
    return 'manual';
  }
  return 'refused (invalid config)';
}

export function formatStatus(plan: SetupPlan): string {
  const lines = detectionHeader(plan);
  lines.push('registrations:');
  if (plan.targets.length === 0) {
    lines.push('    (none)');
  }
  for (const target of plan.targets) {
    if (target.kind === 'file') {
      lines.push(
        `    ${target.harnesses.join(', ')}: ${registrationLabel(target.disposition)} ${target.path}${describeDiff(target.diff)}`
      );
    } else if (target.kind === 'exec') {
      lines.push(
        `    ${target.harnesses.join(', ')}: ${registrationLabel(target.disposition)} ${commandLine(target.command, target.args)}${describeDiff(target.diff)}`
      );
    } else {
      lines.push(`    pi: skill ${target.path}`);
    }
  }
  for (const presence of plan.presence.filter((item) => item.present)) {
    lines.push(`evidence: ${presence.harness} via ${matchedEvidence(presence)}`);
  }
  return lines.join('\n');
}
