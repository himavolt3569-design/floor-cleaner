export const SURFACE_IMAGERY: Record<string, string> = {
  "/surfaces/marble.webp": "/imagery/marble-interior.png",
  "/surfaces/granite.webp": "/imagery/granite-detail.png",
  "/surfaces/tile.webp": "/imagery/tile-interior.png",
};
export const surfaceImage = (path: string) => SURFACE_IMAGERY[path] || path;
