import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';

export const SERVER_NAME = 'visual-intent-layer';
export const SKILL_DIR = 'visual-intent';

export type Harness = 'pi' | 'codex' | 'claude-code' | 'opencode';
export const HARNESSES: readonly Harness[] = ['pi', 'codex', 'claude-code', 'opencode'];

export type Scope = 'project' | 'global';

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
  runCommand?: CommandRunner;
};

export type SetupAction = 'wrote' | 'skipped' | 'delegated' | 'manual' | 'refused';

export type SetupOutcome = {
  harnesses: Harness[];
  action: SetupAction;
  target: string;
  detail?: string;
  instructions?: string;
};

export type FileTarget = {
  kind: 'file';
  harnesses: Harness[];
  path: string;
  content: string;
  disposition: 'write' | 'already-present' | 'refuse' | 'manual';
  reason?: string;
  snippet?: string;
  instructions?: string;
};

export type ExecTarget = {
  kind: 'exec';
  harnesses: Harness[];
  command: string;
  args: string[];
  disposition: 'delegate' | 'already-present' | 'manual';
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
  harnesses: Harness[];
  targets: SetupTarget[];
  notes: string[];
};

export type ApplyResult = {
  outcomes: SetupOutcome[];
};

export function serverEntry(): Record<string, unknown> {
  return {
    [SERVER_NAME]: {
      command: 'visual-intent',
      args: ['mcp']
    }
  };
}

export function defaultRunner(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  return { status: result.status };
}

function hasBinary(name: string, pathEnv: string | undefined): boolean {
  const raw = pathEnv ?? process.env['PATH'] ?? '';
  if (raw.length === 0) {
    return false;
  }
  return raw.split(delimiter).some((dir) => dir.length > 0 && existsSync(join(dir, name)));
}

export function detectHarnesses(
  options: Pick<SetupOptions, 'homeDir' | 'projectDir' | 'pathEnv'>
): Harness[] {
  const { homeDir, projectDir, pathEnv } = options;
  const present: Record<Harness, boolean> = {
    pi:
      hasBinary('pi', pathEnv) ||
      existsSync(join(homeDir, '.pi')) ||
      existsSync(join(projectDir, '.pi')),
    codex:
      hasBinary('codex', pathEnv) ||
      existsSync(join(homeDir, '.codex')) ||
      existsSync(join(projectDir, '.codex', 'config.toml')),
    'claude-code':
      hasBinary('claude', pathEnv) ||
      existsSync(join(homeDir, '.claude.json')) ||
      existsSync(join(homeDir, '.claude')),
    opencode:
      hasBinary('opencode', pathEnv) ||
      existsSync(join(homeDir, '.config', 'opencode')) ||
      existsSync(join(projectDir, 'opencode.json')) ||
      existsSync(join(projectDir, 'opencode.jsonc'))
  };
  return HARNESSES.filter((harness) => present[harness]);
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

export function effectiveHarnesses(
  options: Pick<SetupOptions, 'global' | 'harnesses' | 'homeDir' | 'projectDir' | 'pathEnv'>
): Harness[] {
  if (options.harnesses !== undefined) {
    return canonicalHarnesses(options.harnesses);
  }
  const detected = detectHarnesses(options);
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

function planSharedFile(options: SetupOptions, harnesses: Harness[]): FileTarget | undefined {
  const readers: Harness[] = options.global ? ['pi'] : ['pi', 'claude-code'];
  const scoped = inScope(harnesses, readers);
  if (scoped.length === 0) {
    return undefined;
  }
  const path = sharedConfigPath(options);
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (isRegisteredInJson(existing, 'mcpServers')) {
    return { kind: 'file', harnesses: scoped, path, content: existing, disposition: 'already-present' };
  }
  try {
    return {
      kind: 'file',
      harnesses: scoped,
      path,
      content: mergeMcpConfig(existing, serverEntry()),
      disposition: 'write'
    };
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
}

function isRegisteredInJson(existing: string, key: string): boolean {
  if (existing.trim().length === 0) {
    return false;
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(existing) as Record<string, unknown>;
  } catch {
    return false;
  }
  const group = parsed[key];
  return typeof group === 'object' && group !== null && Object.hasOwn(group, SERVER_NAME);
}

function codexConfigPath(options: SetupOptions): string {
  return options.global
    ? join(options.homeDir, '.codex', 'config.toml')
    : join(options.projectDir, '.codex', 'config.toml');
}

function codexTable(): string {
  return `[mcp_servers.${SERVER_NAME}]\ncommand = "visual-intent"\nargs = ["mcp"]\n`;
}

function hasCodexTable(existing: string): boolean {
  return new RegExp(`^\\s*\\[mcp_servers\\.${SERVER_NAME}\\]\\s*$`, 'm').test(existing);
}

function planCodex(options: SetupOptions): SetupTarget {
  const path = codexConfigPath(options);
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (hasCodexTable(existing)) {
    return { kind: 'file', harnesses: ['codex'], path, content: existing, disposition: 'already-present' };
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
  if (options.global && hasBinary('codex', options.pathEnv)) {
    const args = ['mcp', 'add', SERVER_NAME, '--', 'visual-intent', 'mcp'];
    return {
      kind: 'exec',
      harnesses: ['codex'],
      command: 'codex',
      args,
      disposition: 'delegate'
    };
  }
  const separator = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
  return {
    kind: 'file',
    harnesses: ['codex'],
    path,
    content: `${existing}${separator}${codexTable()}`,
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
    path: join(options.homeDir, '.pi', 'agent', 'skills', SKILL_DIR, 'SKILL.md')
  };
}

function opencodeEntry(): Record<string, unknown> {
  return { type: 'local', command: ['visual-intent', 'mcp'], enabled: true };
}

function opencodePath(options: SetupOptions): string {
  if (options.global) {
    const dir = join(options.homeDir, '.config', 'opencode');
    const jsonc = join(dir, 'opencode.jsonc');
    return existsSync(jsonc) ? jsonc : join(dir, 'opencode.json');
  }
  const jsonc = join(options.projectDir, 'opencode.jsonc');
  return existsSync(jsonc) ? jsonc : join(options.projectDir, 'opencode.json');
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

function opencodeSnippet(): string {
  return `${JSON.stringify({ mcp: { [SERVER_NAME]: opencodeEntry() } }, null, 2)}\n`;
}

function planClaudeGlobal(options: SetupOptions): ExecTarget {
  const json = JSON.stringify({ command: 'visual-intent', args: ['mcp'] });
  const args = ['mcp', 'add-json', SERVER_NAME, json, '--scope', 'user'];
  const statePath = join(options.homeDir, '.claude.json');
  const existing = existsSync(statePath) ? readFileSync(statePath, 'utf8') : '';
  if (isRegisteredInJson(existing, 'mcpServers')) {
    return {
      kind: 'exec',
      harnesses: ['claude-code'],
      command: 'claude',
      args,
      disposition: 'already-present'
    };
  }
  if (hasBinary('claude', options.pathEnv)) {
    return { kind: 'exec', harnesses: ['claude-code'], command: 'claude', args, disposition: 'delegate' };
  }
  return {
    kind: 'exec',
    harnesses: ['claude-code'],
    command: 'claude',
    args,
    disposition: 'manual',
    snippet: commandLine('claude', args),
    instructions:
      'Install Claude Code, then run this command to register the server at user scope. Claude Code state files are never hand-edited by setup.'
  };
}

function planOpencode(options: SetupOptions): FileTarget {
  const path = opencodePath(options);
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (hasJsonComments(existing)) {
    return {
      kind: 'file',
      harnesses: ['opencode'],
      path,
      content: existing,
      disposition: 'manual',
      snippet: opencodeSnippet(),
      instructions: `Add this entry under the "mcp" key in ${path} by hand; setup leaves commented opencode config untouched.`
    };
  }
  let parsed: Record<string, unknown> = {};
  if (existing.trim().length > 0) {
    try {
      parsed = JSON.parse(existing) as Record<string, unknown>;
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
  if (mcp !== undefined && (typeof mcp !== 'object' || mcp === null || Array.isArray(mcp))) {
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
  if (Object.hasOwn(servers, SERVER_NAME)) {
    return { kind: 'file', harnesses: ['opencode'], path, content: existing, disposition: 'already-present' };
  }
  return {
    kind: 'file',
    harnesses: ['opencode'],
    path,
    content: `${JSON.stringify({ ...parsed, mcp: { ...servers, [SERVER_NAME]: opencodeEntry() } }, null, 2)}\n`,
    disposition: 'write'
  };
}

export function planSetup(options: SetupOptions): SetupPlan {
  const scope: Scope = options.global ? 'global' : 'project';
  const harnesses = effectiveHarnesses(options);
  const targets: SetupTarget[] = [];
  const shared = planSharedFile(options, harnesses);
  if (shared !== undefined) {
    targets.push(shared);
  }
  if (harnesses.includes('codex')) {
    targets.push(planCodex(options));
  }
  if (scope === 'global' && harnesses.includes('claude-code')) {
    targets.push(planClaudeGlobal(options));
  }
  if (harnesses.includes('opencode')) {
    targets.push(planOpencode(options));
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
  return { scope, harnesses, targets, notes };
}

export function mergeMcpConfig(existingJson: string, entry: Record<string, unknown>): string {
  let parsed: { mcpServers?: Record<string, unknown> };
  if (existingJson.trim().length === 0) {
    parsed = {};
  } else {
    try {
      parsed = JSON.parse(existingJson) as { mcpServers?: Record<string, unknown> };
    } catch {
      throw new Error('Existing MCP config is not valid JSON; refusing to overwrite it.');
    }
  }
  if (parsed.mcpServers !== undefined && (typeof parsed.mcpServers !== 'object' || parsed.mcpServers === null)) {
    throw new Error('Existing MCP config has an invalid mcpServers field; refusing to overwrite it.');
  }
  return JSON.stringify({ ...parsed, mcpServers: { ...(parsed.mcpServers ?? {}), ...entry } }, null, 2) + '\n';
}

export function applySetup(plan: SetupPlan, options: SetupOptions): ApplyResult {
  const outcomes: SetupOutcome[] = [];
  if (options.printOnly) {
    return { outcomes };
  }
  const run = options.runCommand ?? defaultRunner;
  for (const target of plan.targets) {
    if (target.kind === 'file') {
      if (target.disposition === 'write') {
        mkdirSync(dirname(target.path), { recursive: true });
        writeFileSync(target.path, target.content, 'utf8');
        outcomes.push({ harnesses: target.harnesses, action: 'wrote', target: target.path });
      } else if (target.disposition === 'already-present') {
        outcomes.push({
          harnesses: target.harnesses,
          action: 'skipped',
          target: target.path,
          detail: 'already registered'
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
        outcomes.push({ harnesses: target.harnesses, action: 'delegated', target: line });
      } else if (target.disposition === 'already-present') {
        outcomes.push({
          harnesses: target.harnesses,
          action: 'skipped',
          target: line,
          detail: 'already registered'
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

export function formatPlan(plan: SetupPlan): string {
  const lines = [`scope: ${plan.scope}`, `harnesses: ${plan.harnesses.join(', ') || '(none)'}`];
  for (const target of plan.targets) {
    if (target.kind === 'file') {
      if (target.disposition === 'write') {
        lines.push(`${target.harnesses.join(', ')}: would write ${target.path}`);
        lines.push(indent(target.content));
      } else if (target.disposition === 'already-present') {
        lines.push(`${target.harnesses.join(', ')}: already registered in ${target.path}`);
      } else if (target.disposition === 'manual') {
        lines.push(`${target.harnesses.join(', ')}: manual paste required for ${target.path}`);
        lines.push(indent(target.snippet ?? ''));
        if (target.instructions !== undefined) {
          lines.push(indent(target.instructions));
        }
      } else {
        lines.push(`${target.harnesses.join(', ')}: refuse ${target.path} (${target.reason ?? 'refused'})`);
      }
    } else if (target.kind === 'exec') {
      const line = commandLine(target.command, target.args);
      if (target.disposition === 'delegate') {
        lines.push(`${target.harnesses.join(', ')}: would delegate ${line}`);
      } else if (target.disposition === 'already-present') {
        lines.push(`${target.harnesses.join(', ')}: already registered (${line})`);
      } else {
        lines.push(`${target.harnesses.join(', ')}: manual command required`);
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

export function formatResult(result: ApplyResult): string {
  if (result.outcomes.length === 0) {
    return 'nothing written.';
  }
  const lines: string[] = [];
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