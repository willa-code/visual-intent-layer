import { describe, expect, it } from 'vitest';
import { deliveryPlan, describeCapabilities, detectCapabilities } from './capabilities.js';

describe('host capability negotiation', () => {
  it('treats pi as browser-fallback first with no steering or subscriptions', () => {
    const caps = detectCapabilities('pi');
    expect(caps).toEqual({ embeddedUI: false, steering: false, subscriptions: false });
  });

  it('defaults unknown hosts to baseline with explicit labels', () => {
    const caps = detectCapabilities('some-future-host');
    expect(caps).toEqual({ embeddedUI: false, steering: false, subscriptions: false });
    expect(describeCapabilities(caps)).toContain('Browser review');
  });

  it('honors declared capabilities only for known keys', () => {
    const caps = detectCapabilities('pi', { steering: true, embeddedUI: true });
    expect(caps).toEqual({ embeddedUI: true, steering: true, subscriptions: false });
  });

  it('uses the embedded view only where the host implements it', () => {
    expect(detectCapabilities('pi').embeddedUI).toBe(false);
    expect(detectCapabilities('mcp-app-host', { embeddedUI: true }).embeddedUI).toBe(true);
  });
});

describe('delivery policy', () => {
  it('delivers next-pass and draft locally without host promises', () => {
    const caps = detectCapabilities('pi');
    expect(deliveryPlan(caps, 'next-pass').strategy).toBe('queue-local');
    expect(deliveryPlan(caps, 'draft').strategy).toBe('draft-only');
  });

  it('never masquerades unsupported steering as active-turn steering', () => {
    const caps = detectCapabilities('pi');
    const plan = deliveryPlan(caps, 'steering');
    expect(plan.strategy).toBe('queue-local');
    expect(plan.label).toMatch(/not.*interrupt|unsupported|next.*turn/i);
  });

  it('offers steering at the next safe boundary where the host exposes it', () => {
    const caps = detectCapabilities('mcp-app-host', { steering: true });
    const plan = deliveryPlan(caps, 'steering');
    expect(plan.strategy).toBe('deliver-now');
    expect(plan.label).toMatch(/next safe boundary/);
    expect(plan.label).toMatch(/never cancels work instantly/);
  });

  it('keeps review interruption explicit and only where representable', () => {
    const unsupported = deliveryPlan(detectCapabilities('pi'), 'review-interruption');
    expect(unsupported.strategy).toBe('draft-only');
    expect(unsupported.label).toMatch(/explicit|not.*available/i);
    const supported = deliveryPlan(detectCapabilities('h', { steering: true }), 'review-interruption');
    expect(supported.strategy).toBe('deliver-now');
  });
});
