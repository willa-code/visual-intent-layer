#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { startLocalService } from '../service/http.js';
import { createMcpServer } from './server.js';
import { createReviewService } from './service.js';

const dataDir =
  process.env['VISUAL_INTENT_DATA_DIR'] ?? join(homedir(), '.visual-intent-layer', 'data');
const port = Number(process.env['VISUAL_INTENT_PORT'] ?? 3742);
const reviewBaseUrl = process.env['VISUAL_INTENT_REVIEW_URL'] ?? `http://127.0.0.1:${port}`;

const service = createReviewService({ dataDir, reviewBaseUrl });
try {
  const local = await startLocalService({ dataDir, reviewService: service, port });
  console.error(`visual-intent review service on ${local.baseUrl}`);
} catch (error) {
  console.error(
    `visual-intent review service unavailable (${error instanceof Error ? error.message : error}); ` +
      'start it with `visual-intent serve` so review URLs load.'
  );
}
const server = createMcpServer(service);
const transport = new StdioServerTransport();
await server.connect(transport);
