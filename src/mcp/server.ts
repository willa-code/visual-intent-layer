import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult
} from '@modelcontextprotocol/sdk/types.js';
import { autoOpenSuppressed } from '../service/browser.js';
import type { ReviewService } from './service.js';

export const SERVER_NAME = 'visual-intent-layer';
export const SERVER_VERSION = '0.3.0-next.0';

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
          return ok(await openVisualReview(service, args));
        case 'get_intent_status':
          return ok(service.getBatchStatus(stringArg(args, 'envelopeId')));
        case 'acknowledge_intent':
          return ok(
            await service.acknowledge(
              stringArg(args, 'envelopeId'),
              stringArg(args, 'agentId'),
              optionalString(args, 'annotationId')
            )
          );
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

async function openVisualReview(service: ReviewService, args: Record<string, unknown>): Promise<unknown> {
  const opened = await service.openArtifact(openArgs(args), { openBrowser: !autoOpenSuppressed() });
  service.noteAgentContact(opened.sessionId);
  const noWait = envTruthy(process.env['VISUAL_INTENT_NO_WAIT']) || args['waitMs'] === 0;
  const waitMs = numberArg(args, 'waitMs') ?? service.waitMs;
  const batch = noWait ? null : await service.waitForSend(opened.sessionId, waitMs);
  const queued = service.annotations.queueOf(opened.artifact.id).length;
  return {
    reviewUrl: opened.reviewUrl,
    artifact: opened.artifact,
    reused: opened.reused,
    status: batch ? 'sent' : 'stepped-away',
    envelope: batch?.envelope ?? null,
    annotationIds: batch?.annotationIds ?? [],
    queuedAnnotations: queued,
    note: batch
      ? 'The human sent this batch. Each Annotation carries its own identity. Acknowledgement is not completion and does not verify anything.'
      : 'The host could not hold the call for the human. Nothing is lost: Annotations stay queued durably on this machine, and get_intent_status reads them.'
  };
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

function optionalString(args: Record<string, unknown>, name: string): string | undefined {
  const value = args[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberArg(args: Record<string, unknown>, name: string): number | undefined {
  const value = args[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function envTruthy(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false' && normalized !== 'no';
}