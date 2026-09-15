import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { representativeEnvelope } from '../envelope/fixtures.js';
import { createMcpServer } from './server.js';
import { createReviewService } from './service.js';

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

  it('opens an artifact through the entry tool call', async () => {
    const client = await connected();
    const result = await client.callTool({
      name: 'open_visual_review',
      arguments: { kind: 'saved-html', path: 'fixtures/gallery.html' }
    });
    const text = toolText(result);
    expect(text).toContain('session-');
    expect(text).toContain('blake3:');
  });

  it('submits an envelope through ordinary tool calls with structured results', async () => {
    const client = await connected();
    const result = await client.callTool({
      name: 'submit_visual_intent',
      arguments: { envelope: structuredClone(representativeEnvelope) as unknown as Record<string, unknown> }
    });
    const text = toolText(result);
    expect(text).toContain('host-accepted');
    expect(text).toContain(representativeEnvelope.envelopeId);
  });

  it('returns a proper tool error for malformed envelopes', async () => {
    const client = await connected();
    const result = await client.callTool({
      name: 'submit_visual_intent',
      arguments: { envelope: { schemaVersion: '0.1' } }
    });
    expect(result.isError).toBe(true);
    expect(toolText(result)).toMatch(/Invalid Visual Intent Envelope/);
  });

  it('rejects unknown tools with a tool error', async () => {
    const client = await connected();
    const result = await client.callTool({ name: 'delete_everything', arguments: {} });
    expect(result.isError).toBe(true);
    expect(toolText(result)).toContain('Unknown tool');
  });
});

function toolText(result: unknown): string {
  if (typeof result !== 'object' || result === null || !('content' in result)) {
    return '';
  }
  const content = (result as { content: Array<{ type: string; text?: string }> }).content;
  return content.map((part) => (part.type === 'text' ? (part.text ?? '') : '')).join('\n');
}
