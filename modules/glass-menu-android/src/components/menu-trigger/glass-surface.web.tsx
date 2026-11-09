// GlassSurface: the shared glass primitive for web (docs/glass-web-architecture.md, section a).
// Loaded lazily (WithSkiaWeb) so react-native-skia is evaluated only after CanvasKit loads.
//
// Two paths with the same shaders and uniforms:
//   live:   one Skia Canvas drawing the shadow (GLASS_SHADOW_SHADER_SKSL) and the material
//           (GLASS_MATERIAL_SHADER_SKSL, `content` = the backdrop snapshot blurred by the Kotlin
//           backdrop blur radius). Used while the animation runs.
//   frozen: the same two passes rasterized once into an image of the glass bounds, which the
//           canvas then draws. Used when the animation has settled, so an open menu costs no
//           shader work per frame.
// Shaders are compiled once per module and reused by every surface.
import { memo, useEffect, useMemo, type ReactElement } from "react";
import { useWindowDimensions } from "react-native";
import {
  Canvas,
  ColorShader,
  FilterMode,
  Group,
  Image,
  ImageShader,
  MipmapMode,
  Rect,
  Shader,
  Skia,
  TileMode,
  processUniforms,
  type SkImage,
  type SkRuntimeEffect,
} from "react-native-skia";

import {
  GLASS_MATERIAL_SHADER_SKSL,
  GLASS_SHADOW_SHADER_SKSL,
} from "./menu-shaders.web";
import {
  computeGlassUniforms,
  type TGlassState,
  type TMaterialConfig,
  type TRect,
} from "./glass-uniforms.web";
import { perfCount, perfMeasure } from "./glass-perf.web";

type TEffects = { material: SkRuntimeEffect; shadow: SkRuntimeEffect };
let effects: TEffects | null | undefined;

// Compiled once per module (RuntimeEffect.Make). Null if the SkSL does not compile.
const getEffects = (): TEffects | null => {
  if (effects === undefined) {
    perfCount("effectCompile");
    effects = perfMeasure("effectCompileMs", (): TEffects | null => {
      const material = Skia.RuntimeEffect.Make(GLASS_MATERIAL_SHADER_SKSL);
      const shadow = Skia.RuntimeEffect.Make(GLASS_SHADOW_SHADER_SKSL);
      return material && shadow ? { material, shadow } : null;
    });
  }
  return effects;
};

const TRANSPARENT = "#00000000";

type TGlassSurfaceProps = {
  state: TGlassState;
  config: TMaterialConfig;
  trigger: TMaterialConfig;
  // Backdrop snapshot (already blurred for this radius) and the pixel scale it was drawn at.
  backdrop: SkImage | null;
  backdropScale: number;
  width: number;
  height: number;
  // Rasterize once and draw the image (settled animation). Default: live shaders.
  frozen?: boolean;
  // The area the glass can reach during its whole transition (window px). The canvas is allocated for it once, so the
  // canvas is not resized every frame. Drawing is unchanged: the canvas only covers more transparent pixels.
  captureRect?: TRect;
};

const unionRect = (a: TRect, b: TRect): TRect => ({
  left: Math.min(a.left, b.left),
  top: Math.min(a.top, b.top),
  right: Math.max(a.right, b.right),
  bottom: Math.max(a.bottom, b.bottom),
});

const glassBounds = (r: TRect, width: number, height: number) => ({
  x0: Math.max(0, Math.floor(r.left)),
  y0: Math.max(0, Math.floor(r.top)),
  x1: Math.min(width, Math.ceil(r.right)),
  y1: Math.min(height, Math.ceil(r.bottom)),
});

type TUniforms = Record<string, number | number[]>;

// Both passes, rasterized into an image of the glass bounds. Same shaders, same uniforms, same
// backdrop child as the live tree; only the drawing target differs.
const rasterGlass = (
  fx: TEffects,
  shadowRect: TRect,
  materialUniforms: TUniforms,
  shadowUniforms: TUniforms,
  backdrop: SkImage | null,
  backdropScale: number,
  width: number,
  height: number,
): SkImage | null => {
  const { x0, y0, x1, y1 } = glassBounds(shadowRect, width, height);
  if (x1 <= x0 || y1 <= y0) return null;
  const scale = backdropScale;
  const surface = Skia.Surface.MakeOffscreen(Math.ceil((x1 - x0) * scale), Math.ceil((y1 - y0) * scale));
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  canvas.translate(-x0, -y0);
  const colorShader = Skia.Shader.MakeColor(Skia.Color(TRANSPARENT));
  const shadowPaint = Skia.Paint();
  shadowPaint.setShader(fx.shadow.makeShaderWithChildren(processUniforms(fx.shadow, shadowUniforms), [colorShader]));
  canvas.drawRect(
    Skia.XYWHRect(shadowRect.left, shadowRect.top, shadowRect.right - shadowRect.left, shadowRect.bottom - shadowRect.top),
    shadowPaint,
  );
  let content = colorShader;
  if (backdrop) {
    // The snapshot holds device px at `backdropScale`; map it back to window dp.
    const matrix = Skia.Matrix();
    matrix.scale(1 / backdropScale, 1 / backdropScale);
    content = backdrop.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None, matrix);
  }
  const materialPaint = Skia.Paint();
  materialPaint.setShader(
    fx.material.makeShaderWithChildren(processUniforms(fx.material, materialUniforms), [content, colorShader]),
  );
  // Only the glass bounds: the shader runs over the panel, not the window.
  canvas.drawRect(Skia.XYWHRect(x0, y0, x1 - x0, y1 - y0), materialPaint);
  const image = surface.makeImageSnapshot();
  surface.dispose();
  return image;
};

// A frozen glass is one image at the glass bounds. The canvas is memoised on primitives: while the image and the
// bounds are the same, it is not re-rendered, so the image is not drawn again on every frame of the menu loop.
const FrozenGlassCanvas = memo(function FrozenGlassCanvas({ image, left, top, width, height, x, y, drawWidth, drawHeight }: { image: SkImage; left: number; top: number; width: number; height: number; x: number; y: number; drawWidth: number; drawHeight: number }): ReactElement {
  return (
    <Canvas style={{ position: "absolute" as const, left, top, width, height }} pointerEvents="none">
      <Image image={image} x={x} y={y} width={drawWidth} height={drawHeight} fit="fill" />
    </Canvas>
  );
});

const GlassSurface = ({
  state,
  config,
  trigger,
  backdrop,
  backdropScale,
  width,
  height,
  frozen = false,
  captureRect,
}: TGlassSurfaceProps): ReactElement | null => {
  const fx = getEffects();
  perfCount("glassRender");
  const computed = useMemo(
    () => perfMeasure("glassUniformsMs", () => computeGlassUniforms(state, config, trigger, [width, height])),
    [state, config, trigger, width, height],
  );
  // One rasterization per settle. `computed` is a new object on every render, so the memo is keyed on the
  // values that change the raster (geometry, progress, backdrop), not on the object.
  const rasterKey = [
    computed.shadowRect.left, computed.shadowRect.top, computed.shadowRect.right, computed.shadowRect.bottom,
    state.materialProgress, backdropScale, width, height,
  ].join(",");
  const frozenImage = useMemo((): SkImage | null => {
    if (!frozen || !fx || state.materialProgress <= 0.001) return null;
    perfCount("glassRaster");
    return perfMeasure("glassRasterMs", () => rasterGlass(
      fx,
      computed.shadowRect,
      computed.materialUniforms,
      computed.shadowUniforms,
      backdrop,
      backdropScale,
      width,
      height,
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the values below are the raster's inputs; `computed` is keyed by rasterKey.
  }, [frozen, fx, rasterKey, backdrop]);
  useEffect((): (() => void) => {
    return (): void => {
      // The canvas may still draw the previous frozen image for one more commit: dispose it a moment later.
      const previous = frozenImage;
      if (previous) setTimeout((): void => previous.dispose(), 1000);
    };
  }, [frozenImage]);

  if (!fx || state.materialProgress <= 0.001) return null;
  const { x0, y0, x1, y1 } = glassBounds(computed.shadowRect, width, height);
  if (x1 <= x0 || y1 <= y0) return null;
  // The canvas covers the capture area (and the shadow): its origin is the translation of every draw below.
  const cap = captureRect ? glassBounds(unionRect(captureRect, computed.shadowRect), width, height) : { x0, y0, x1, y1 };
  const style = { position: "absolute" as const, left: cap.x0, top: cap.y0, width: cap.x1 - cap.x0, height: cap.y1 - cap.y0 };

  if (frozen && frozenImage) {
    perfCount("glassFrozenDraw");
    return <FrozenGlassCanvas image={frozenImage} left={cap.x0} top={cap.y0} width={cap.x1 - cap.x0} height={cap.y1 - cap.y0} x={x0 - cap.x0} y={y0 - cap.y0} drawWidth={x1 - x0} drawHeight={y1 - y0} />;
  }

  perfCount("glassLive");
  const r: TRect = computed.shadowRect;
  // Drawing stays in window coordinates (Group transform), so the shaders' coordinates are the
  // Kotlin ones. The canvas covers only the glass bounds.
  return (
    <Canvas style={style} pointerEvents="none">
      <Group transform={[{ translateX: -cap.x0 }, { translateY: -cap.y0 }]}>
        <Rect x={r.left} y={r.top} width={r.right - r.left} height={r.bottom - r.top}>
          <Shader source={fx.shadow} uniforms={computed.shadowUniforms}>
            <ColorShader color={TRANSPARENT} />
          </Shader>
        </Rect>
        {/* Kotlin: the blur is the content's (backdrop) blur, inside the material's `content` child. */}
        <Rect x={x0} y={y0} width={x1 - x0} height={y1 - y0}>
          <Shader source={fx.material} uniforms={computed.materialUniforms}>
            {backdrop ? (
              <ImageShader image={backdrop} x={0} y={0} width={width} height={height} fit="fill" />
            ) : (
              <ColorShader color={TRANSPARENT} />
            )}
            <ColorShader color={TRANSPARENT} />
          </Shader>
        </Rect>
      </Group>
    </Canvas>
  );
};

// Window-sized glass surface helper for components that do not own a size.
const GlassSurfaceWindow = (props: Omit<TGlassSurfaceProps, "width" | "height">): ReactElement | null => {
  const { width, height } = useWindowDimensions();
  return <GlassSurface {...props} width={width} height={height} />;
};

// Forces Skia to build the GPU pipelines of both shaders (first draw), off the first menu open.
// Draws the glass once into a small offscreen with a fully open state. No visible output.
const prewarmGlass = (backdrop: SkImage | null, backdropScale: number, width: number, height: number): void => {
  const fx = getEffects();
  if (!fx) return;
  const state: TGlassState = {
    incoming: { left: width * 0.3, top: 60, right: width * 0.3 + 250, bottom: 440 },
    radiusX: 34,
    radiusY: 34,
    hasSource: true,
    source: { left: width * 0.5, top: 60, right: width * 0.5 + 60, bottom: 100 },
    sourceRadius: 20,
    smoothing: 20,
    lensHeight: 0,
    lensAmount: 0,
    materialProgress: 1,
    surfaceOpacity: 1,
    dark: true,
    pressX: 0,
    pressY: 0,
    pressRadius: 80,
    poolGain: 0,
    pressLift: 0,
    rimLift: 0,
  };
  const trigger = { blur: 1, saturation: 1, refraction: 1, rim: 1, tintColor: null, tintOpacity: null };
  const config = { blur: 16, saturation: 1, refraction: 1, rim: 1, tintColor: null, tintOpacity: null };
  const computed = computeGlassUniforms(state, config, trigger, [width, height]);
  rasterGlass(fx, computed.shadowRect, computed.materialUniforms, computed.shadowUniforms, backdrop, backdropScale, width, height)?.dispose();
};

export { GlassSurface, GlassSurfaceWindow, getEffects, prewarmGlass, type TGlassSurfaceProps };
export default GlassSurface;
