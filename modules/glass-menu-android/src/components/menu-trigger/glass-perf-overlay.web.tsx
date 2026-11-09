// Frame-time overlay for ?perf=1 (web only). Rendered by MenuTrigger when the perf probe is on,
// so it shows on any screen that has a menu. Counters come from glass-perf.web.ts.
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { perfSnapshot } from "./glass-perf.web";

const WINDOW_MS = 4000;
const percentile = (sorted: number[], p: number): number =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;

const GlassPerfOverlay = (): React.JSX.Element => {
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
  // position fixed: the overlay sits above the whole page, not inside the trigger container.
  box: { position: "fixed" as "absolute", left: 0, top: 0, right: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.78)", paddingHorizontal: 8, paddingVertical: 4 },
  text: { color: "#0f0", fontSize: 13, lineHeight: 16, fontFamily: "monospace" },
});

export { GlassPerfOverlay };
