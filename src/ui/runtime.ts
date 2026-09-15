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

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let timer: number | undefined;
  return (...args: A) => {
    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => fn(...args), ms);
  };
}