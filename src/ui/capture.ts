export type CaptureResult = { ok: true; blob: Blob } | { ok: false; reason: string };

export const CAPTURE_SUPPORT_STATEMENT =
  'A Captured View needs Chromium desktop, and the browser asks once per capture; that permission cannot be persisted.';

type DisplayCaptureOptions = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: 'include' | 'exclude';
};

export function captureAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function';
}

export function captureUnavailableReason(): string {
  if (!captureAvailable()) {
    return `${CAPTURE_SUPPORT_STATEMENT} This browser has no display-capture API, so a Captured View is unavailable here.`;
  }
  return CAPTURE_SUPPORT_STATEMENT;
}

export async function captureArtifactView(element: HTMLElement): Promise<CaptureResult> {
  if (!captureAvailable()) {
    return { ok: false, reason: captureUnavailableReason() };
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser' },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include'
    } as DisplayCaptureOptions);
  } catch (error) {
    return {
      ok: false,
      reason: `A Captured View was not taken because the permission was not granted (${messageOf(error)}). Nothing was captured and no re-render was substituted.`
    };
  }
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play().catch(() => undefined);
    await waitForMetadata(video);
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return { ok: false, reason: 'The browser returned no pixels for this capture, so no Captured View was stored.' };
    }
    const rect = element.getBoundingClientRect();
    const scaleX = video.videoWidth / window.innerWidth;
    const scaleY = video.videoHeight / window.innerHeight;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(rect.width * scaleX));
    canvas.height = Math.max(1, Math.round(rect.height * scaleY));
    const context = canvas.getContext('2d');
    if (!context) {
      return { ok: false, reason: 'The browser refused a 2D canvas, so no Captured View was stored.' };
    }
    context.drawImage(
      video,
      Math.round(rect.left * scaleX),
      Math.round(rect.top * scaleY),
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
    const blob = await new Promise<Blob | null>((resolvePromise) => canvas.toBlob((value) => resolvePromise(value), 'image/png'));
    if (!blob) {
      return { ok: false, reason: 'The browser could not encode the capture, so no Captured View was stored.' };
    }
    return { ok: true, blob };
  } finally {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }
}

function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.videoWidth > 0) {
    return Promise.resolve();
  }
  return new Promise((resolvePromise) => {
    const timer = setTimeout(resolvePromise, 2000);
    video.addEventListener(
      'loadedmetadata',
      () => {
        clearTimeout(timer);
        resolvePromise();
      },
      { once: true }
    );
  });
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
