// Performance counters for the web glass path. Off by default: every helper returns on the first
// check, and nothing is recorded unless perfEnable() ran (the /glass-slice?perf=1 route does it).
type TPerfState = { enabled: boolean; counts: Record<string, number>; times: Record<string, number> };
const state: TPerfState = { enabled: false, counts: {}, times: {} };

// ?perf=1 turns the counters on at module load (client only: window exists there).
if (typeof window !== "undefined" && /[?&]perf=1/.test(window.location.search)) state.enabled = true;

const perfEnable = (): void => {
  state.enabled = true;
};

const perfEnabled = (): boolean => state.enabled;

// Last value of a gauge (not accumulated).
const perfGauge = (key: string, value: number): void => {
  if (!state.enabled) return;
  state.times[key] = value;
};

const perfCount = (key: string): void => {
  if (!state.enabled) return;
  state.counts[key] = (state.counts[key] ?? 0) + 1;
  // Read by the headless probes (window.__glassCounts); only while ?perf=1.
  if (typeof window !== "undefined") (window as unknown as { __glassCounts?: Record<string, number> }).__glassCounts = state.counts;
};

// Adds the elapsed time of `fn` (ms) under `key`. Runs `fn` unmeasured when disabled.
const perfMeasure = <T,>(key: string, fn: () => T): T => {
  if (!state.enabled) return fn();
  const started = performance.now();
  const result = fn();
  state.times[key] = (state.times[key] ?? 0) + (performance.now() - started);
  return result;
};

const perfSnapshot = (): TPerfState => ({ enabled: state.enabled, counts: { ...state.counts }, times: { ...state.times } });

// Experiment switches for A/B runs on a device: ?perf=1&exp=noblur,noglass. Only honoured when
// perf is on; with no exp parameter every switch is off.
const experiments: Set<string> = new Set(
  typeof window !== "undefined" && state.enabled
    ? ((/[?&]exp=([^&]*)/.exec(window.location.search)?.[1] ?? "").split(","))
    : [],
);
const perfFlag = (name: string): boolean => state.enabled && experiments.has(name);

export { perfCount, perfEnable, perfEnabled, perfFlag, perfGauge, perfMeasure, perfSnapshot };
