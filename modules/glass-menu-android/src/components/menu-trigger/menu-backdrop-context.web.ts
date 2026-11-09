// Static (no react-native-skia import): the backdrop snapshot that menus sample.
import { createContext } from "react";
import type { SkImage } from "react-native-skia";

// A backdrop scene is data, so it can be drawn into an offscreen Skia surface once and reused.
// Units are dp (CSS px). Shapes are rounded rects (the skeleton and placeholder blocks).
type TBackdropShape = { x: number; y: number; width: number; height: number; radius: number; color: string };
type TBackdropScene = { background: string; shapes: TBackdropShape[] };

// The backdrop as menus use it: the snapshot, and its blurred variants (Kotlin backdrop blur).
type TBackdropHandle = {
  image: SkImage | null;
  // Pixel scale the snapshot was drawn at (device px per dp).
  scale: number;
  blurred: (radius: number) => SkImage | null;
};

const MenuBackdropContext = createContext<TBackdropHandle | null>(null);

export { MenuBackdropContext, type TBackdropHandle, type TBackdropScene, type TBackdropShape };
