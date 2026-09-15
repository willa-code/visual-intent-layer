import { existsSync, readdirSync, statSync } from 'node:fs';
import { delimiter, join } from 'node:path';

export type Harness = 'pi' | 'codex' | 'claude-code' | 'opencode';

export const HARNESSES: readonly Harness[] = ['pi', 'codex', 'claude-code', 'opencode'];

export type SetupEnvironment = Record<string, string | undefined>;

export type DetectionEvidence = {
  kind: 'config' | 'project' | 'extra' | 'command';
  detail: string;
  matched: boolean;
};

export type HarnessPresence = {
  harness: Harness;
  present: boolean;
  evidence: DetectionEvidence[];
};

export type HarnessDescriptor = {
  commandNames: readonly string[];
  globalPaths: (homeDir: string, env: SetupEnvironment) => string[];
  projectPaths: (projectDir: string) => string[];
  extraPaths: (homeDir: string, env: SetupEnvironment) => string[];
};

export type DetectionRequest = {
  homeDir: string;
  projectDir: string;
  pathEnv?: string | undefined;
  env?: SetupEnvironment | undefined;
};

function envValue(env: SetupEnvironment, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = env[name];
    if (value !== undefined && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function expandHome(value: string, homeDir: string): string {
  if (value === '~') {
    return homeDir;
  }
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return join(homeDir, value.slice(2));
  }
  return value;
}

export function configHome(
  homeDir: string,
  env: SetupEnvironment,
  envVars: readonly string[],
  fallback: string
): string {
  const override = envValue(env, envVars);
  return override === undefined ? join(homeDir, fallback) : expandHome(override, homeDir);
}

export function xdgConfigHome(homeDir: string, env: SetupEnvironment): string {
  return configHome(homeDir, env, ['XDG_CONFIG_HOME'], '.config');
}

export function codexHome(homeDir: string, env: SetupEnvironment): string {
  return configHome(homeDir, env, ['CODEX_HOME'], '.codex');
}

export function claudeConfigDir(homeDir: string, env: SetupEnvironment): string {
  return configHome(homeDir, env, ['CLAUDE_CONFIG_DIR'], '.claude');
}

function codexExecutableName(): string {
  return process.platform === 'win32' ? 'codex.exe' : 'codex';
}

function codexStandalonePaths(homeDir: string, env: SetupEnvironment): string[] {
  const releasesDir = join(codexHome(homeDir, env), 'packages', 'standalone', 'releases');
  let releases: string[];
  try {
    releases = readdirSync(releasesDir);
  } catch {
    return [];
  }
  return releases.map((release) => join(releasesDir, release, 'bin', codexExecutableName()));
}

function piGlobalPaths(homeDir: string, env: SetupEnvironment): string[] {
  const override = envValue(env, ['PI_CODING_AGENT_DIR']);
  return override === undefined ? [piAgentDir(homeDir, env), join(homeDir, '.pi')] : [piAgentDir(homeDir, env)];
}

function claudeGlobalPaths(homeDir: string, env: SetupEnvironment): string[] {
  return [claudeConfigDir(homeDir, env), claudeUserStatePath(homeDir)];
}

export function piAgentDir(homeDir: string, env: SetupEnvironment): string {
  return configHome(homeDir, env, ['PI_CODING_AGENT_DIR'], join('.pi', 'agent'));
}

export function claudeUserStatePath(homeDir: string): string {
  return join(homeDir, '.claude.json');
}

export const HARNESS_DESCRIPTORS: Record<Harness, HarnessDescriptor> = {
  pi: {
    commandNames: ['pi'],
    globalPaths: piGlobalPaths,
    projectPaths: (projectDir) => [join(projectDir, '.pi')],
    extraPaths: () => []
  },
  codex: {
    commandNames: ['codex'],
    globalPaths: (homeDir, env) => [codexHome(homeDir, env)],
    projectPaths: (projectDir) => [join(projectDir, '.codex', 'config.toml')],
    extraPaths: (homeDir, env) => ['/etc/codex', ...codexStandalonePaths(homeDir, env)]
  },
  'claude-code': {
    commandNames: ['claude'],
    globalPaths: claudeGlobalPaths,
    projectPaths: () => [],
    extraPaths: () => []
  },
  opencode: {
    commandNames: ['opencode', 'opencode2'],
    globalPaths: (homeDir, env) => [opencodeConfigDir(homeDir, env)],
    projectPaths: (projectDir) => [
      join(projectDir, 'opencode.json'),
      join(projectDir, 'opencode.jsonc')
    ],
    extraPaths: () => []
  }
};

export function opencodeConfigDir(homeDir: string, env: SetupEnvironment): string {
  return join(xdgConfigHome(homeDir, env), 'opencode');
}

function commandCandidates(dir: string, command: string): string[] {
  const base = join(dir, command);
  if (process.platform !== 'win32' || command.includes('.')) {
    return [base];
  }
  return [base, ...['.exe', '.cmd', '.bat', '.ps1'].map((extension) => `${base}${extension}`)];
}

function isExecutableFile(path: string): boolean {
  let stats;
  try {
    stats = statSync(path);
  } catch {
    return false;
  }
  if (!stats.isFile()) {
    return false;
  }
  return process.platform === 'win32' || (stats.mode & 0o111) !== 0;
}

export function resolveCommand(command: string, pathEnv: string | undefined): string | undefined {
  for (const dir of (pathEnv ?? '').split(delimiter)) {
    if (dir.length === 0) {
      continue;
    }
    for (const candidate of commandCandidates(dir, command)) {
      if (isExecutableFile(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

function pathsToEvidence(kind: DetectionEvidence['kind'], paths: string[]): DetectionEvidence[] {
  return paths.map((path) => ({ kind, detail: path, matched: existsSync(path) }));
}

function describeEvidence(descriptor: HarnessDescriptor, request: DetectionRequest): DetectionEvidence[] {
  const { homeDir, projectDir } = request;
  const env = request.env ?? process.env;
  const pathEnv = request.pathEnv ?? env['PATH'];
  return [
    ...pathsToEvidence('config', descriptor.globalPaths(homeDir, env)),
    ...pathsToEvidence('project', descriptor.projectPaths(projectDir)),
    ...pathsToEvidence('extra', descriptor.extraPaths(homeDir, env)),
    ...descriptor.commandNames.map((command): DetectionEvidence => ({
      kind: 'command',
      detail: command,
      matched: resolveCommand(command, pathEnv) !== undefined
    }))
  ];
}

export function detectHarnessPresence(request: DetectionRequest): HarnessPresence[] {
  return HARNESSES.map((harness) => {
    const evidence = describeEvidence(HARNESS_DESCRIPTORS[harness], request);
    return { harness, present: evidence.some((item) => item.matched), evidence };
  });
}

export function detectHarnesses(request: DetectionRequest): Harness[] {
  return detectHarnessPresence(request)
    .filter((presence) => presence.present)
    .map((presence) => presence.harness);
}

export function describeCheckedEvidence(presence: HarnessPresence): string {
  return presence.evidence
    .map((item) => (item.kind === 'command' ? `command ${item.detail}` : item.detail))
    .join(', ');
}
