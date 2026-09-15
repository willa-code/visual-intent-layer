import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const SERVER_NAME = 'visual-intent-layer';
export const SKILL_DIR = 'visual-intent';

export type SetupOptions = {
  packageDir: string;
  homeDir: string;
  projectDir: string;
  global: boolean;
  printOnly: boolean;
  withSkill: boolean;
};

export type SetupPlan = {
  mcpConfigPath: string;
  mcpConfigJson: string;
  skillSource: string;
  skillTarget: string;
};

export function serverEntry(): Record<string, unknown> {
  return {
    [SERVER_NAME]: {
      command: 'visual-intent',
      args: ['mcp']
    }
  };
}

export function planSetup(options: SetupOptions): SetupPlan {
  const mcpConfigPath = options.global
    ? join(options.homeDir, '.config', 'mcp', 'mcp.json')
    : join(options.projectDir, '.mcp.json');
  const existing = existsSync(mcpConfigPath) ? readFileSync(mcpConfigPath, 'utf8') : '';
  return {
    mcpConfigPath,
    mcpConfigJson: mergeMcpConfig(existing, serverEntry()),
    skillSource: join(options.packageDir, 'skills', SKILL_DIR, 'SKILL.md'),
    skillTarget: join(options.homeDir, '.pi', 'agent', 'skills', SKILL_DIR, 'SKILL.md')
  };
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
  if (parsed.mcpServers !== undefined && typeof parsed.mcpServers !== 'object') {
    throw new Error('Existing MCP config has an invalid mcpServers field; refusing to overwrite it.');
  }
  return JSON.stringify({ ...parsed, mcpServers: { ...(parsed.mcpServers ?? {}), ...entry } }, null, 2) + '\n';
}

export function applySetup(plan: SetupPlan, options: SetupOptions): string[] {
  const wrote: string[] = [];
  if (options.printOnly) {
    return wrote;
  }
  mkdirSync(dirname(plan.mcpConfigPath), { recursive: true });
  writeFileSync(plan.mcpConfigPath, plan.mcpConfigJson, 'utf8');
  wrote.push(plan.mcpConfigPath);
  if (options.withSkill) {
    if (!existsSync(plan.skillSource)) {
      throw new Error(`Skill source missing from install: ${plan.skillSource}`);
    }
    mkdirSync(dirname(plan.skillTarget), { recursive: true });
    copyFileSync(plan.skillSource, plan.skillTarget);
    wrote.push(plan.skillTarget);
  }
  return wrote;
}
