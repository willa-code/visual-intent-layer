import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applySetup,
  detectHarnesses,
  formatPlan,
  formatResult,
  mergeMcpConfig,
  parseHarnessFilter,
  planSetup,
  type CommandResult,
  type Harness,
  type SetupOptions
} from './cli-setup.js';

type RunnerCall = { command: string; args: string[] };

function options(overrides: Partial<SetupOptions> = {}): SetupOptions {
  return {
    packageDir: process.cwd(),
    homeDir: mkdtempSync(join(tmpdir(), 'vil-home-')),
    projectDir: mkdtempSync(join(tmpdir(), 'vil-proj-')),
    global: false,
    printOnly: false,
    withSkill: true,
    pathEnv: '',
    ...overrides
  };
}

function fakeBinaryDir(...names: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'vil-bin-'));
  for (const name of names) {
    writeFileSync(join(dir, name), '');
  }
  return dir;
}

function recordingRunner(calls: RunnerCall[], status = 0) {
  return (command: string, args: string[]): CommandResult => {
    calls.push({ command, args });
    return { status };
  };
}

function fileTarget(plan: ReturnType<typeof planSetup>, suffix: string) {
  const target = plan.targets.find(
    (candidate) => candidate.kind === 'file' && candidate.path.endsWith(suffix)
  );
  if (target === undefined || target.kind !== 'file') {
    throw new Error(`no file target for ${suffix}`);
  }
  return target;
}

function harnessesOf(plan: ReturnType<typeof planSetup>, suffix: string): Harness[] {
  return fileTarget(plan, suffix).harnesses;
}

describe('setup detection and filtering', () => {
  it('treats a harness as present when its binary resolves or its config exists', () => {
    const homeDir = mkdtempSync(join(tmpdir(), 'vil-home-'));
    const projectDir = mkdtempSync(join(tmpdir(), 'vil-proj-'));
    mkdirSync(join(homeDir, '.codex'), { recursive: true });
    writeFileSync(join(projectDir, 'opencode.json'), '{}');
    const pathEnv = fakeBinaryDir('claude', 'pi');

    expect(detectHarnesses({ homeDir, projectDir, pathEnv })).toEqual([
      'pi',
      'codex',
      'claude-code',
      'opencode'
    ]);
  });

  it('detects nothing on an empty machine', () => {
    const homeDir = mkdtempSync(join(tmpdir(), 'vil-home-'));
    const projectDir = mkdtempSync(join(tmpdir(), 'vil-proj-'));
    expect(detectHarnesses({ homeDir, projectDir, pathEnv: '' })).toEqual([]);
  });

  it('restricts the matrix with an explicit harness filter', () => {
    const opts = options({ harnesses: ['codex'] });
    const plan = planSetup(opts);
    expect(plan.harnesses).toEqual(['codex']);
    const result = applySetup(plan, opts);
    expect(existsSync(join(opts.projectDir, '.mcp.json'))).toBe(false);
    expect(existsSync(join(opts.projectDir, '.codex', 'config.toml'))).toBe(true);
    expect(result.outcomes.some((outcome) => outcome.harnesses.includes('pi'))).toBe(false);
  });

  it('keeps the harness order stable regardless of filter order', () => {
    const opts = options({ harnesses: ['opencode', 'pi'] });
    expect(planSetup(opts).harnesses).toEqual(['pi', 'opencode']);
  });
});

describe('setup shared config', () => {
  it('merges the server entry while preserving existing servers', () => {
    const merged = mergeMcpConfig(
      JSON.stringify({ mcpServers: { other: { command: 'other-mcp' } } }),
      { 'visual-intent-layer': { command: 'visual-intent', args: ['mcp'] } }
    );
    const parsed = JSON.parse(merged) as { mcpServers: Record<string, unknown> };
    expect(parsed.mcpServers['other']).toBeDefined();
    expect(parsed.mcpServers['visual-intent-layer']).toEqual({ command: 'visual-intent', args: ['mcp'] });
  });

  it('refuses to overwrite invalid MCP config', () => {
    expect(() => mergeMcpConfig('{oops', {})).toThrow(/not valid JSON/);
  });

  it('writes the shared project file and the global skill by default', () => {
    const opts = options();
    const plan = planSetup(opts);
    expect(plan.scope).toBe('project');
    const target = fileTarget(plan, '.mcp.json');
    expect(target.path).toBe(join(opts.projectDir, '.mcp.json'));
    expect(target.harnesses).toEqual(['pi']);

    const result = applySetup(plan, opts);
    expect(result.outcomes.map((outcome) => outcome.action)).toEqual(['wrote', 'wrote']);
    const config = JSON.parse(readFileSync(target.path, 'utf8')) as {
      mcpServers: Record<string, unknown>;
    };
    expect(config.mcpServers['visual-intent-layer']).toEqual({ command: 'visual-intent', args: ['mcp'] });
    expect(
      readFileSync(join(opts.homeDir, '.pi', 'agent', 'skills', 'visual-intent', 'SKILL.md'), 'utf8')
    ).toContain('name: visual-intent');
  });

  it('serves pi alone from the shared global file when pi is present', () => {
    const opts = options({ global: true });
    mkdirSync(join(opts.homeDir, '.pi'), { recursive: true });
    const plan = planSetup(opts);
    const target = fileTarget(plan, join('.config', 'mcp', 'mcp.json'));
    expect(target.path).toBe(join(opts.homeDir, '.config', 'mcp', 'mcp.json'));
    expect(target.harnesses).toEqual(['pi']);
    applySetup(plan, opts);
    expect(existsSync(target.path)).toBe(true);
  });

  it('writes no harness config at global scope when no harness is detected', () => {
    const opts = options({ global: true, withSkill: false });
    const plan = planSetup(opts);
    expect(plan.targets).toEqual([]);
    expect(applySetup(plan, opts).outcomes).toEqual([]);
  });

  it('still installs the Skill at global scope when no harness is detected', () => {
    const opts = options({ global: true });
    const plan = planSetup(opts);
    expect(plan.harnesses).toEqual([]);
    expect(plan.targets.map((target) => target.kind)).toEqual(['skill']);
    applySetup(plan, opts);
    expect(
      existsSync(join(opts.homeDir, '.pi', 'agent', 'skills', 'visual-intent', 'SKILL.md'))
    ).toBe(true);
  });

  it('reports an already-registered server without rewriting the file', () => {
    const opts = options();
    const existing = `${JSON.stringify(
      { mcpServers: { 'visual-intent-layer': { command: 'visual-intent', args: ['mcp'] } } },
      null,
      2
    )}\n`;
    writeFileSync(join(opts.projectDir, '.mcp.json'), existing);
    const result = applySetup(planSetup(opts), opts);
    expect(result.outcomes[0]?.action).toBe('skipped');
    expect(readFileSync(join(opts.projectDir, '.mcp.json'), 'utf8')).toBe(existing);
  });

  it('serves pi and Claude Code from one shared project file write', () => {
    const opts = options({ pathEnv: fakeBinaryDir('pi', 'claude') });
    const plan = planSetup(opts);
    const targets = plan.targets.filter((target) => target.kind === 'file' && target.path.endsWith('.mcp.json'));
    expect(targets).toHaveLength(1);
    expect(harnessesOf(plan, '.mcp.json')).toEqual(['pi', 'claude-code']);
  });

  it('serves Claude Code from the shared project file when only Claude is in scope', () => {
    const opts = options({ harnesses: ['claude-code'] });
    const plan = planSetup(opts);
    expect(harnessesOf(plan, '.mcp.json')).toEqual(['claude-code']);
    applySetup(plan, opts);
    expect(existsSync(join(opts.projectDir, '.mcp.json'))).toBe(true);
  });

  it('refuses an invalid shared file and names the harness and path', () => {
    const opts = options();
    writeFileSync(join(opts.projectDir, '.mcp.json'), '{oops');
    const plan = planSetup(opts);
    expect(harnessesOf(plan, '.mcp.json')).toEqual(['pi']);
    const result = applySetup(plan, opts);
    expect(result.outcomes[0]?.action).toBe('refused');
    expect(result.outcomes[0]?.detail).toMatch(/pi/);
    expect(result.outcomes[0]?.detail).toMatch(/\.mcp\.json/);
    expect(readFileSync(join(opts.projectDir, '.mcp.json'), 'utf8')).toBe('{oops');
  });

  it('writes nothing in print-only mode but still plans the content', () => {
    const opts = options({ printOnly: true });
    const plan = planSetup(opts);
    expect(applySetup(plan, opts).outcomes).toEqual([]);
    expect(existsSync(join(opts.projectDir, '.mcp.json'))).toBe(false);
    expect(fileTarget(plan, '.mcp.json').content).toContain('visual-intent-layer');
  });

  it('fails loudly when the skill is missing from the install', () => {
    const opts = options({ packageDir: mkdtempSync(join(tmpdir(), 'vil-empty-')) });
    const plan = planSetup(opts);
    expect(() => applySetup(plan, opts)).toThrow(/Skill source missing/);

    const global = options({ global: true, packageDir: mkdtempSync(join(tmpdir(), 'vil-empty-')) });
    expect(() => applySetup(planSetup(global), global)).toThrow(/Skill source missing/);
  });

  it('skips the skill when the skill flag is off or pi is out of scope', () => {
    const noSkill = options({ withSkill: false });
    expect(planSetup(noSkill).targets.some((target) => target.kind === 'skill')).toBe(false);

    const codexOnly = options({ harnesses: ['codex'] });
    expect(planSetup(codexOnly).targets.some((target) => target.kind === 'skill')).toBe(false);
  });
});

describe('setup Codex', () => {
  const table = '[mcp_servers.visual-intent-layer]\ncommand = "visual-intent"\nargs = ["mcp"]\n';

  it('appends the server table to the user-global TOML when the binary is absent', () => {
    const opts = options({ global: true });
    mkdirSync(join(opts.homeDir, '.codex'), { recursive: true });
    const plan = planSetup(opts);
    const target = fileTarget(plan, join('.codex', 'config.toml'));
    expect(target.path).toBe(join(opts.homeDir, '.codex', 'config.toml'));

    const result = applySetup(plan, opts);
    expect(result.outcomes[0]?.action).toBe('wrote');
    expect(readFileSync(target.path, 'utf8')).toBe(table);
  });

  it('preserves existing TOML and appends the table with a newline boundary', () => {
    const opts = options({ harnesses: ['codex'] });
    mkdirSync(join(opts.projectDir, '.codex'), { recursive: true });
    writeFileSync(join(opts.projectDir, '.codex', 'config.toml'), 'model = "gpt-5"');
    applySetup(planSetup(opts), opts);
    expect(readFileSync(join(opts.projectDir, '.codex', 'config.toml'), 'utf8')).toBe(
      `model = "gpt-5"\n${table}`
    );
  });

  it('delegates to the Codex writer command when the binary exists', () => {
    const calls: RunnerCall[] = [];
    const opts = options({
      global: true,
      pathEnv: fakeBinaryDir('codex'),
      runCommand: recordingRunner(calls)
    });
    const plan = planSetup(opts);
    expect(plan.targets.filter((target) => target.kind === 'exec')).toHaveLength(1);
    const result = applySetup(plan, opts);
    expect(calls).toEqual([
      { command: 'codex', args: ['mcp', 'add', 'visual-intent-layer', '--', 'visual-intent', 'mcp'] }
    ]);
    expect(result.outcomes[0]?.action).toBe('delegated');
    expect(existsSync(join(opts.homeDir, '.codex', 'config.toml'))).toBe(false);
  });

  it('reports an existing table as already-present without delegating', () => {
    const calls: RunnerCall[] = [];
    const opts = options({
      global: true,
      pathEnv: fakeBinaryDir('codex'),
      runCommand: recordingRunner(calls)
    });
    mkdirSync(join(opts.homeDir, '.codex'), { recursive: true });
    writeFileSync(join(opts.homeDir, '.codex', 'config.toml'), `model = "gpt-5"\n${table}`);
    const result = applySetup(planSetup(opts), opts);
    expect(calls).toEqual([]);
    expect(result.outcomes.find((outcome) => outcome.harnesses.includes('codex'))?.action).toBe('skipped');
  });

  it('refuses to append when the TOML defines mcp_servers as a value', () => {
    const opts = options({ harnesses: ['codex'] });
    mkdirSync(join(opts.projectDir, '.codex'), { recursive: true });
    writeFileSync(join(opts.projectDir, '.codex', 'config.toml'), 'mcp_servers = "broken"\n');
    const result = applySetup(planSetup(opts), opts);
    expect(result.outcomes[0]?.action).toBe('refused');
    expect(result.outcomes[0]?.detail).toMatch(/codex/);
    expect(readFileSync(join(opts.projectDir, '.codex', 'config.toml'), 'utf8')).toBe(
      'mcp_servers = "broken"\n'
    );
  });

  it('plans the TOML without writing in preview mode', () => {
    const opts = options({ harnesses: ['codex'], printOnly: true });
    const plan = planSetup(opts);
    expect(fileTarget(plan, join('.codex', 'config.toml')).content).toContain(
      '[mcp_servers.visual-intent-layer]'
    );
    expect(applySetup(plan, opts).outcomes).toEqual([]);
    expect(existsSync(join(opts.projectDir, '.codex', 'config.toml'))).toBe(false);
  });

  it('fails loudly when delegation exits non-zero', () => {
    const opts = options({
      global: true,
      pathEnv: fakeBinaryDir('codex'),
      runCommand: recordingRunner([], 1)
    });
    expect(() => applySetup(planSetup(opts), opts)).toThrow(/codex delegation failed/);
  });
});

describe('setup opencode', () => {
  const entry = { type: 'local', command: ['visual-intent', 'mcp'], enabled: true };

  it('merges the native local entry into the project config', () => {
    const opts = options({ harnesses: ['opencode'] });
    writeFileSync(
      join(opts.projectDir, 'opencode.json'),
      `${JSON.stringify({ $schema: 'https://opencode.ai/config.json', theme: 'dark' }, null, 2)}\n`
    );
    const plan = planSetup(opts);
    const target = fileTarget(plan, 'opencode.json');
    expect(target.path).toBe(join(opts.projectDir, 'opencode.json'));

    applySetup(plan, opts);
    const parsed = JSON.parse(readFileSync(target.path, 'utf8')) as {
      theme: string;
      mcp: Record<string, unknown>;
    };
    expect(parsed.theme).toBe('dark');
    expect(parsed.mcp['visual-intent-layer']).toEqual(entry);
  });

  it('preserves existing mcp entries', () => {
    const opts = options({ harnesses: ['opencode'] });
    writeFileSync(
      join(opts.projectDir, 'opencode.json'),
      `${JSON.stringify({ mcp: { other: { type: 'local', command: ['other'] } } }, null, 2)}\n`
    );
    applySetup(planSetup(opts), opts);
    const parsed = JSON.parse(readFileSync(join(opts.projectDir, 'opencode.json'), 'utf8')) as {
      mcp: Record<string, unknown>;
    };
    expect(parsed.mcp['other']).toEqual({ type: 'local', command: ['other'] });
    expect(parsed.mcp['visual-intent-layer']).toEqual(entry);
  });

  it('writes the user-global config with the global flag', () => {
    const opts = options({ global: true });
    mkdirSync(join(opts.homeDir, '.config', 'opencode'), { recursive: true });
    const plan = planSetup(opts);
    const target = fileTarget(plan, join('opencode', 'opencode.json'));
    expect(target.path).toBe(join(opts.homeDir, '.config', 'opencode', 'opencode.json'));
    applySetup(plan, opts);
    expect(existsSync(target.path)).toBe(true);
  });

  it('uses an existing jsonc file even when it has no comments', () => {
    const opts = options({ harnesses: ['opencode'] });
    writeFileSync(join(opts.projectDir, 'opencode.jsonc'), '{ "theme": "dark" }\n');
    const target = fileTarget(planSetup(opts), 'opencode.jsonc');
    applySetup(planSetup(opts), opts);
    expect(existsSync(join(opts.projectDir, 'opencode.json'))).toBe(false);
    const parsed = JSON.parse(readFileSync(target.path, 'utf8')) as { mcp: Record<string, unknown> };
    expect(parsed.mcp['visual-intent-layer']).toEqual(entry);
  });

  it('reports an already-registered server without rewriting', () => {
    const opts = options({ harnesses: ['opencode'] });
    const existing = `${JSON.stringify({ mcp: { 'visual-intent-layer': entry } }, null, 2)}\n`;
    writeFileSync(join(opts.projectDir, 'opencode.json'), existing);
    const result = applySetup(planSetup(opts), opts);
    expect(result.outcomes[0]?.action).toBe('skipped');
    expect(readFileSync(join(opts.projectDir, 'opencode.json'), 'utf8')).toBe(existing);
  });

  it('never rewrites a config with hand-written comments and prints the snippet', () => {
    const opts = options({ harnesses: ['opencode'] });
    const existing = '{\n  // keep me\n  "$schema": "https://opencode.ai/config.json"\n}\n';
    writeFileSync(join(opts.projectDir, 'opencode.jsonc'), existing);
    const plan = planSetup(opts);
    const target = fileTarget(plan, 'opencode.jsonc');
    expect(target.disposition).toBe('manual');
    expect(target.snippet).toContain('visual-intent-layer');
    expect(target.instructions).toMatch(/opencode\.jsonc/);

    const result = applySetup(plan, opts);
    expect(result.outcomes[0]?.action).toBe('manual');
    expect(readFileSync(join(opts.projectDir, 'opencode.jsonc'), 'utf8')).toBe(existing);
  });

  it('does not mistake a URL in a string for a comment', () => {
    const opts = options({ harnesses: ['opencode'] });
    const existing = `${JSON.stringify({ $schema: 'https://opencode.ai/config.json' }, null, 2)}\n`;
    writeFileSync(join(opts.projectDir, 'opencode.json'), existing);
    const target = fileTarget(planSetup(opts), 'opencode.json');
    expect(target.disposition).toBe('write');
    expect(target.content).toContain('visual-intent-layer');
  });

  it('refuses invalid JSON', () => {
    const opts = options({ harnesses: ['opencode'] });
    writeFileSync(join(opts.projectDir, 'opencode.json'), '{oops');
    const result = applySetup(planSetup(opts), opts);
    expect(result.outcomes[0]?.action).toBe('refused');
    expect(result.outcomes[0]?.detail).toMatch(/opencode/);
    expect(readFileSync(join(opts.projectDir, 'opencode.json'), 'utf8')).toBe('{oops');
  });

  it('refuses a config whose mcp field is not an object', () => {
    const opts = options({ harnesses: ['opencode'] });
    writeFileSync(join(opts.projectDir, 'opencode.json'), '{ "mcp": [] }\n');
    const result = applySetup(planSetup(opts), opts);
    expect(result.outcomes[0]?.action).toBe('refused');
  });

  it('plans the entry without writing in preview mode', () => {
    const opts = options({ harnesses: ['opencode'], printOnly: true });
    const plan = planSetup(opts);
    expect(fileTarget(plan, 'opencode.json').content).toContain('visual-intent-layer');
    expect(applySetup(plan, opts).outcomes).toEqual([]);
    expect(existsSync(join(opts.projectDir, 'opencode.json'))).toBe(false);
  });
});

describe('setup Claude Code', () => {
  const payload = '{"command":"visual-intent","args":["mcp"]}';
  const userCommand = `claude mcp add-json visual-intent-layer ${payload} --scope user`;

  it('notes the first-use approval for project scope', () => {
    const opts = options({ pathEnv: fakeBinaryDir('claude') });
    const plan = planSetup(opts);
    expect(harnessesOf(plan, '.mcp.json')).toEqual(['claude-code']);
    expect(plan.notes.join(' ')).toMatch(/approval/i);
  });

  it('delegates user scope to the Claude writer command when the binary exists', () => {
    const calls: RunnerCall[] = [];
    const opts = options({
      global: true,
      pathEnv: fakeBinaryDir('claude'),
      runCommand: recordingRunner(calls)
    });
    const plan = planSetup(opts);
    expect(plan.targets.filter((target) => target.kind === 'exec')).toHaveLength(1);
    const result = applySetup(plan, opts);
    expect(calls).toEqual([
      { command: 'claude', args: ['mcp', 'add-json', 'visual-intent-layer', payload, '--scope', 'user'] }
    ]);
    expect(result.outcomes[0]?.action).toBe('delegated');
    expect(existsSync(join(opts.homeDir, '.claude.json'))).toBe(false);
  });

  it('prints the manual snippet and never edits the state file when the binary is absent', () => {
    const opts = options({ global: true });
    mkdirSync(join(opts.homeDir, '.claude'), { recursive: true });
    const statePath = join(opts.homeDir, '.claude.json');
    writeFileSync(statePath, '{ "projects": {} }\n');
    const plan = planSetup(opts);
    const target = plan.targets.find((candidate) => candidate.kind === 'exec');
    expect(target?.kind).toBe('exec');
    if (target?.kind !== 'exec') {
      throw new Error('expected exec target');
    }
    expect(target.disposition).toBe('manual');
    expect(target.snippet).toBe(userCommand);

    const result = applySetup(plan, opts);
    expect(result.outcomes[0]?.action).toBe('manual');
    expect(readFileSync(statePath, 'utf8')).toBe('{ "projects": {} }\n');
  });

  it('reports an existing user-scope entry without delegating', () => {
    const calls: RunnerCall[] = [];
    const opts = options({
      global: true,
      pathEnv: fakeBinaryDir('claude'),
      runCommand: recordingRunner(calls)
    });
    writeFileSync(
      join(opts.homeDir, '.claude.json'),
      `${JSON.stringify({ mcpServers: { 'visual-intent-layer': { command: 'visual-intent' } } })}\n`
    );
    const result = applySetup(planSetup(opts), opts);
    expect(calls).toEqual([]);
    expect(result.outcomes[0]?.action).toBe('skipped');
  });

  it('fails loudly when delegation exits non-zero', () => {
    const opts = options({
      global: true,
      pathEnv: fakeBinaryDir('claude'),
      runCommand: recordingRunner([], 1)
    });
    expect(() => applySetup(planSetup(opts), opts)).toThrow(/claude-code delegation failed/);
  });

  it('writes nothing at global scope in preview mode', () => {
    const opts = options({ global: true, printOnly: true, pathEnv: fakeBinaryDir('claude') });
    const plan = planSetup(opts);
    expect(applySetup(plan, opts).outcomes).toEqual([]);
    expect(existsSync(join(opts.homeDir, '.claude.json'))).toBe(false);
  });
});

describe('setup harness filter parsing', () => {
  it('dedupes values and returns them in canonical order', () => {
    expect(parseHarnessFilter(['opencode', 'pi', 'pi'])).toEqual(['pi', 'opencode']);
  });

  it('rejects unknown harness names', () => {
    expect(() => parseHarnessFilter(['cursor'])).toThrow(/Unknown harness: cursor/);
  });
});

describe('setup report rendering', () => {
  it('renders the planned matrix and content in preview mode', () => {
    const plan = planSetup(options({ harnesses: ['pi', 'codex'] }));
    const rendered = formatPlan(plan);
    expect(rendered).toContain('scope: project');
    expect(rendered).toContain('would write');
    expect(rendered).toContain('visual-intent-layer');
  });

  it('renders a manual paste instruction with its snippet', () => {
    const opts = options({ harnesses: ['opencode'] });
    writeFileSync(join(opts.projectDir, 'opencode.jsonc'), '{\n  // keep\n}\n');
    const rendered = formatPlan(planSetup(opts));
    expect(rendered).toContain('manual paste required');
    expect(rendered).toContain('visual-intent-layer');
  });

  it('renders the applied outcome report', () => {
    const opts = options({ harnesses: ['codex'] });
    const rendered = formatResult(applySetup(planSetup(opts), opts));
    expect(rendered).toContain('codex: wrote');
  });
});