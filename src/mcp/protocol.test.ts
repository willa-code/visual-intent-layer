import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { representativeEnvelope } from '../envelope/fixtures.js';
import { createMcpServer } from './server.js';
import { createReviewService } from './service.js';

process.env['VISUAL_INTENT_NO_OPEN'] = '1';

async function connected(): Promise<Client> {
  const service = createReviewService({ dataDir: mkdtempSync(join(tmpdir(), 'vil-mcp-protocol-')) });
  const server = createMcpServer(service);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

describe('MCP protocol contract', () => {
  it('lists the entry tool with a self-describing definition', async () => {
    const client = await connected();
    const tools = await client.listTools();
    const entry = tools.tools.find((tool) => tool.name === 'open_visual_review');
    expect(entry).toBeDefined();
    expect(entry!.description).toMatch(/Visual Direction Loop/);
    expect(entry!.inputSchema).toMatchObject({ type: 'object' });
  });

  it('opens an artifact through the entry tool call and hands back the batch or a stepped-away status', async () => {
    const client = await connected();
    const result = await client.callTool({
      name: 'open_visual_review',
      arguments: { kind: 'saved-html', path: 'fixtures/gallery.html', waitMs: 0 }
    });
    const text = toolText(result);
    expect(text).toContain('session-');
    expect(text).toContain('blake3:');
    expect(text).toContain('stepped-away');
  });

  it('acknowledges a delivered batch through ordinary tool calls', async () => {
    const client = await connected();
    await client.callTool({
      name: 'open_visual_review',
      arguments: { kind: 'saved-html', path: 'fixtures/gallery.html', waitMs: 0 }
    });
    const result = await client.callTool({
      name: 'acknowledge_intent',
      arguments: { envelopeId: 'unknown-envelope', agentId: 'agent-1' }
    });
    expect(result.isError).toBe(true);
    expect(toolText(result)).toMatch(/Unknown envelope/);
  });

  it('rejects unknown tools with a tool error', async () => {
    const client = await connected();
    const result = await client.callTool({ name: 'delete_everything', arguments: {} });
    expect(result.isError).toBe(true);
    expect(toolText(result)).toContain('Unknown tool');
  });

  it('does not expose envelope submission as a model-visible tool', async () => {
    const client = await connected();
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).not.toContain('submit_visual_intent');
    void representativeEnvelope;
  });
});

function toolText(result: unknown): string {
  if (typeof result !== 'object' || result === null || !('content' in result)) {
    return '';
  }
  const content = (result as { content: Array<{ type: string; text?: string }> }).content;
  return content.map((part) => (part.type === 'text' ? (part.text ?? '') : '')).join('\n');
}