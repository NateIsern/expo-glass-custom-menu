// Backdrop in Skia (docs/glass-web-architecture.md, section b). Loaded lazily (WithSkiaWeb).
//
// Draws the scene into an offscreen surface once per (scene, size, DPR) and keeps the snapshot.
// The visible background is that same snapshot drawn on a Canvas, so what the glass samples is
// exactly what the user sees. Children (the DOM layer: toolbar, menus) render above it.
import { useEffect, useMemo, type ReactElement, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Canvas, Image, Skia, TileMode, type SkImage } from "react-native-skia";

import { MenuBackdropContext, type TBackdropHandle, type TBackdropScene } from "./menu-backdrop-context.web";
import { perfCount } from "./glass-perf.web";
import { prewarmGlass } from "./glass-surface.web";

type TBackdropSurfaceProps = {
  scene: TBackdropScene;
  width: number;
  height: number;
  dprCap: number;
  children?: ReactNode;
};

// Budget counters (read by the measurement scripts; not used by the UI).
type TBackdropStats = {
  snapshots: number;
  snapshotMs: number;
  blurPasses: number;
  blurMs: number;
  pixelWidth: number;
  pixelHeight: number;
  bytes: number;
  scale: number;
};
const stats: TBackdropStats = { snapshots: 0, snapshotMs: 0, blurPasses: 0, blurMs: 0, pixelWidth: 0, pixelHeight: 0, bytes: 0, scale: 1 };
const publishStats = (): void => {
  if (typeof window !== "undefined") (window as unknown as { __glassBackdrop?: TBackdropStats }).__glassBackdrop = { ...stats };
};

const BLUR_STEP = 2; // dp: blur radii are quantized so a morph reuses a few blurred snapshots
const EVICTED_DISPOSE_DELAY_MS = 1000;
const MAX_BLURRED = 6;

const drawScene = (scene: TBackdropScene, width: number, height: number, scale: number): SkImage | null => {
  perfCount("backdropSnapshot");
  const started = performance.now();
  const pw = Math.max(1, Math.round(width * scale));
  const ph = Math.max(1, Math.round(height * scale));
  const surface = Skia.Surface.MakeOffscreen(pw, ph);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  canvas.clear(Skia.Color(scene.background));
  const paint = Skia.Paint();
  for (const shape of scene.shapes) {
    paint.setColor(Skia.Color(shape.color));
    const rect = Skia.XYWHRect(shape.x, shape.y, shape.width, shape.height);
    canvas.drawRRect(Skia.RRectXY(rect, shape.radius, shape.radius), paint);
  }
  paint.dispose();
  const image = surface.makeImageSnapshot();
  surface.dispose();
  stats.snapshots += 1;
  stats.snapshotMs += performance.now() - started;
  stats.pixelWidth = pw;
  stats.pixelHeight = ph;
  stats.bytes = pw * ph * 4;
  stats.scale = scale;
  publishStats();
  return image;
};

// Gaussian blur of the snapshot with sigma = radius (dp), as Android createBlurEffect(radius).
const blurSnapshot = (image: SkImage, radius: number, scale: number, width: number, height: number): SkImage | null => {
  perfCount("blurPass");
  const started = performance.now();
  const surface = Skia.Surface.MakeOffscreen(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  const paint = Skia.Paint();
  paint.setImageFilter(Skia.ImageFilter.MakeBlur(radius, radius, TileMode.Clamp, null));
  canvas.drawImageRect(image, Skia.XYWHRect(0, 0, image.width(), image.height()), Skia.XYWHRect(0, 0, width, height), paint);
  paint.dispose();
  const out = surface.makeImageSnapshot();
  surface.dispose();
  stats.blurPasses += 1;
  stats.blurMs += performance.now() - started;
  publishStats();
  return out;
};

const BackdropSurface = ({ scene, width, height, dprCap, children }: TBackdropSurfaceProps): ReactElement => {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const scale = Math.min(dpr, dprCap);
  // One snapshot per (scene, size, scale). It is not redrawn per frame.
  const image: SkImage | null = useMemo(
    () => drawScene(scene, width, height, scale),
    [scene, width, height, scale],
  );
  // Blurred variants of the snapshot, created on demand per quantized radius and released with it.
  const handle: TBackdropHandle = useMemo(() => {
    const cache = new Map<number, SkImage>();
    return {
      image,
      scale,
      blurred: (radius: number): SkImage | null => {
        if (!image) return null;
        const key = Math.round(radius / BLUR_STEP) * BLUR_STEP;
        if (key <= 0) return image;
        const hit = cache.get(key);
        if (hit) return hit;
        if (cache.size >= MAX_BLURRED) {
          const first = cache.keys().next().value;
          if (first !== undefined) {
            // Two panels (root and submenu layer) share this cache: an evicted image may still be drawn
            // this frame, so it is disposed a moment later, not now.
            const evicted = cache.get(first);
            cache.delete(first);
            if (evicted) setTimeout((): void => evicted.dispose(), EVICTED_DISPOSE_DELAY_MS);
          }
        }
        const blurredImage = blurSnapshot(image, key, scale, width, height);
        if (blurredImage) cache.set(key, blurredImage);
        return blurredImage;
      },
      dispose: (): void => {
        cache.forEach((value: SkImage): void => value.dispose());
        cache.clear();
      },
    } as TBackdropHandle & { dispose: () => void };
  }, [image, scale, width, height]);
  useEffect((): (() => void) => {
    // Warm the glass pipelines once the snapshot exists, so the first menu open does not pay for it.
    const timer = setTimeout((): void => prewarmGlass(image, scale, width, height), 0);
    return (): void => {
      clearTimeout(timer);
      (handle as TBackdropHandle & { dispose: () => void }).dispose();
      image?.dispose();
    };
  }, [handle, image, scale, width, height]);

  return (
    <MenuBackdropContext.Provider value={handle}>
      <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="box-none">
        {image ? (
          <Canvas style={{ position: "absolute", left: 0, top: 0, width, height }} pointerEvents="none">
            <Image image={image} x={0} y={0} width={width} height={height} fit="fill" />
          </Canvas>
        ) : null}
        {children}
      </View>
    </MenuBackdropContext.Provider>
  );
};

export { BackdropSurface, stats as backdropStats, type TBackdropSurfaceProps };
export default BackdropSurface;
