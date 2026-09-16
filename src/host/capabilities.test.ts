import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as capabilities from './capabilities.js';
import { describeCapabilities, detectCapabilities } from './capabilities.js';
import { createReviewService } from '../mcp/service.js';

describe('host capability negotiation', () => {
  it('treats pi as browser-fallback first with no embedded UI or subscriptions', () => {
    const caps = detectCapabilities('pi');
    expect(caps).toEqual({ embeddedUI: false, subscriptions: false });
  });

  it('defaults unknown hosts to baseline with explicit labels', () => {
    const caps = detectCapabilities('some-future-host');
    expect(caps).toEqual({ embeddedUI: false, subscriptions: false });
    expect(describeCapabilities(caps)).toContain('Browser review');
  });

  it('honors declared capabilities for the keys the product can honour', () => {
    const caps = detectCapabilities('pi', { embeddedUI: true, subscriptions: true });
    expect(caps).toEqual({ embeddedUI: true, subscriptions: true });
  });

  it('uses the embedded view only where the host implements it', () => {
    expect(detectCapabilities('pi').embeddedUI).toBe(false);
    expect(detectCapabilities('mcp-app-host', { embeddedUI: true }).embeddedUI).toBe(true);
  });

  it('no longer exposes a capability flag nothing branches on', () => {
    expect('steering' in detectCapabilities('pi')).toBe(false);
    expect('deliveryPlan' in capabilities).toBe(false);
    expect('DeliveryPlan' in capabilities).toBe(false);
  });
});

describe('the surviving declaration path', () => {
  it('lets a host declare embeddedUI and subscriptions through the MCP tool schema', () => {
    const service = createReviewService({ dataDir: mkdtempSync(join(tmpdir(), 'vil-caps-')) });
    const entry = service.listTools().find((tool) => tool.name === 'open_visual_review');
    const schema = entry!.inputSchema as {
      properties?: Record<string, { properties?: Record<string, unknown> }>;
    };
    expect(schema.properties?.['capabilities']?.properties).toMatchObject({
      embeddedUI: { type: 'boolean' },
      subscriptions: { type: 'boolean' }
    });
  });

  it('stores what a host declared on the session rather than discarding it', async () => {
    const service = createReviewService({ dataDir: mkdtempSync(join(tmpdir(), 'vil-caps-')) });
    const opened = await service.openArtifact(
      { kind: 'saved-html', path: 'fixtures/gallery.html' },
      { capabilities: { embeddedUI: true, subscriptions: true } }
    );
    expect(service.sessions.get(opened.sessionId)?.capabilities).toEqual({ embeddedUI: true, subscriptions: true });
  });
});
