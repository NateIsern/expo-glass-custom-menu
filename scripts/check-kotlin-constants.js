/* global __dirname */
// Fails when a constant in the TypeScript port differs from the Kotlin source it was copied from.
//
// Reads the Kotlin files directly (no copies of numbers): `const val NAME = expr` and
// `val NAME = GlassSpringSpec(a, b)`, evaluates both sides with the same rules (Kotlin `f`
// suffix dropped; derived constants resolved in order), and compares every name that exists on
// both sides. Kotlin names that have no TS counterpart are listed, not failed, so the report
// shows what is still untranslated.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const kotlinDir = path.join(
  root,
  "modules/glass-menu-android/android/src/main/java/expo/modules/glassmenuandroid",
);
const tsDir = path.join(root, "modules/glass-menu-android/src/components/menu-trigger");

// Pairs of [Kotlin file, TS file] that transcribe each other.
const PAIRS = [
  ["motion/GlassSpring.kt", "menu-motion.web.ts"],
  ["motion/GlassMorphTuning.kt", "menu-motion.web.ts"],
  ["motion/GlassMotion.kt", "menu-motion.web.ts"],
  ["motion/GlassJelly.kt", "menu-motion.web.ts"],
  ["overlay/GlassMenuSession.kt", "menu-motion.web.ts"],
  ["overlay/GlassMenuSession.kt", "menu-popover.web.tsx"],
];

const stripKotlin = (expr) => expr.replace(/(\d+\.?\d*)f\b/g, "$1").replace(/\bPI\b/g, "Math.PI");
const evalWith = (expr, env) => {
  const names = Object.keys(env);
  const fn = new Function(...names, `return (${expr});`);
  return fn(...names.map((n) => env[n]));
};

// Kotlin: const val NAME = expr        and        val NAME = GlassSpringSpec(a, b)
const parseKotlin = (file) => {
  const text = fs.readFileSync(path.join(kotlinDir, file), "utf8");
  const values = {};
  const specs = {};
  const numRe = /(?:const\s+)?val\s+([A-Za-z_]\w*)\s*=\s*([^\n/]+?)\s*(?:\/\/.*)?$/gm;
  let m;
  while ((m = numRe.exec(text))) {
    const [, name, rhs] = m;
    if (/^GlassSpringSpec\(/.test(rhs)) {
      const args = rhs.replace(/^GlassSpringSpec\((.*)\)\s*$/, "$1").split(",").map((a) => a.trim());
      try {
        specs[name] = args.map((a) => evalWith(stripKotlin(a), values));
      } catch {
        // Depends on a runtime value (e.g. `shrinkDamping ?: 1`): not a constant.
      }
    } else if (/^[-\w.\s*+()/]+$/.test(rhs) && !/[A-Za-z_]\w*\(/.test(rhs)) {
      try {
        values[name] = evalWith(stripKotlin(rhs), values);
      } catch {
        // Not a plain constant expression.
      }
    }
  }
  return { values, specs };
};

// TS: const NAME = expr;      and      const NAME = new GlassSpringSpec(a, b);
const parseTs = (file) => {
  const text = fs.readFileSync(path.join(tsDir, file), "utf8");
  const values = {};
  const specs = {};
  const re = /^const\s+([A-Za-z_]\w*)\s*=\s*(new GlassSpringSpec\((.*)\)|[^;]+);/gm;
  let m;
  while ((m = re.exec(text))) {
    const [, name, rhs, specArgs] = m;
    if (specArgs !== undefined) {
      try {
        specs[name] = specArgs.split(",").map((a) => evalWith(a.trim(), values));
      } catch {
        // Depends on a runtime value: not a constant.
      }
    } else if (!/\(/.test(rhs) || /^Math\./.test(rhs)) {
      try {
        values[name] = evalWith(rhs.replace(/Math\.PI/g, "Math.PI"), values);
      } catch {
        // Skip expressions that depend on runtime values.
      }
    }
  }
  return { values, specs };
};

let failures = 0;
let compared = 0;
const kotlinNames = new Set();
const tsNames = new Set();
for (const [kFile, tFile] of PAIRS) {
  const k = parseKotlin(kFile);
  const t = parseTs(tFile);
  for (const name of [...Object.keys(k.values), ...Object.keys(k.specs)]) kotlinNames.add(name);
  for (const name of [...Object.keys(t.values), ...Object.keys(t.specs)]) tsNames.add(name);
  for (const [name, value] of Object.entries(k.values)) {
    if (!(name in t.values)) continue;
    compared++;
    if (Math.abs(value - t.values[name]) > 1e-9) {
      failures++;
      console.error(`${kFile}: ${name} kotlin=${value} ts=${t.values[name]}`);
    }
  }
  for (const [name, args] of Object.entries(k.specs)) {
    if (!(name in t.specs)) continue;
    compared++;
    const tsArgs = t.specs[name];
    if (args.length !== tsArgs.length || args.some((v, i) => Math.abs(v - tsArgs[i]) > 1e-9)) {
      failures++;
      console.error(`${kFile}: ${name} kotlin=GlassSpringSpec(${args}) ts=GlassSpringSpec(${tsArgs})`);
    }
  }
}
const missing = [...kotlinNames].filter((name) => !tsNames.has(name));
console.log(`constants compared: ${compared}`);
if (missing.length) console.log(`not transcribed (Kotlin names without a TS counterpart): ${missing.sort().join(", ")}`);
console.log(failures === 0 ? "CONSTANTS OK" : `CONSTANTS FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
