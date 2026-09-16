export type HostCapabilities = {
  embeddedUI: boolean;
  subscriptions: boolean;
};

export type DeliveryIntent = 'steering' | 'next-pass' | 'review-interruption';

const BASELINE: HostCapabilities = { embeddedUI: false, subscriptions: false };

export function detectCapabilities(hostId: string, declared: Partial<HostCapabilities> = {}): HostCapabilities {
  void hostId;
  return {
    embeddedUI: declared.embeddedUI ?? BASELINE.embeddedUI,
    subscriptions: declared.subscriptions ?? BASELINE.subscriptions
  };
}

export function describeCapabilities(caps: HostCapabilities): string {
  const view = caps.embeddedUI ? 'Embedded review' : 'Browser review (complete fallback experience)';
  const live = caps.subscriptions ? 'live updates' : 'polling updates';
  return `${view}; ${live}.`;
}
