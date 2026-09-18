export const ARTIFACT_FRAME_CLASS = 'artifact-frame';
export const ARTIFACT_FRAME_SESSION_ATTRIBUTE = 'data-vil-session';

export function isArtifactDocument(frameElement: Element | null | undefined, sessionId: string): boolean {
  if (frameElement === null || frameElement === undefined || sessionId.length === 0) {
    return false;
  }
  return (
    frameElement.classList.contains(ARTIFACT_FRAME_CLASS) &&
    frameElement.getAttribute(ARTIFACT_FRAME_SESSION_ATTRIBUTE) === sessionId
  );
}
