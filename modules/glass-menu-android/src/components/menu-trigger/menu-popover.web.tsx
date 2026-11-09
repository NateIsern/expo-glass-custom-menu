import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
  type FC,
  type ReactElement,
  type ReactNode,
} from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type TextStyle, type ViewStyle } from "react-native";
import { WithSkiaWeb } from "react-native-skia/lib/module/web";
import type { TNativeMenuItem } from "../../context/interface";
import type { TBackdropHandle } from "./menu-backdrop-context.web";
import type { TMenuScheme } from "../../interface";
import type { TGlassState } from "./glass-uniforms.web";
import { MENU_CONFIG_DEFAULT, TRIGGER_CONFIG_DEFAULT, computeBlurRadius } from "./glass-uniforms.web";
import {
  MENU_METRICS,
  centeredBaseline,
  textTopForBaseline,
  type TMenuContentLayout,
  type TMenuPlacement,
  type TMenuRowLayout,
} from "./menu-layout.web";
import { MenuIcon } from "./menu-icon.web";
import type { GlassSubmenuMotion } from "./menu-submenu-motion.web";
import { perfCount, perfFlag, perfGauge } from "./glass-perf.web";
import {
  GlassJelly,
  GlassMotion,
  GlassSpring,
  PlateMotion,
  RectF,
  rectCopy,
  rectSet,
  type TRectF,
} from "./menu-motion.web";

type TPalette = {
  foreground: string;
  muted: string;
  destructive: string;
  plate: string;
  separator: string;
  panel: string;
  panelShadow: string;
};

// Colors from GlassMenuContent.kt (dark/light tones).
const PALETTE: Record<TMenuScheme, TPalette> = {
  dark: {
    foreground: "rgba(255, 255, 255, 0.96)",
    muted: "rgba(235, 235, 245, 0.6)",
    destructive: "#FF5254",
    plate: "rgba(235, 235, 245, 0.155)",
    separator: "rgba(255, 255, 255, 0.09)",
    panel: "rgba(20, 20, 22, 0.82)",
    panelShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.35)",
  },
  light: {
    foreground: "rgba(0, 0, 0, 0.92)",
    muted: "rgba(60, 60, 67, 0.6)",
    destructive: "#DC1E30",
    plate: "rgba(60, 60, 67, 0.09)",
    separator: "rgba(0, 0, 0, 0.1)",
    panel: "rgba(255, 255, 255, 0.72)",
    panelShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.75), 0 8px 24px rgba(0, 0, 0, 0.18)",
  },
};

const ScrubSlack = 24; // ScrubSlack in GlassMenuSession.kt
const SCROLL_START = 10; // dp of vertical drag before a drag becomes a scroll
const CornerRadius = 34; // CornerRadius in GlassMenuSession.kt
const MenuPool = 0.03; // MenuPool in GlassMenuSession.kt
const MenuLightRadius = 80; // MenuLightRadius in GlassMenuSession.kt
const MenuLift = 0.018; // MenuLift in GlassMenuSession.kt
const MenuRimLift = 0.12; // MenuRimLift in GlassMenuSession.kt
const CHEVRON_RESERVE = 24; // matches menu-layout.web.ts
// Text styles read at render time: the metrics change with the pointer (desktop: a compact scale).
const titleText = (M: typeof MENU_METRICS): TextStyle => ({
  fontSize: M.titleSize,
  lineHeight: M.titleLine,
  letterSpacing: M.titleTracking * M.titleSize,
});
const subtitleText = (M: typeof MENU_METRICS): TextStyle => ({
  fontSize: M.subtitleSize,
  lineHeight: M.subtitleLine,
});

// One open menu. Motion, jelly and plate work in px (Kotlin units: dp * density);
// `source`, `through`, `target` are CSS px (window coordinates) for the DOM and hit tests.
type TMenuSession = {
  openedAt: number;
  density: number;
  source: TRectF;
  through: TRectF;
  target: TRectF;
  placement: TMenuPlacement;
  layout: TMenuContentLayout;
  fontFamily: string;
  awayX: number;
  awayY: number;
  motion: GlassMotion | GlassSubmenuMotion;
  jelly: GlassJelly;
  plate: PlateMotion;
  // Called by the trigger's frame loop on every frame that moves (re-render trigger).
  subscribers: Set<() => void>;
  // True when the trigger loop has settled (no more frames until the next activity).
  idle: boolean;
  // Ids of the submenus expanded inline.
  expandedIds: Set<string>;
  // Submenu navigation (touch): the items shown at the current level (null = the root menu), its
  // title. Kept for the navigation model; the submenu layer does not use them.
  levelItems: TNativeMenuItem[] | null;
  levelTitle: string | null;
  // Recede of this panel while a submenu layer is open: 0 at rest, 1 open (scale and rows dim).
  recede: GlassSpring;
  // Every area the glass can reach during its transition (CSS px): the glass canvas is allocated for it once.
  captureRect?: TRectF;
};

// Values derived each frame from the session. Geometry is CSS px for the DOM and Skia.
type TMenuGeometry = {
  shown: TRectF;
  contentSx: number;
  contentSy: number;
  contentTx: number;
  contentTy: number;
  contentBlur: number;
  rowsOpacity: number;
  glassOpacity: number;
  radiusX: number;
  radiusY: number;
  glassState: TGlassState;
  plateTop: number;
  plateHeight: number;
  plateAlpha: number;
};

const scaleRect = (r: TRectF, k: number): TRectF =>
  RectF(r.left * k, r.top * k, r.right * k, r.bottom * k);
const rectW = (r: TRectF): number => r.right - r.left;
const rectH = (r: TRectF): number => r.bottom - r.top;

// GlassMenuSession.draw, with px -> CSS px at the end (divide by density).
const computeGeometry = (s: TMenuSession, glass: boolean, dark: boolean): TMenuGeometry => {
  const d = s.density;
  const frame = s.motion.frame;
  const shownPx = rectCopy(frame.bounds);
  s.jelly.deformMenu(shownPx, s.awayX, s.awayY, d, 1);
  const zoom = frame.contentZoom;
  // A submenu layer scales its rows uniformly (rowScale); the root scales each axis to its panel.
  const sx = frame.rowScale ?? (rectW(shownPx) / d / rectW(s.target)) * zoom;
  const sy = frame.rowScale ?? (rectH(shownPx) / d / rectH(s.target)) * zoom;
  const material = frame.glassFade ?? frame.contentProgress;
  const shown = scaleRect(shownPx, 1 / d);
  const lobe = scaleRect(frame.sourceLobe, 1 / d);
  const lightX = s.jelly.lightPositionX / d;
  const lightY = s.jelly.lightPositionY / d;
  // Kotlin GlassMenuSession.applyLight (press/glow branch) with shine = 1 and progress = contentProgress.
  const glow = s.jelly.glowValue * frame.contentProgress;
  const glassState: TGlassState = {
    incoming: shown,
    radiusX: frame.radiusX / d,
    radiusY: frame.radiusY / d,
    hasSource: glass,
    source: lobe,
    sourceRadius: frame.sourceRadius / d,
    smoothing: frame.smoothing / d,
    lensHeight: frame.lensHeight / d,
    lensAmount: frame.lensAmount / d,
    materialProgress: material,
    // Kotlin: surfaceOpacity = if (anchor.glass) 1 else contentProgress (a submenu layer: its material).
    surfaceOpacity: frame.glassFade !== undefined ? material : glass ? 1 : frame.contentProgress,
    dark,
    pressX: lightX,
    pressY: lightY,
    pressRadius: MenuLightRadius,
    poolGain: MenuPool * glow,
    pressLift: MenuLift * glow,
    rimLift: MenuRimLift * glow,
  };
  return {
    shown,
    contentSx: sx,
    contentSy: sy,
    contentTx: (shownPx.left + rectW(shownPx) * 0.5 * (1 - zoom)) / d,
    contentTy: (shownPx.top + rectH(shownPx) * 0.5 * (1 - zoom)) / d,
    // Kotlin blurs the rows node in its own (unscaled) px: radius / max(min(scale), .25).
    contentBlur: frame.contentBlur / Math.max(Math.min(sx, sy), 0.25) / d,
    rowsOpacity: frame.rowsOpacity,
    glassOpacity: frame.contentProgress,
    radiusX: frame.radiusX / d,
    radiusY: frame.radiusY / d,
    glassState,
    plateTop: s.plate.plateTop.value / d,
    plateHeight: s.plate.plateHeight.value / d,
    plateAlpha: s.plate.plateAlpha.value,
  };
};

type TMenuPopoverProps = {
  session: TMenuSession;
  scheme: TMenuScheme;
  icons: ReactNode[];
  glass: boolean;
  glassReady: boolean;
  backdrop: TBackdropHandle | null;
  onSelect: (item: TNativeMenuItem, index: number) => void;
  // Toggles an inline submenu (touch mode): the trigger rebuilds the layout.
  onToggleSubmenu: (id: string) => void;
  // Returns from a submenu to the parent panel (the header row).
  onBack: () => void;
  // Fine pointer: hovering a row (a submenu row opens the flyout beside the panel).
  onRowHover?: (row: TMenuRowLayout | null) => void;
  // Fine pointer: submenu rows point right (flyout) instead of rotating inline.
  flyoutMode?: boolean;
  // Submenu layer open: the panel recedes by this amount (0..1), and its rows below rowsClipBottom
  // (window CSS px) are hidden, because the layer covers them.
  recedeDim?: number;
  rowsClipBottom?: number | null;
  // Submenu layer open: this panel ignores pointer input (the layer owns it).
  pointerLocked?: boolean;
  onActivity: () => void;
};

type TGesture = {
  startY: number;
  startScroll: number;
  scrolling: boolean;
};

const vibrate = (): void => {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(4);
  } catch {
    // Vibration is best-effort (Android Chrome only).
  }
};

const SKIA_OPTS = { locateFile: (): string => "/canvaskit.wasm" };

// Submenu layer (native parity, Kotlin GlassMenuSession ParentScaleDrop / ParentRowsDim).
export const RECEDE_SCALE_DROP = 0.05;
const ROWS_RECEDE_DIM = 0.65;

const MenuPopoverBase: FC<TMenuPopoverProps> = ({
  session,
  scheme,
  icons,
  glass,
  glassReady,
  backdrop,
  onSelect,
  onToggleSubmenu,
  onBack,
  onRowHover,
  flyoutMode = false,
  recedeDim = 0,
  rowsClipBottom = null,
  pointerLocked = false,
  onActivity,
}: TMenuPopoverProps): ReactElement => {
  // The Modal keeps the props of its first render, so the popover re-renders itself on each
  // moving frame (session.subscribers) and derives its geometry from the mutable session.
  // When the animation settles the trigger stops notifying, so nothing re-renders at rest.
  const [, setFrame] = useState(0);
  // Time from opening the session to the first commit of the popover tree (perf probe).
  useLayoutEffect((): void => {
    perfGauge("openToMountMs", performance.now() - session.openedAt);
  }, [session]);
  useEffect((): (() => void) => {
    const notify = (): void => setFrame((value: number): number => value + 1);
    session.subscribers.add(notify);
    return (): void => {
      session.subscribers.delete(notify);
    };
  }, [session]);

  const g = computeGeometry(session, glass, scheme === "dark");
  perfCount("popRender");
  if (g.contentBlur > 0.01) perfCount("cssBlurFrame");
  const windowSize = useWindowDimensions();
  const palette = PALETTE[scheme];
  const layout = session.layout;
  const target = session.target;
  const fontFamily = session.fontFamily;
  const M = MENU_METRICS;
  const bodyRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const scrollOffset = useRef(0);
  const gesture = useRef<TGesture | null>(null);
  const latest = useRef({ session, onSelect, onToggleSubmenu, onBack, onActivity, pointerLocked });
  useEffect((): void => {
    latest.current = { session, onSelect, onToggleSubmenu, onBack, onActivity, pointerLocked };
  });

  // Plate rows are content px (dp * density), as GlassMenuSession.highlight receives them.
  const highlightRow = (row: TMenuRowLayout | null, immediate: boolean, haptic: boolean): void => {
    const current = latest.current;
    const d = current.session.density;
    const moved = current.session.plate.highlight(
      row ? { key: row.index, top: row.top * d, height: row.height * d } : null,
      immediate,
    );
    if (moved && haptic) vibrate();
    current.onActivity();
  };

  // Pointer handling mirrors GlassMenuSession.onTouch: press and drag to scrub the highlight,
  // release on a row to select it, drag vertically to scroll when the rows overflow.
  useEffect((): (() => void) => {
    if (typeof document === "undefined") return (): void => undefined;
    const inside = (x: number, y: number): boolean => {
      const t = latest.current.session.target;
      return x >= t.left && x <= t.right && y >= t.top && y <= t.bottom;
    };
    const toContent = (x: number, y: number): { x: number; y: number } => {
      const t = latest.current.session.target;
      return { x: x - t.left, y: y - t.top + scrollOffset.current };
    };
    const maxScroll = (): number => {
      const current = latest.current;
      return Math.max(current.session.layout.height - rectH(current.session.target), 0);
    };

    const onDown = (event: PointerEvent): void => {
      if (latest.current.pointerLocked) return;
      if (!inside(event.clientX, event.clientY)) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      gesture.current = { startY: event.clientY, startScroll: scrollOffset.current, scrolling: false };
      const current = latest.current;
      current.session.jelly.down(event.clientX * current.session.density, event.clientY * current.session.density);
      const p = toContent(event.clientX, event.clientY);
      highlightRow(nearestRow(current.session.layout, p.x, p.y, ScrubSlack), true, false);
    };
    const onMove = (event: PointerEvent): void => {
      const g2 = gesture.current;
      if (!g2) return;
      const dy = event.clientY - g2.startY;
      if (maxScroll() > 0 && (g2.scrolling || Math.abs(dy) > SCROLL_START)) {
        if (!g2.scrolling) {
          highlightRow(null, false, false);
          latest.current.session.jelly.releaseDrag();
        }
        g2.scrolling = true;
        const y = Math.min(Math.max(g2.startScroll - dy, 0), maxScroll());
        bodyRef.current?.scrollTo({ y, animated: false });
        latest.current.onActivity();
        return;
      }
      const current = latest.current;
      current.session.jelly.move(event.clientX * current.session.density, event.clientY * current.session.density);
      const p = toContent(event.clientX, event.clientY);
      highlightRow(nearestRow(current.session.layout, p.x, p.y, ScrubSlack), false, true);
    };
    const onUp = (event: PointerEvent): void => {
      latest.current.session.jelly.release();
      if (latest.current.pointerLocked) return;
      const g2 = gesture.current;
      gesture.current = null;
      if (!g2) return;
      if (g2.scrolling) {
        highlightRow(null, false, false);
        return;
      }
      const p = toContent(event.clientX, event.clientY);
      const row = inside(event.clientX, event.clientY) ? exactRow(latest.current.session.layout, p.x, p.y) : null;
      highlightRow(null, false, false);
      if (row?.item.back) latest.current.onBack();
      else if (row?.submenu) latest.current.onToggleSubmenu(row.item.id);
      else if (row) latest.current.onSelect(row.item, row.index);
    };
    const onCancel = (): void => {
      gesture.current = null;
      latest.current.session.jelly.release();
      highlightRow(null, false, false);
    };

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onCancel);
    return (): void => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
    };
  }, []);

  const contentHeight = layout.rows.length ? layout.height : 0;
  const targetHeight = rectH(target);
  const blur = g.contentBlur > 0.01 ? `blur(${g.contentBlur}px)` : undefined;
  // Rows below the layer's top edge are hidden while it is open (body-local coordinates).
  const rowsClip = rowsClipBottom === null
    ? undefined
    : `inset(0px 0px ${Math.max(0, targetHeight - (rowsClipBottom - target.top))}px 0px)`;

  const renderRow = (row: TMenuRowLayout): ReactNode => {
    const { item } = row;
    const disabled = item.disabled === true;
    const destructive = item.destructive === true;
    const color = destructive ? palette.destructive : palette.foreground;

    if (item.back) {
      // Header of a submenu layer: the chevron points down (iOS), and the row's title.
      return (
        <RowPressable
          key={`back-${row.index}`}
          row={row}
          disabled={false}
          onHover={(): void => undefined}
        >
          <View pointerEvents="none" style={[styles.glyph, { left: M.checkCenter - 9, top: row.height / 2 - 9, transform: [{ rotate: "90deg" }] }]}>
            <MenuIcon name="chevron" size={18} weight={1.6} color={palette.foreground} />
          </View>
          <Text
            numberOfLines={1}
            pointerEvents="none"
            style={[styles.title, titleText(M), { color: palette.foreground, fontFamily, left: M.leadingWithCheck, right: M.trailingInset, top: textTopForBaseline(centeredBaseline(row.height / 2, M.titleSize), M.titleSize, M.titleLine) }]}
          >
            {item.title}
          </Text>
        </RowPressable>
      );
    }

    if (row.kind === "separator") {
      return (
        <View
          key={`sep-${row.index}`}
          pointerEvents="none"
          style={[
            styles.separator,
            {
              top: row.top + row.height / 2 - 0.25,
              left: M.separatorInset,
              right: M.separatorInset,
              backgroundColor: palette.separator,
            },
          ]}
        />
      );
    }

    if (row.kind === "heading") {
      const baseline = row.top + row.height - 8;
      return (
        <Text
          key={`heading-${row.index}`}
          numberOfLines={1}
          pointerEvents="none"
          style={[
            styles.subtitle, subtitleText(M),
            {
              color: palette.muted,
              fontFamily,
              top: textTopForBaseline(baseline, M.subtitleSize, M.subtitleLine),
              left: row.leading,
              right: M.trailingInset,
            },
          ]}
        >
          {item.title}
        </Text>
      );
    }

    const centerY = row.top + row.height / 2;
    const hasSubtitle = item.subtitle != null;
    const iconNode = item.iconSlot != null ? icons[item.iconSlot] : undefined;
    const hasGlyph = item.icon != null || item.iconPath != null;
    const checkSize = M.checkSize;
    const iconSize = M.iconSize;
    const titleBaseline = hasSubtitle ? centerY - 2 : centeredBaseline(centerY, M.titleSize);

    return (
      <RowPressable
        key={`item-${row.index}`}
        row={row}
        disabled={disabled}
        onHover={(entered: boolean): void => {
          if (gesture.current) return;
          if (entered) highlightRow(row, false, false);
          else highlightRow(null, false, false);
          onRowHover?.(entered ? row : null);
        }}
      >
        {item.checked === true ? (
          <View
            pointerEvents="none"
            style={[
              styles.glyph,
              { left: M.checkCenter - checkSize / 2, top: row.height / 2 - checkSize / 2 },
            ]}
          >
            <MenuIcon name="check" size={checkSize} weight={1.9} color={color} />
          </View>
        ) : null}
        {iconNode !== undefined ? (
          <View pointerEvents="none" style={[styles.slot, { left: row.iconCenter, top: row.height / 2 }]}>
            {iconNode}
          </View>
        ) : hasGlyph ? (
          <View
            pointerEvents="none"
            style={[
              styles.glyph,
              { left: row.iconCenter - iconSize / 2, top: row.height / 2 - iconSize / 2 },
            ]}
          >
            <MenuIcon name={item.icon} path={item.iconPath} size={iconSize} color={color} />
          </View>
        ) : null}
        <Text
          numberOfLines={1}
          pointerEvents="none"
          style={[
            styles.title, titleText(M),
            {
              color,
              fontFamily,
              left: row.leading,
              right: M.trailingInset + (row.submenu ? CHEVRON_RESERVE : 0),
              top: textTopForBaseline(titleBaseline, M.titleSize, M.titleLine) - row.top,
            },
          ]}
        >
          {item.title}
        </Text>
        {row.submenu ? (
          // Chevron: points down when the submenu is expanded inline (rotated 180 degrees).
          <View
            pointerEvents="none"
            style={[
              styles.glyph,
              {
                left: layout.width - M.trailingInset - 12,
                top: row.height / 2 - 9,
                transform: [{ rotate: "0deg" }],
              },
            ]}
          >
            <MenuIcon name="chevron" size={18} weight={1.6} color={color} />
          </View>
        ) : null}
        {hasSubtitle ? (
          <Text
            numberOfLines={1}
            pointerEvents="none"
            style={[
              styles.subtitle, subtitleText(M),
              {
                color: palette.muted,
                fontFamily,
                left: row.leading,
                right: M.trailingInset,
                top: textTopForBaseline(row.height / 2 + 16, M.subtitleSize, M.subtitleLine),
              },
            ]}
          >
            {item.subtitle}
          </Text>
        ) : null}
      </RowPressable>
    );
  };

  return (
    <>
      {glass && glassReady && !perfFlag("noglass") ? (
        <WithSkiaWeb
          getComponent={(): Promise<typeof import("./glass-surface.web")> => import("./glass-surface.web")}
          opts={SKIA_OPTS}
          componentProps={{
            state: g.glassState,
            config: MENU_CONFIG_DEFAULT,
            trigger: TRIGGER_CONFIG_DEFAULT,
            // The material samples the backdrop blurred by the Kotlin blur radius.
            backdrop: backdrop
              ? backdrop.blurred(computeBlurRadius(g.glassState, MENU_CONFIG_DEFAULT, TRIGGER_CONFIG_DEFAULT))
              : null,
            backdropScale: backdrop?.scale ?? 1,
            captureRect: session.captureRect,
            // Settled animation: draw the rasterized glass (docs, section c).
            frozen: session.idle,
            width: windowSize.width,
            height: windowSize.height,
          }}
        />
      ) : (
        <View
          pointerEvents="none"
          style={[
            styles.fallback,
            webOnly({
              backgroundColor: palette.panel,
              boxShadow: palette.panelShadow,
              borderRadius: `${g.radiusX}px / ${g.radiusY}px`,
            }),
            {
              left: g.shown.left,
              top: g.shown.top,
              width: rectW(g.shown),
              height: rectH(g.shown),
              opacity: g.glassOpacity,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.body,
          webOnly({ transformOrigin: "0px 0px", filter: perfFlag("noblur") ? undefined : blur, clipPath: rowsClip }),
          {
            width: rectW(target),
            height: targetHeight,
            opacity: g.rowsOpacity * (1 - ROWS_RECEDE_DIM * recedeDim),
            transform: [
              { translateX: g.contentTx },
              { translateY: g.contentTy },
              { scaleX: g.contentSx },
              { scaleY: g.contentSy },
            ],
          },
        ]}
      >
        <ScrollView
          ref={bodyRef}
          style={{ height: targetHeight }}
          contentContainerStyle={{ height: contentHeight }}
          scrollEnabled={contentHeight > targetHeight}
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
          onScroll={(event): void => {
            scrollOffset.current = event.nativeEvent.contentOffset.y;
          }}
        >
          <View
            pointerEvents="none"
            style={[
              styles.plate, { left: M.plateInsetX, right: M.plateInsetX },
              {
                backgroundColor: palette.plate,
                top: g.plateTop,
                height: g.plateHeight,
                opacity: g.plateAlpha,
              },
            ]}
          />
          {layout.rows.map(renderRow)}
        </ScrollView>
      </View>
    </>
  );
};

// Row with hover feedback (desktop pointers). Press handling is done by the document listeners.
const RowPressable: FC<{
  row: TMenuRowLayout;
  disabled: boolean;
  onHover: (entered: boolean) => void;
  children: ReactNode;
}> = ({ row, disabled, onHover, children }): ReactElement => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={row.item.title}
    accessibilityState={{ checked: row.item.checked, disabled }}
    disabled={disabled}
    onHoverIn={(): void => onHover(true)}
    onHoverOut={(): void => onHover(false)}
    style={[styles.row, { top: row.top, height: row.height, opacity: disabled ? 0.38 : 1 }]}
  >
    {children}
  </Pressable>
);

// Kotlin GlassRow.rect hit test: exact row for release, nearest row within slack while scrubbing.
const exactRow = (layout: TMenuContentLayout, x: number, y: number): TMenuRowLayout | null => {
  if (x < 0 || x > layout.width) return null;
  return (
    layout.rows.find(
      (row: TMenuRowLayout): boolean => row.selectable && y >= row.top && y < row.top + row.height,
    ) ?? null
  );
};

const nearestRow = (layout: TMenuContentLayout, x: number, y: number, slack: number): TMenuRowLayout | null => {
  if (x < -slack || x > layout.width + slack || y < -slack || y > layout.height + slack) return null;
  let best: TMenuRowLayout | null = null;
  let distance = Number.MAX_VALUE;
  for (const row of layout.rows) {
    if (!row.selectable) continue;
    const bottom = row.top + row.height;
    const gap = y < row.top ? row.top - y : y > bottom ? y - bottom : 0;
    if (gap < distance) {
      distance = gap;
      best = row;
    }
  }
  return best;
};

const webOnly = (style: Record<string, unknown>): ViewStyle => style as unknown as ViewStyle;

const styles = StyleSheet.create({
  body: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  fallback: {
    position: "absolute",
  },
  row: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  plate: {
    position: "absolute",
    borderRadius: 999,
  },
  separator: {
    position: "absolute",
    height: 0.5,
  },
  glyph: {
    position: "absolute",
  },
  slot: {
    position: "absolute",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  title: {
    position: "absolute",
    fontWeight: "400",
  },
  subtitle: {
    position: "absolute",
    fontWeight: "400",
  },
});

export {
  MenuPopoverBase as MenuPopover,
  CornerRadius,
  computeGeometry,
  rectSet,
  scaleRect,
  type TMenuGeometry,
  type TMenuPopoverProps,
  type TMenuSession,
};
