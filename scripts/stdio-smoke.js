import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/mcp/stdio.js'],
  env: { ...process.env, VISUAL_INTENT_DATA_DIR: mkdtempSync(join(tmpdir(), 'vil-stdio-')) }
});
const client = new Client({ name: 'stdio-smoke', version: '0.0.0' });
await client.connect(transport);
const tools = await client.listTools();
console.log('tools:', tools.tools.map((t) => t.name).join(', '));
const opened = await client.callTool({
  name: 'open_visual_review',
  arguments: { kind: 'saved-html', path: 'fixtures/gallery.html' }
});
console.log('open result isError:', opened.isError ?? false);
console.log(JSON.stringify(opened.content).slice(0, 300));
await transport.close();
