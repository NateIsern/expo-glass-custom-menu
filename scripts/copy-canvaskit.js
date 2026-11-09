/* global __dirname */
// Copies the CanvasKit WebAssembly binary used by react-native-skia into public/
// so the web build can serve it at /canvaskit.wasm (see LoadSkiaWeb in the glass menu).
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const requireFromSkia = require("module").createRequire(
  require.resolve("react-native-skia/package.json", { paths: [root] }),
);
const canvasKitJs = requireFromSkia.resolve("canvaskit-wasm/full");
const source = path.join(path.dirname(canvasKitJs), "canvaskit.wasm");
const target = path.join(root, "public", "canvaskit.wasm");

if (!fs.existsSync(source)) {
  console.error(`copy-canvaskit: missing ${source}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
console.log(`copy-canvaskit: ${path.relative(root, source)} -> public/canvaskit.wasm`);
