import { useSyncExternalStore, type ReactElement, type ReactNode } from "react";
import { WithSkiaWeb } from "react-native-skia/lib/module/web";

import type { TBackdropScene } from "./menu-backdrop-context.web";

// Renders `scene` in Skia behind `children` and provides the snapshot to every glass menu inside.
// Web only. Loads CanvasKit lazily (same loader as the menus).
const SKIA_OPTS = { locateFile: (): string => "/canvaskit.wasm" };

type TMenuBackdropProps = {
  scene: TBackdropScene;
  width: number;
  height: number;
  // Device pixel ratio ceiling for the snapshot (docs/glass-web-architecture.md, section c).
  dprCap?: number;
  children?: ReactNode;
};

const noSubscribe = (): (() => void) => (): void => undefined;

// Client only: expo-router renders routes on the server (app.json web.output "server"), and
// CanvasKit cannot load its wasm there. The server snapshot is `false`, so nothing Skia runs in SSR.
const MenuBackdrop = ({ scene, width, height, dprCap = 2, children }: TMenuBackdropProps): ReactElement => {
  const isClient = useSyncExternalStore(noSubscribe, (): boolean => true, (): boolean => false);
  if (!isClient) return <>{children}</>;
  return (
    <WithSkiaWeb
      getComponent={(): Promise<typeof import("./backdrop-surface.web")> => import("./backdrop-surface.web")}
      opts={SKIA_OPTS}
      componentProps={{ scene, width, height, dprCap, children }}
    />
  );
};

export { MenuBackdrop, type TMenuBackdropProps };
