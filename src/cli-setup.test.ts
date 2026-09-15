import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applySetup, mergeMcpConfig, planSetup } from './cli-setup.js';

function options(overrides = {}): Parameters<typeof planSetup>[0] {
  return {
    packageDir: process.cwd(),
    homeDir: mkdtempSync(join(tmpdir(), 'vil-home-')),
    projectDir: mkdtempSync(join(tmpdir(), 'vil-proj-')),
    global: false,
    printOnly: false,
    withSkill: true,
    ...overrides
  };
}

describe('setup', () => {
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

  it('writes project config and the global skill by default', () => {
    const opts = options();
    const plan = planSetup(opts);
    expect(plan.mcpConfigPath).toBe(join(opts.projectDir, '.mcp.json'));
    const wrote = applySetup(plan, opts);
    expect(wrote).toHaveLength(2);
    const config = JSON.parse(readFileSync(plan.mcpConfigPath, 'utf8')) as {
      mcpServers: Record<string, unknown>;
    };
    expect(config.mcpServers['visual-intent-layer']).toBeDefined();
    expect(readFileSync(plan.skillTarget, 'utf8')).toContain('name: visual-intent');
  });

  it('targets the global config with --global', () => {
    const opts = options({ global: true });
    const plan = planSetup(opts);
    expect(plan.mcpConfigPath).toBe(join(opts.homeDir, '.config', 'mcp', 'mcp.json'));
    applySetup(plan, opts);
    expect(existsSync(plan.mcpConfigPath)).toBe(true);
  });

  it('writes nothing in print-only mode', () => {
    const opts = options({ printOnly: true });
    const plan = planSetup(opts);
    expect(applySetup(plan, opts)).toHaveLength(0);
    expect(existsSync(plan.mcpConfigPath)).toBe(false);
    expect(plan.mcpConfigJson).toContain('visual-intent-layer');
  });

  it('fails loudly when the skill is missing from the install', () => {
    const opts = options({ packageDir: mkdtempSync(join(tmpdir(), 'vil-empty-')) });
    const plan = planSetup(opts);
    expect(() => applySetup(plan, opts)).toThrow(/Skill source missing/);
  });
});
