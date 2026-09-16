export type ShellConfig = {
  sessionId: string;
  capability: string;
  artifactId: string;
  revision: string;
  kind: string;
  src: string;
  name: string;
};

export function apiBaseUrl(): string {
  return '';
}

export function readConfig(): ShellConfig {
  const body = document.body;
  return {
    sessionId: body.dataset['session'] ?? '',
    capability: body.dataset['cap'] ?? '',
    artifactId: body.dataset['artifactId'] ?? '',
    revision: body.dataset['revision'] ?? '',
    kind: body.dataset['artifactKind'] ?? 'saved-html',
    src: body.dataset['artifactSrc'] ?? '',
    name: body.dataset['artifactName'] ?? 'artifact'
  };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export type Debounced<A extends unknown[]> = ((...args: A) => void) & { cancel: () => void };

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): Debounced<A> {
  let timer: number | undefined;
  const wrapped = (...args: A): void => {
    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, ms);
  };
  wrapped.cancel = (): void => {
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  };
  return wrapped;
}