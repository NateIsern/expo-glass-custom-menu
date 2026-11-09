// Test screen for the Skia backdrop + GlassSurface slice (web only).
// The skeleton is drawn in Skia (scene below); the library toolbar and its menu are the real
// components, and the menu samples the Skia snapshot.
import { LibraryToolbar } from "@/components/library-toolbar";
import { Menu } from "../../modules/glass-menu-android";
import { PALETTE } from "@/constants/palette.const";
import {
  SKELETON_AVATAR_SIZE,
  SKELETON_BONE_COLOR,
  SKELETON_GAP,
  SKELETON_GUTTER,
  SKELETON_HEADER_HEIGHT,
  SKELETON_HERO_HEIGHT_RATIO,
  SKELETON_HERO_RADIUS,
  SKELETON_META_LINE_HEIGHT,
  SKELETON_META_PRIMARY_WIDTH,
  SKELETON_META_SECONDARY_WIDTH,
  SKELETON_SECTION_GAP,
  SKELETON_SURFACE_COLOR,
  SKELETON_TILE_COUNT,
  SKELETON_TILE_HEIGHT_RATIO,
  SKELETON_TILE_RADIUS,
  SKELETON_TITLE_HEIGHT,
  SKELETON_TITLE_WIDTH,
} from "@/constants/components/skeleton-list.const";
import { LIBRARY_TOOLBAR_TOP_OFFSET } from "@/constants/components/library-toolbar.const";
import { MenuBackdrop } from "../../modules/glass-menu-android/src/components/menu-trigger/menu-backdrop.web";
import type { TBackdropScene, TBackdropShape } from "../../modules/glass-menu-android/src/components/menu-trigger/menu-backdrop-context.web";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { perfEnabled, perfSnapshot } from "../../modules/glass-menu-android/src/components/menu-trigger/glass-perf.web";

// The SkeletonList layout (src/components/skeleton-list/skeleton-list.tsx) as data, in dp.
// Same constants and the same flex rules: rows of 2 tiles with gap SKELETON_GAP.
const buildSkeletonScene = (screenWidth: number, topInset: number): TBackdropScene => {
  const shapes: TBackdropShape[] = [];
  const contentWidth = screenWidth - SKELETON_GUTTER * 2;
  const tileWidth = (contentWidth - SKELETON_GAP) / 2;
  const tileHeight = Math.round(tileWidth * SKELETON_TILE_HEIGHT_RATIO);
  let y = topInset + LIBRARY_TOOLBAR_TOP_OFFSET;

  // header: title centered in SKELETON_HEADER_HEIGHT
  shapes.push({
    x: SKELETON_GUTTER,
    y: y + (SKELETON_HEADER_HEIGHT - SKELETON_TITLE_HEIGHT) / 2,
    width: SKELETON_TITLE_WIDTH,
    height: SKELETON_TITLE_HEIGHT,
    radius: SKELETON_TITLE_HEIGHT / 2,
    color: SKELETON_BONE_COLOR,
  });
  y += SKELETON_HEADER_HEIGHT + SKELETON_GAP;

  // hero
  const heroHeight = Math.round(contentWidth * SKELETON_HERO_HEIGHT_RATIO);
  shapes.push({ x: SKELETON_GUTTER, y, width: contentWidth, height: heroHeight, radius: SKELETON_HERO_RADIUS, color: SKELETON_SURFACE_COLOR });
  y += heroHeight;

  // meta row (marginTop SKELETON_GAP + 4, row height = avatar)
  y += SKELETON_GAP + 4;
  shapes.push({ x: SKELETON_GUTTER, y, width: SKELETON_AVATAR_SIZE, height: SKELETON_AVATAR_SIZE, radius: SKELETON_AVATAR_SIZE / 2, color: SKELETON_BONE_COLOR });
  const linesHeight = SKELETON_META_LINE_HEIGHT * 2 + 9;
  const linesX = SKELETON_GUTTER + SKELETON_AVATAR_SIZE + SKELETON_GAP;
  const linesY = y + (SKELETON_AVATAR_SIZE - linesHeight) / 2;
  shapes.push({ x: linesX, y: linesY, width: SKELETON_META_PRIMARY_WIDTH, height: SKELETON_META_LINE_HEIGHT, radius: SKELETON_META_LINE_HEIGHT / 2, color: SKELETON_BONE_COLOR });
  shapes.push({ x: linesX, y: linesY + SKELETON_META_LINE_HEIGHT + 9, width: SKELETON_META_SECONDARY_WIDTH, height: SKELETON_META_LINE_HEIGHT, radius: SKELETON_META_LINE_HEIGHT / 2, color: SKELETON_BONE_COLOR });
  y += SKELETON_AVATAR_SIZE + SKELETON_SECTION_GAP;

  // two grids of SKELETON_TILE_COUNT tiles (second grid has paddingTop 14)
  const pushGrid = (top: number): number => {
    let row = 0;
    for (let i = 0; i < SKELETON_TILE_COUNT; i++) {
      const col = i % 2;
      row = Math.floor(i / 2);
      shapes.push({
        x: SKELETON_GUTTER + col * (tileWidth + SKELETON_GAP),
        y: top + row * (tileHeight + SKELETON_GAP),
        width: tileWidth,
        height: tileHeight,
        radius: SKELETON_TILE_RADIUS,
        color: SKELETON_SURFACE_COLOR,
      });
    }
    return top + (row + 1) * tileHeight + row * SKELETON_GAP;
  };
  const gridBottom = pushGrid(y);
  pushGrid(gridBottom + 14);

  return { background: PALETTE.dark.background, shapes };
};


// ?perf=1 only: frame-time probe and counters, drawn as a large overlay (see glass-perf.web.ts).
const WINDOW_MS = 4000;
const percentile = (sorted: number[], p: number): number =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;

const PerfOverlay = (): React.JSX.Element => {
  const [text, setText] = useState("perf: starting");
  const frames = useRef<{ t: number; d: number }[]>([]);
  useEffect((): (() => void) => {
    let last = performance.now();
    let id = 0;
    const step = (now: number): void => {
      frames.current.push({ t: now, d: now - last });
      last = now;
      while (frames.current.length && now - frames.current[0].t > WINDOW_MS) frames.current.shift();
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    // Rates are per second over the last report interval (not cumulative over the page life).
    let prev = { t: performance.now(), counts: {} as Record<string, number>, times: {} as Record<string, number> };
    const report = setInterval((): void => {
      const now = performance.now();
      const windowFrames = frames.current.filter((f) => now - f.t <= WINDOW_MS).map((f) => f.d);
      const sorted = [...windowFrames].sort((a, b) => a - b);
      const snap = perfSnapshot();
      const dtSec = Math.max((now - prev.t) / 1000, 0.001);
      const delta = (k: string): number => (snap.counts[k] ?? 0) - (prev.counts[k] ?? 0);
      const perSec = (k: string): string => (delta(k) / dtSec).toFixed(1);
      setText(
        [
          `FT p50 ${percentile(sorted, 0.5).toFixed(1)} p95 ${percentile(sorted, 0.95).toFixed(1)} p99 ${percentile(sorted, 0.99).toFixed(1)}`,
          `>16.7 ${windowFrames.filter((d) => d > 16.7).length}  >33 ${windowFrames.filter((d) => d > 33).length}  n ${windowFrames.length} (4s)`,
          `pop/s ${perSec("popRender")}  glass/s ${perSec("glassRender")}  live/s ${perSec("glassLive")}  frozen/s ${perSec("glassFrozenDraw")}`,
          `open>mount ${(snap.times.openToMountMs ?? 0).toFixed(0)}ms  cssBlur/s ${perSec("cssBlurFrame")}  loop/s ${perSec("loopStep")}`,
          `snap ${snap.counts.backdropSnapshot ?? 0}  blur ${snap.counts.blurPass ?? 0}  compile ${(snap.times.effectCompileMs ?? 0).toFixed(0)}ms  raster ${(snap.times.glassRasterMs ?? 0).toFixed(0)}ms`,
        ].join("\n"),
      );
      prev = { t: now, counts: snap.counts, times: snap.times };
    }, 250);
    return (): void => {
      cancelAnimationFrame(id);
      clearInterval(report);
    };
  }, []);
  return (
    <View pointerEvents="none" style={perfStyles.box}>
      <Text style={perfStyles.text}>{text}</Text>
    </View>
  );
};

const perfStyles = StyleSheet.create({
  box: { position: "absolute", left: 0, top: 0, right: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.78)", paddingHorizontal: 8, paddingVertical: 4 },
  text: { color: "#0f0", fontSize: 13, lineHeight: 16, fontFamily: "monospace" },
});

// Test-only menu with a submenu (the library toolbar is not changed): mirrors the mockups, a
// "Acciones rápidas" row with a chevron that expands inline on touch and opens a flyout with a
// fine pointer.
const SubmenuDemo = (): React.JSX.Element => (
  <Menu colorScheme="dark">
    <Menu.Trigger openOnPress={true} style={{ position: "absolute", left: 20, top: 66, width: 44, height: 44 }} glass={true}>
      <Menu.TriggerButton accessibilityLabel="Demo" style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff" }}>{"⋯"}</Text>
      </Menu.TriggerButton>
    </Menu.Trigger>
    <Menu.Content>
      <Menu.Submenu id="quick" title="Acciones rápidas">
        <Menu.Item id="quick-a">
          <Menu.Item.Title>Reproducir</Menu.Item.Title>
        </Menu.Item>
        <Menu.Item id="quick-b">
          <Menu.Item.Title>Añadir a cola</Menu.Item.Title>
        </Menu.Item>
        <Menu.Item id="quick-c">
          <Menu.Item.Title>Compartir</Menu.Item.Title>
        </Menu.Item>
      </Menu.Submenu>
      <Menu.Item id="rename">
        <Menu.Item.Title>Renombrar</Menu.Item.Title>
      </Menu.Item>
      <Menu.Item id="delete" destructive={true}>
        <Menu.Item.Title>Eliminar</Menu.Item.Title>
      </Menu.Item>
    </Menu.Content>
  </Menu>
);

const noSubscribe = (): (() => void) => (): void => undefined;

const GlassSlice = (): React.JSX.Element => {
  const { width, height } = useWindowDimensions();
  // Status bar of the Pixel reference (toolbar pill lands at y = 66 dp, as in pixel-menu.png).
  const topInset = 60;
  const scene = useMemo(() => buildSkeletonScene(width, topInset), [width]);
  const perfOn = useSyncExternalStore(noSubscribe, perfEnabled, (): boolean => false);
  return (
    <MenuBackdrop scene={scene} width={width} height={height} dprCap={2}>
      <LibraryToolbar topInset={topInset} palette={PALETTE.dark} />
      <SubmenuDemo />
      {perfOn ? <PerfOverlay /> : null}
    </MenuBackdrop>
  );
};

export default GlassSlice;
