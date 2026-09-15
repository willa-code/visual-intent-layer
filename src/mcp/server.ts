import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult
} from '@modelcontextprotocol/sdk/types.js';
import type { ReviewService } from './service.js';

export const SERVER_NAME = 'visual-intent-layer';
export const SERVER_VERSION = '0.1.0';

export function createMcpServer(service: ReviewService): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: service.listTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as { type: 'object'; properties?: Record<string, unknown> }
    }))
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    try {
      switch (request.params.name) {
        case 'open_visual_review':
          return ok(await service.openArtifact(openArgs(args)));
        case 'submit_visual_intent':
          return ok(await service.submitIntent(args['envelope']));
        case 'get_intent_status':
          return ok(service.getIntent(stringArg(args, 'envelopeId')));
        case 'acknowledge_intent':
          return ok(await service.acknowledgeIntent(stringArg(args, 'envelopeId'), stringArg(args, 'agentId')));
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true
      };
    }
  });

  return server;
}

function ok(value: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

function openArgs(args: Record<string, unknown>):
  | { kind: 'saved-html'; path: string }
  | { kind: 'react-vite-app'; url: string } {
  if (args['kind'] === 'saved-html') {
    return { kind: 'saved-html', path: stringArg(args, 'path') };
  }
  if (args['kind'] === 'react-vite-app') {
    return { kind: 'react-vite-app', url: stringArg(args, 'url') };
  }
  throw new Error('open_visual_review requires kind "saved-html" (with path) or "react-vite-app" (with url)');
}

function stringArg(args: Record<string, unknown>, name: string): string {
  const value = args[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required string argument: ${name}`);
  }
  return value;
}
