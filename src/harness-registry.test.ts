import { chmodSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HARNESS_DESCRIPTORS,
  codexHome,
  describeCheckedEvidence,
  detectHarnessPresence,
  detectHarnesses,
  opencodeConfigDir,
  piAgentDir,
  resolveCommand,
  type DetectionRequest,
  type Harness,
  type HarnessPresence
} from './harness-registry.js';

function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function executableDir(...names: string[]): string {
  const dir = tempDir('vil-bin-');
  for (const name of names) {
    const path = join(dir, name);
    writeFileSync(path, '#!/bin/sh\n');
    chmodSync(path, 0o755);
  }
  return dir;
}

function presenceOf(presence: HarnessPresence[], harness: Harness): HarnessPresence {
  const found = presence.find((candidate) => candidate.harness === harness);
  if (found === undefined) {
    throw new Error(`no presence for ${harness}`);
  }
  return found;
}

function machine(overrides: Partial<DetectionRequest> = {}): DetectionRequest {
  return {
    homeDir: tempDir('vil-home-'),
    projectDir: tempDir('vil-proj-'),
    pathEnv: '',
    env: {},
    ...overrides
  };
}

const systemCodexPresent = existsSync('/etc/codex');

describe('harness detection by configuration location', () => {
  it('finds each harness at its default configuration location', () => {
    const request = machine();
    mkdirSync(join(request.homeDir, '.pi', 'agent'), { recursive: true });
    mkdirSync(join(request.homeDir, '.codex'), { recursive: true });
    mkdirSync(join(request.homeDir, '.claude'), { recursive: true });
    mkdirSync(join(request.homeDir, '.config', 'opencode'), { recursive: true });

    expect(detectHarnesses(request)).toEqual(['pi', 'codex', 'claude-code', 'opencode']);
  });

  it('honours the configuration-home environment overrides', () => {
    const homeDir = tempDir('vil-home-');
    const projectDir = tempDir('vil-proj-');
    const piDir = tempDir('vil-pi-');
    const codexDir = tempDir('vil-codex-');
    const claudeDir = tempDir('vil-claude-');
    const xdgDir = tempDir('vil-xdg-');
    mkdirSync(join(xdgDir, 'opencode'), { recursive: true });

    expect(
      detectHarnesses({
        homeDir,
        projectDir,
        pathEnv: '',
        env: {
          PI_CODING_AGENT_DIR: piDir,
          CODEX_HOME: codexDir,
          CLAUDE_CONFIG_DIR: claudeDir,
          XDG_CONFIG_HOME: xdgDir
        }
      })
    ).toEqual(['pi', 'codex', 'claude-code', 'opencode']);
  });

  it('expands a tilde in a configuration-home override', () => {
    const homeDir = tempDir('vil-home-');
    const projectDir = tempDir('vil-proj-');
    mkdirSync(join(homeDir, 'custom-codex'), { recursive: true });

    expect(
      detectHarnesses({
        homeDir,
        projectDir,
        pathEnv: '',
        env: { CODEX_HOME: '~/custom-codex' }
      })
    ).toEqual(['codex']);
    expect(codexHome(homeDir, { CODEX_HOME: '~/custom-codex' })).toBe(
      join(homeDir, 'custom-codex')
    );
  });

  it('finds a harness configured only inside the current project', () => {
    const request = machine();
    mkdirSync(join(request.projectDir, '.pi'), { recursive: true });
    mkdirSync(join(request.projectDir, '.codex'), { recursive: true });
    writeFileSync(join(request.projectDir, '.codex', 'config.toml'), '');
    writeFileSync(join(request.projectDir, 'opencode.jsonc'), '{}\n');

    expect(detectHarnesses(request)).toEqual(['pi', 'codex', 'opencode']);
  });

  it('finds a Codex standalone release outside the command path', () => {
    const request = machine();
    const releases = join(request.homeDir, '.codex', 'packages', 'standalone', 'releases');
    mkdirSync(join(releases, '0.42.0', 'bin'), { recursive: true });
    writeFileSync(join(releases, '0.42.0', 'bin', 'codex'), '');

    expect(detectHarnesses(request)).toEqual(['codex']);
  });

  it('reports the locations it checked for an absent harness', () => {
    const request = machine({ pathEnv: executableDir('pi') });
    const presence = detectHarnessPresence(request);
    const claude = presenceOf(presence, 'claude-code');

    expect(claude.present).toBe(false);
    expect(describeCheckedEvidence(claude)).toContain(join(request.homeDir, '.claude'));
    expect(describeCheckedEvidence(claude)).toContain(join(request.homeDir, '.claude.json'));
    expect(describeCheckedEvidence(claude)).toContain('command claude');
  });
});

describe('harness detection by command', () => {
  it('finds a harness whose command resolves on the path', () => {
    const request = machine({ pathEnv: executableDir('pi', 'codex', 'claude', 'opencode') });
    expect(detectHarnesses(request)).toEqual(['pi', 'codex', 'claude-code', 'opencode']);
  });

  it('accepts the opencode alias', () => {
    const request = machine({ pathEnv: executableDir('opencode2') });
    expect(detectHarnesses(request)).toEqual(['opencode']);
  });

  it('ignores a non-executable file with a harness command name', () => {
    const dir = tempDir('vil-bin-');
    writeFileSync(join(dir, 'codex'), '');
    expect(detectHarnesses(machine({ pathEnv: dir }))).toEqual([]);
  });

  it('ignores a directory with a harness command name', () => {
    const dir = tempDir('vil-bin-');
    mkdirSync(join(dir, 'pi'));
    expect(detectHarnesses(machine({ pathEnv: dir }))).toEqual([]);
  });

  it('reads the path from the environment when none is given', () => {
    const dir = executableDir('codex');
    expect(
      detectHarnesses({ homeDir: tempDir('vil-home-'), projectDir: tempDir('vil-proj-'), env: { PATH: dir } })
    ).toEqual(['codex']);
  });

  it('resolves an executable command to its full path', () => {
    const dir = executableDir('claude');
    expect(resolveCommand('claude', dir)).toBe(join(dir, 'claude'));
    expect(resolveCommand('claude', '')).toBeUndefined();
  });

  it('detects nothing on an empty machine', () => {
    const presence = detectHarnessPresence(machine());
    expect(presenceOf(presence, 'pi').present).toBe(false);
    expect(presenceOf(presence, 'claude-code').present).toBe(false);
    expect(presenceOf(presence, 'opencode').present).toBe(false);
    expect(presenceOf(presence, 'codex').present).toBe(systemCodexPresent);
  });
});

describe('harness descriptors', () => {
  it('lists the system locations each harness checks', () => {
    expect(HARNESS_DESCRIPTORS.codex.extraPaths('/home/u', {})).toContain('/etc/codex');
    expect(HARNESS_DESCRIPTORS.pi.commandNames).toEqual(['pi']);
    expect(HARNESS_DESCRIPTORS.opencode.commandNames).toEqual(['opencode', 'opencode2']);
  });

  it('keeps the detection order stable', () => {
    expect(detectHarnessPresence(machine()).map((presence) => presence.harness)).toEqual([
      'pi',
      'codex',
      'claude-code',
      'opencode'
    ]);
  });
});

describe('configuration-home overrides and the paths they resolve', () => {
  it('keeps the home state file as Claude evidence when a configuration dir is overridden', () => {
    const homeDir = tempDir('vil-home-');
    const projectDir = tempDir('vil-proj-');
    const claudeDir = tempDir('vil-claude-');
    writeFileSync(join(homeDir, '.claude.json'), '{ "projects": {} }\n');

    const presence = presenceOf(
      detectHarnessPresence({
        homeDir,
        projectDir,
        pathEnv: '',
        env: { CLAUDE_CONFIG_DIR: claudeDir }
      }),
      'claude-code'
    );
    expect(presence.present).toBe(true);
    expect(describeCheckedEvidence(presence)).toContain(join(homeDir, '.claude.json'));
  });

  it('resolves each write location from the same overrides as detection', () => {
    const homeDir = tempDir('vil-home-');
    const env = {
      CODEX_HOME: tempDir('vil-codex-'),
      XDG_CONFIG_HOME: tempDir('vil-xdg-'),
      PI_CODING_AGENT_DIR: tempDir('vil-pi-agent-')
    };

    expect(codexHome(homeDir, env)).toBe(env.CODEX_HOME);
    expect(opencodeConfigDir(homeDir, env)).toBe(join(env.XDG_CONFIG_HOME, 'opencode'));
    expect(piAgentDir(homeDir, env)).toBe(env.PI_CODING_AGENT_DIR);
    expect(describeCheckedEvidence(presenceOf(detectHarnessPresence({
      homeDir,
      projectDir: tempDir('vil-proj-'),
      pathEnv: '',
      env
    }), 'codex'))).toContain(env.CODEX_HOME);
  });
});
