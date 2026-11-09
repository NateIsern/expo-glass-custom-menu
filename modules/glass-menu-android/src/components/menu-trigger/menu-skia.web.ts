import { Platform } from "react-native";
import { LoadSkiaWeb } from "react-native-skia/lib/module/web";

// CanvasKit wasm is copied to public/ by scripts/copy-canvaskit.js (postinstall).
const CANVASKIT_URL = "/canvaskit.wasm";

let loading: Promise<boolean> | null = null;

// Resolves true once CanvasKit is available to react-native-skia (false if it cannot load,
// in which case the menu falls back to its DOM surface).
const loadMenuSkia = (): Promise<boolean> => {
  if (Platform.OS !== "web") return Promise.resolve(false);
  loading ??= LoadSkiaWeb({ locateFile: (): string => CANVASKIT_URL }).then(
    (): boolean => true,
    (): boolean => false,
  );
  return loading;
};

export { loadMenuSkia };
