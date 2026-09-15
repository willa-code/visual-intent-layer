export type HostCapabilities = {
  embeddedUI: boolean;
  steering: boolean;
  subscriptions: boolean;
};

export type DeliveryIntent = 'draft' | 'steering' | 'next-pass' | 'review-interruption';

export type DeliveryPlan = {
  strategy: 'deliver-now' | 'queue-local' | 'draft-only';
  label: string;
};

const BASELINE: HostCapabilities = { embeddedUI: false, steering: false, subscriptions: false };

export function detectCapabilities(hostId: string, declared: Partial<HostCapabilities> = {}): HostCapabilities {
  void hostId;
  return {
    embeddedUI: declared.embeddedUI ?? BASELINE.embeddedUI,
    steering: declared.steering ?? BASELINE.steering,
    subscriptions: declared.subscriptions ?? BASELINE.subscriptions
  };
}

export function describeCapabilities(caps: HostCapabilities): string {
  const view = caps.embeddedUI ? 'Embedded review' : 'Browser review (complete fallback experience)';
  const steering = caps.steering ? 'steering at next safe boundary' : 'no active-turn steering';
  const live = caps.subscriptions ? 'live updates' : 'polling updates';
  return `${view}; ${steering}; ${live}.`;
}

export function deliveryPlan(caps: HostCapabilities, intent: DeliveryIntent): DeliveryPlan {
  switch (intent) {
    case 'draft':
      return { strategy: 'draft-only', label: 'Draft stays on this machine; nothing is sent.' };
    case 'next-pass':
      return {
        strategy: 'queue-local',
        label: 'Queued locally for a clean subsequent turn; no agent-side effect until delivered.'
      };
    case 'steering':
      if (caps.steering) {
        return {
          strategy: 'deliver-now',
          label: 'Steering applies at the next safe boundary supported by the host; it never cancels work instantly.'
        };
      }
      return {
        strategy: 'queue-local',
        label:
          'Steering is unsupported on this host, so this intent is held for the next turn. Active work will not be interrupted.'
      };
    case 'review-interruption':
      if (caps.steering) {
        return {
          strategy: 'deliver-now',
          label: 'Explicit interruption requested: active work stops at the next safe boundary and control returns to you.'
        };
      }
      return {
        strategy: 'draft-only',
        label:
          'Interruption is not available on this host, so this request stays an explicit local draft. Nothing was stopped.'
      };
  }
}
