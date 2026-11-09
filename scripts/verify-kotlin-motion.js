/* global __dirname */
// Compares the motion/jelly transcription in menu-motion.web.ts with the Kotlin motion code.
//
// Usage:
//   node scripts/verify-kotlin-motion.js <kotlin-output.csv>
//
// The Kotlin side is produced by scripts/kotlin-motion-harness/Main.kt, compiled together with
// the real motion/*.kt sources (GlassSpring, GlassMorphTuning, GlassMorphFrame, GlassMotion,
// GlassJelly) and two RectF/record shims. Compile and run (kotlinc 2.x or the
// kotlin-compiler-embeddable jar): see the header comment in Main.kt.
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const tsPath = path.join(
  root,
  "modules/glass-menu-android/src/components/menu-trigger/menu-motion.web.ts",
);
const csvPath = process.argv[2];
if (!csvPath) {
  console.error("usage: node scripts/verify-kotlin-motion.js <kotlin-output.csv>");
  process.exit(2);
}

// Load the TS module (transpiled in memory; no files are written).
const source = fs.readFileSync(tsPath, "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", js)(mod, mod.exports, require);
const { GlassMotion, GlassMorphTuning, GlassSpring, GlassSpringSpec, GlassJelly, RectF } = mod.exports;

// Same fixed input and call order as Main.kt.
const DP = 2.875;
const rect = (l, t, r, b) => RectF(l * DP, t * DP, r * DP, b * DP);
const step = 1 / 60;
const out = [];
const frameLine = (t, m) => {
  const f = m.frame;
  return [
    t, f.bounds.left, f.bounds.top, f.bounds.right, f.bounds.bottom,
    f.radiusX, f.radiusY, f.contentProgress, f.rowsOpacity,
    f.sourceLobe.left, f.sourceLobe.top, f.sourceLobe.right, f.sourceLobe.bottom,
    f.sourceRadius, f.smoothing, f.sourceOpacity, f.sourceBlur, f.sourceZoom,
    f.contentBlur, f.contentZoom, f.portalBlur, f.lensHeight,
  ];
};

const spring = new GlassSpring();
spring.reset(0);
spring.target(100, new GlassSpringSpec(0.75, 0.32));
for (let i = 0; i <= 60; i++) {
  out.push(["spring", i * step, spring.value]);
  spring.advance(step);
}

const src = rect(201, 66, 355, 110);
const target = rect(105, 66, 355, 444);
const through = RectF(src.left, src.top, src.right, src.bottom);
const motion = new GlassMotion();
motion.initialize(src, target, 34 * DP, DP, through, false, new GlassMorphTuning(null, null));
motion.retarget(true);
let t = 0;
for (let i = 0; i <= 90; i++) {
  out.push(["open", ...frameLine(t, motion)]);
  motion.advanceBy(step);
  t += step;
}

const close = new GlassMotion();
close.initialize(src, target, 34 * DP, DP, through, false, new GlassMorphTuning(null, { duration: 0.48, damping: null }));
close.retarget(true);
for (let i = 0; i <= 90; i++) close.advanceBy(step);
close.updateSource(src, through);
close.retarget(false);
t = 0;
for (let i = 0; i <= 90; i++) {
  out.push(["close", ...frameLine(t, close)]);
  close.advanceBy(step);
  t += step;
}

const jelly = new GlassJelly();
const cx = (target.left + target.right) / 2;
const cy = (target.top + target.bottom) / 2;
jelly.down(cx, cy);
for (let i = 0; i <= 60; i++) {
  if (i === 20) jelly.move(cx + 40, cy + 25);
  if (i === 45) jelly.release();
  jelly.advance(step);
  const o = RectF(target.left, target.top, target.right, target.bottom);
  jelly.deformMenu(o, 1, 1, DP, 1);
  const c = RectF(src.left, src.top, src.right, src.bottom);
  jelly.deformControl(c, DP, 1);
  out.push(["jelly", i * step, o.left, o.top, o.right, o.bottom, c.left, c.top, c.right, c.bottom]);
}

// Compare row by row, field by field.
const kotlin = fs.readFileSync(csvPath, "utf8").trim().split("\n").map((line) => line.split(","));
if (kotlin.length !== out.length) {
  console.error(`row count differs: kotlin ${kotlin.length}, ts ${out.length}`);
  process.exit(1);
}
const maxDiff = {};
let failures = 0;
kotlin.forEach((row, i) => {
  const [kind, ...kFields] = row;
  const [tsKind, ...tFields] = out[i];
  if (kind !== tsKind) {
    console.error(`row ${i}: kind ${kind} vs ${tsKind}`);
    failures++;
    return;
  }
  // Kotlin prints `t` for frames; compare index-aligned values only (both sides use the same step).
  kFields.forEach((value, j) => {
    const a = Number(value);
    const b = Number(tFields[j]);
    const diff = Math.abs(a - b);
    const key = `${kind}[${j}]`;
    if (maxDiff[key] === undefined || diff > maxDiff[key]) maxDiff[key] = diff;
  });
});
// Tolerance: Kotlin computes in 32-bit floats; allow 0.01 px / 1e-3 unitless accumulated error.
for (const [key, diff] of Object.entries(maxDiff)) {
  const limit = key.startsWith("spring") || /\[(7|8|15|16|17|18|19|20)\]$/.test(key) ? 1e-3 : 0.01;
  if (diff > limit) {
    failures++;
    console.error(`${key}: max |kotlin - ts| = ${diff}`);
  }
}
const worst = Object.entries(maxDiff).sort((a, b) => b[1] - a[1])[0];
console.log(`rows compared: ${kotlin.length}; worst field: ${worst[0]} = ${worst[1]}`);
console.log(failures === 0 ? "MOTION PARITY OK" : `MOTION PARITY FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
