import {
  useCallback,
  type ComponentRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type FC,
  type ReactNode,
} from "react";
import {
  Modal,
  PixelRatio,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import type { INativeMenuHandle, IMenuContext, TNativeMenuItem } from "../../context/interface";
import { MenuContext } from "../../context/menu.context";
import type {
  IMenuTrigger,
  TMenuRect,
  TMenuScheme,
  TMenuSelectEvent,
  TMenuTriggerConfig,
} from "../../interface";
import { registerComponent } from "../../utils/register-component.util";
import {
  MENU_FONT_FAMILY,
  layoutMenuContent,
  placeMenu,
  MENU_METRICS,
  setMenuMetricScale,
  type TMenuRowLayout,
} from "./menu-layout.web";
import { loadMenuFont } from "./menu-font.web";
import { loadMenuSkia } from "./menu-skia.web";
import { MenuBackdropContext } from "./menu-backdrop-context.web";
import { perfCount, perfEnabled, perfFlag } from "./glass-perf.web";
import { GlassPerfOverlay } from "./glass-perf-overlay.web";
import {
  GlassJelly,
  GlassMorphTuning,
  GlassMotion,
  GlassSpring,
  PlateMotion,
  RectF,
  rectCopy,
  type TRectF,
} from "./menu-motion.web";
import { CornerRadius, MenuPopover, RECEDE_SCALE_DROP, scaleRect, type TMenuSession } from "./menu-popover.web";
import { GlassSubmenuMotion } from "./menu-submenu-motion.web";

const webOnly = (style: Record<string, unknown>): ViewStyle =>
  style as unknown as ViewStyle;

const rectW = (r: TRectF): number => r.right - r.left;
const rectH = (r: TRectF): number => r.bottom - r.top;
const rectCX = (r: TRectF): number => (r.left + r.right) / 2;

// Recede of the root panel while a submenu layer is open: starts at rest (0).
const restingRecede = (): GlassSpring => {
  const recede = new GlassSpring(0.001, 0.01);
  recede.reset(0);
  return recede;
};

// Fine pointer with hover (mouse, trackpad): the flyout mode. Touch and native use the inline mode.
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const subscribeFinePointer = (onChange: () => void): (() => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return (): void => undefined;
  const query = window.matchMedia(FINE_POINTER_QUERY);
  query.addEventListener("change", onChange);
  return (): void => query.removeEventListener("change", onChange);
};
const noSubscribePerf = (): (() => void) => (): void => undefined;
const finePointer = (): boolean =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(FINE_POINTER_QUERY).matches;
const rectCY = (r: TRectF): number => (r.top + r.bottom) / 2;
// Desktop (fine pointer): the menu is set at a compact scale of the phone reference. The web menu's text was 19 px,
// the size of a phone's; desktop menus set their text at 13 to 14 px, so 0.7 of 19 px (about 13.4 px) is the match.
const DESKTOP_MENU_SCALE = 0.7;
// Gap between a desktop submenu and the row it opens from.
const SIDE_GAP = 8;
const within = (r: TRectF | undefined, p: { x: number; y: number } | null): boolean =>
  !!r && !!p && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;

// CSS px transform that maps the rect `from` onto `to` (both CSS px, window coordinates).
const mapRect = (from: TRectF, to: TRectF, zoom: number) => ({
  translateX: rectCX(to) - rectCX(from),
  translateY: rectCY(to) - rectCY(from),
  scaleX: (rectW(to) / Math.max(rectW(from), 1)) * zoom,
  scaleY: (rectH(to) / Math.max(rectH(from), 1)) * zoom,
});

type TBuildArgs = {
  menu: IMenuContext;
  source: TRectF;
  throughRect: TRectF;
  density: number;
  windowWidth: number;
  windowHeight: number;
  config: Pick<TMenuTriggerConfig, "shrink" | "absorb"> | undefined;
};

// Builds the session for one menu: layout, placement, motion at the closed state (GlassMotion
// initialize), jelly and plate. Used by openAt and by the off-screen prewarm, so both paths are the
// same code.
// Glass capture area (Kotlin captureBounds): the rects the glass passes through, inset by 48 px.
const CaptureMargin = 48;
const captureOf = (rects: TRectF[]): TRectF => {
  const r = RectF(Infinity, Infinity, -Infinity, -Infinity);
  for (const q of rects) {
    r.left = Math.min(r.left, q.left);
    r.top = Math.min(r.top, q.top);
    r.right = Math.max(r.right, q.right);
    r.bottom = Math.max(r.bottom, q.bottom);
  }
  return RectF(r.left - CaptureMargin, r.top - CaptureMargin, r.right + CaptureMargin, r.bottom + CaptureMargin);
};

const buildMenuSession = ({
  menu,
  source,
  throughRect,
  density,
  windowWidth,
  windowHeight,
  config,
}: TBuildArgs): TMenuSession => {
  const fontFamily = menu.content.fontFamily ?? MENU_FONT_FAMILY;
  const content = layoutMenuContent(menu.items, {
    requestedWidth: menu.content.width,
    maximumWidth: windowWidth - MENU_METRICS.margin * 2,
    fontFamily,
  });
  const toRect = (r: TRectF): TMenuRect => ({
    x: r.left,
    y: r.top,
    width: rectW(r),
    height: rectH(r),
  });
  const placement = placeMenu(
    content,
    toRect(source),
    toRect(throughRect),
    { width: windowWidth, height: windowHeight },
    menu.content.alignment ?? "auto",
  );
  const target: TRectF = RectF(
    placement.left,
    placement.top,
    placement.left + placement.width,
    placement.top + placement.height,
  );
  const motion = new GlassMotion();
  motion.initialize(
    scaleRect(source, density),
    scaleRect(target, density),
    CornerRadius * density,
    density,
    scaleRect(throughRect, density),
    false,
    new GlassMorphTuning(config?.shrink, config?.absorb),
  );
  motion.retarget(true);
  const plate = new PlateMotion();
  plate.reset();
  return {
    openedAt: performance.now(),
    density,
    source,
    through: throughRect,
    target,
    captureRect: captureOf([source, throughRect, target]),
    placement,
    layout: content,
    fontFamily,
    awayX: placement.opensFromRight ? -1 : 1,
    awayY: placement.opensAbove ? -1 : 1,
    motion,
    jelly: new GlassJelly(),
    plate,
    subscribers: new Set(),
    idle: false,
    expandedIds: new Set(),
    levelItems: null,
    levelTitle: null,
    recede: restingRecede(),
  };
};

const MenuTriggerBase: FC<IMenuTrigger> = ({
  glass,
  cornerRadius,
  config,
  openOnPress = true,
  accessibilityLabel,
  style,
  children,
}: IMenuTrigger &
  React.ComponentProps<typeof MenuTriggerBase>): React.ReactNode &
  React.JSX.Element => {
  const menu = useContext<IMenuContext | null>(MenuContext);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scheme: TMenuScheme = menu?.scheme ?? "dark";
  const dark = scheme === "dark";
  // Kotlin density: px = dp * density. On web the device pixel ratio plays that role.
  const density = PixelRatio.get();

  const anchor = useRef<ComponentRef<typeof View> | null>(null);
  const expandedRef = useRef(false);
  const [restRect, setRestRect] = useState<TRectF | null>(null);
  const [session, setSession] = useState<TMenuSession | null>(null);
  const sessionRef = useRef<TMenuSession | null>(null);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loopKey, setLoopKey] = useState(0);
  const [, setTick] = useState(0);
  const [fontReady, setFontReady] = useState(false);
  const [skiaReady, setSkiaReady] = useState(false);
  const [triggerJelly] = useState(() => new GlassJelly());
  // Flyout (fine pointer): the child panel beside the menu, sharing the backdrop.
  const [flyout, setFlyout] = useState<TMenuSession | null>(null);
  const flyoutRef = useRef<TMenuSession | null>(null);
  const flyoutRow = useRef<string | null>(null);
  const flyoutClosing = useRef(false);
  // The layer was opened by hovering its row (fine pointer): leaving the row closes it. A click keeps it open.
  const flyoutByHover = useRef(false);
  // Touch: the root recedes with the layer's progress (its own spring). A fine pointer keeps the root unreduced.
  const flyoutRecedes = useRef(false);
  // The opener row (CSS px): with the panel it forms one hover region on a fine pointer.
  const flyoutRowRect = useRef<TRectF | null>(null);
  // The row whose layer was closed by a click, a key or the history: its hover does not reopen the layer until the
  // pointer leaves the row (the browser sends a pointer event over a row after the layer closes).
  const suppressRow = useRef<string | null>(null);
  // Last pointer position seen while a layer is open (hover timers check it: no pointer event may come).
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // matchMedia drives the mode, and reacts when the pointer changes (touch <-> mouse).
  const fine = useSyncExternalStore(subscribeFinePointer, finePointer, (): boolean => false);
  useEffect((): void => {
    setMenuMetricScale(fine ? DESKTOP_MENU_SCALE : 1);
  }, [fine]);
  // ?perf=1 probe overlay (web); off by default.
  const perfOn = useSyncExternalStore(noSubscribePerf, perfEnabled, (): boolean => false);
  const backdrop = useContext(MenuBackdropContext);
  // Off-screen prewarm: the popover tree is mounted once, invisible and not hit-testable, so the
  // first real open does not pay for creating it (see the open>mount probe).
  // Off-screen prewarm: the popover tree is mounted once, invisible and not hit-testable, so the
  // first real open does not pay for creating it (see the open>mount probe).
  const [prewarm, setPrewarm] = useState<TMenuSession | null>(null);
  const prewarmed = useRef(false);
  useEffect((): (() => void) | undefined => {
    if (prewarmed.current || !menu || menu.items.length === 0 || !fontReady || !skiaReady) return undefined;
    prewarmed.current = true;
    const timer = setTimeout((): void => {
      const offscreen = RectF(-20000, -20000, -19990, -19990);
      const built = buildMenuSession({ menu, source: offscreen, throughRect: offscreen, density, windowWidth, windowHeight, config });
      built.target = RectF(-20000, -20000, -20000 + rectW(built.target), -20000 + rectH(built.target));
      setPrewarm(built);
      setTimeout((): void => setPrewarm(null), 400);
    }, 0);
    return (): void => clearTimeout(timer);
  }, [menu, fontReady, skiaReady, density, windowWidth, windowHeight, config]);

  // Layout measures text (needs the bundled Inter face) and the glass needs CanvasKit.
  useEffect((): (() => void) => {
    let alive = true;
    void loadMenuFont().then((): void => {
      if (alive) setFontReady(true);
    });
    void loadMenuSkia().then((ok: boolean): void => {
      if (alive) setSkiaReady(ok);
    });
    return (): void => {
      alive = false;
    };
  }, []);

  const activity = useCallback((): void => setLoopKey((key: number): number => key + 1), []);

  // Frame loop. Advances the morph, jelly and plate springs with real time (Kotlin tick()),
  // and stops when everything has settled. It restarts on activity.
  useEffect((): (() => void) | undefined => {
    if (!session && triggerJelly.isSettled) return undefined;
    let frameId = 0;
    let last = performance.now();
    const step = (now: number): void => {
      // Closed-form springs are exact for any step; a larger cap keeps the morph on real time
      // when frames are slow (1/30 made slow frames stretch the morph and never settle).
      perfCount("loopStep");
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
      last = now;
      triggerJelly.advance(dt);
      if (!session) {
        setTick((value: number): number => value + 1);
        if (!triggerJelly.isSettled) frameId = requestAnimationFrame(step);
        return;
      }
      const settled = session.motion.advanceBy(dt);
      session.jelly.advance(dt);
      session.plate.advance(dt);
      session.recede.advance(dt);
      if (!expandedRef.current && settled && !flyoutRef.current) {
        sessionRef.current = null;
        setSession(null);
        setVisible(false);
        return;
      }
      const fl = flyoutRef.current;
      let flyoutIdle = true;
      if (fl) {
        const flSettled = fl.motion.advanceBy(dt);
        if (flyoutRecedes.current && fl.motion instanceof GlassSubmenuMotion) session.recede.reset(fl.motion.progressValue);
        fl.jelly.advance(dt);
        fl.plate.advance(dt);
        if (flyoutClosing.current && flSettled) {
          flyoutRef.current = null;
          flyoutRow.current = null;
          flyoutClosing.current = false;
          flyoutRecedes.current = false;
          flyoutRowRect.current = null;
          setFlyout(null);
        } else {
          fl.idle = flSettled && fl.jelly.isSettled && fl.plate.isSettled;
          flyoutIdle = fl.idle;
          fl.subscribers.forEach((notify: () => void): void => notify());
        }
      }
      // The glass is idle when its geometry is: the recede is a CSS scale of the whole panel, so the root's
      // glass can be frozen while it moves (the frame loop still runs until the recede settles).
      const glassIdle = settled && session.jelly.isSettled && session.plate.isSettled && triggerJelly.isSettled;
      session.idle = glassIdle;
      const idle = glassIdle && session.recede.isSettled && flyoutIdle;
      session.subscribers.forEach((notify: () => void): void => notify());
      setTick((value: number): number => value + 1);
      if (!idle || !expandedRef.current) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return (): void => cancelAnimationFrame(frameId);
  }, [session, loopKey, triggerJelly]);

  // Submenu layer: the child panel is a second glass surface over the root. It grows out of the tapped row
  // (its source is the row) into a panel the width of the root, with its top at the row, clamped inside the
  // root. Its header is the tapped row (a back row), and the root recedes with its own spring.
  const openFlyout = useCallback(
    (row: TMenuRowLayout, parent: TMenuSession, byHover: boolean): void => {
      if (!menu || !row.item.items || row.item.items.length === 0) return;
      if (flyoutRow.current === row.item.id && flyoutRef.current && !flyoutClosing.current) {
        // Back on the opener row: a pending close is cancelled, and a click keeps the layer open.
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = null;
        if (!byHover) flyoutByHover.current = false;
        return;
      }
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      const rowRect = RectF(parent.target.left, parent.target.top + row.top, parent.target.right, parent.target.top + row.top + row.height);
      const header: TNativeMenuItem = { id: `__back__${row.item.id}`, title: row.item.title, back: true };
      // Touch: the layer covers the root, so its header is a back row at the tapped row (one visual header).
      // Fine pointer: the parent row stays where it is with its own text, so the panel lists only the children.
      const items: TNativeMenuItem[] = fine ? [...row.item.items] : [header, ...row.item.items];
      const childMenu = { ...menu, items } as IMenuContext;
      const child = buildMenuSession({
        menu: childMenu,
        source: rowRect,
        throughRect: rowRect,
        density,
        windowWidth,
        windowHeight,
        config,
      });
      if (fine) {
        // Desktop (fine pointer): the submenu opens beside the row, on the right when it fits, else on the left.
        // The root stays where it is, unreduced.
        const width = rectW(child.target);
        const height = Math.min(child.layout.height, windowHeight - 32);
        let left = parent.target.right + SIDE_GAP;
        if (left + width > windowWidth - 16) left = parent.target.left - SIDE_GAP - width;
        left = Math.min(Math.max(left, 16), Math.max(windowWidth - width - 16, 16));
        const top = Math.min(Math.max(rowRect.top, 16), Math.max(windowHeight - height - 16, 16));
        child.target = RectF(left, top, left + width, top + height);
        // Desktop: no capture area for the layer. A capture area over the opener row stopped its hover (headless).
        child.captureRect = captureOf([child.target]);
      } else {
        // Touch: the layer covers the root, as wide as the root panel, with its top at the row.
        child.layout = layoutMenuContent(items, {
          requestedWidth: rectW(parent.target),
          maximumWidth: windowWidth - MENU_METRICS.margin * 2,
          fontFamily: parent.fontFamily,
        });
        const height = Math.min(child.layout.height, rectH(parent.target));
        const top = Math.min(Math.max(rowRect.top, parent.target.top), Math.max(parent.target.bottom - height, parent.target.top));
        child.target = RectF(parent.target.left, top, parent.target.right, top + height);
        child.captureRect = captureOf([rowRect, child.target]);
      }
      // The layer runs the native GlassSubmenuLayer transform: one progress from the row to the panel.
      const rowPx = scaleRect(rowRect, density);
      const layerMotion = new GlassSubmenuMotion();
      layerMotion.updateSource(rowPx, rowPx);
      layerMotion.updateTarget(scaleRect(child.target, density), CornerRadius * density);
      layerMotion.start();
      child.motion = layerMotion;
      flyoutRef.current = child;
      flyoutRow.current = row.item.id;
      flyoutClosing.current = false;
      flyoutByHover.current = byHover;
      flyoutRecedes.current = !fine;
      flyoutRowRect.current = rowRect;
      setFlyout(child);
      activity();
    },
    [activity, config, density, fine, menu, windowHeight, windowWidth],
  );

  // Starts the layer's close: it collapses back into its row, and the root returns to rest.
  const beginLayerClose = useCallback((): void => {
    const child = flyoutRef.current;
    if (!child || flyoutClosing.current) return;
    flyoutClosing.current = true;
    suppressRow.current = flyoutRow.current;
    child.jelly.release();
    child.plate.close();
    child.motion.updateSource(scaleRect(child.source, density), scaleRect(child.through, density));
    child.motion.retarget(false);
    activity();
  }, [activity, density]);

  // The header row of the layer (a back row) sits over the tapped row. A click on it closes the layer, except
  // when the layer was opened by hovering: that click is the one that opens it, so it turns the layer into a
  // click-opened one instead.
  const layerBack = useCallback((): void => {
    if (flyoutByHover.current) {
      flyoutByHover.current = false;
      activity();
      return;
    }
    beginLayerClose();
  }, [activity, beginLayerClose]);

  const inHoverRegion = (point: { x: number; y: number } | null): boolean =>
    within(flyoutRowRect.current ?? undefined, point) || within(flyoutRef.current?.target, point);

  // Hover (fine pointer): the layer closes after a short grace period, so the pointer can cross into it.
  const closeFlyoutSoon = useCallback((): void => {
    if (!flyoutRef.current || !flyoutByHover.current || closeTimer.current) return;
    if (inHoverRegion(lastPointer.current)) return;
    closeTimer.current = setTimeout((): void => {
      closeTimer.current = null;
      // A click made the layer click-opened in the meantime: it stays open.
      if (!flyoutByHover.current) return;
      // Back in the opener row or the panel: it stays open.
      if (inHoverRegion(lastPointer.current)) return;
      beginLayerClose();
    }, 180);
  }, [beginLayerClose]);

  // The opener row and the panel are one hover region: the pointer in either keeps the layer open, and a close is
  // scheduled only when it is out of both (the timer is cancelled on re-entering either).
  useEffect((): (() => void) | undefined => {
    if (!flyout || typeof document === "undefined") return undefined;
    const onMove = (event: PointerEvent): void => {
      const point = { x: event.clientX, y: event.clientY };
      lastPointer.current = point;
      if (inHoverRegion(point)) {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = null;
      } else if (flyoutByHover.current) {
        closeFlyoutSoon();
      }
    };
    document.addEventListener("pointermove", onMove);
    return (): void => document.removeEventListener("pointermove", onMove);
  }, [closeFlyoutSoon, flyout]);

  // GlassMenuSession.close(): jelly release, plate fade, motion retarget to the source.
  const close = useCallback((): void => {
    const current = sessionRef.current;
    if (flyoutRef.current) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      flyoutRef.current.motion.updateSource(scaleRect(flyoutRef.current.source, density), scaleRect(flyoutRef.current.through, density));
      // Native close(): the layer is removed at once. The root closes into the trigger and carries the row.
      flyoutRef.current = null;
      flyoutRow.current = null;
      flyoutClosing.current = false;
      flyoutRecedes.current = false;
      flyoutRowRect.current = null;
      setFlyout(null);
    }
    if (!expandedRef.current || !current) return;
    expandedRef.current = false;
    setExpanded(false);
    current.jelly.release();
    current.plate.close();
    current.motion.updateSource(
      scaleRect(current.source, current.density),
      scaleRect(current.through, current.density),
    );
    current.motion.retarget(false);
    menu?.openChange?.(false);
    activity();
  }, [activity, density, menu]);

  // Browser back (history) while a menu is open: with a submenu open it returns to the root; otherwise it closes
  // the menu. The menu keeps a history entry while it is open, so back never leaves the page while a menu is up.
  const closeRef = useRef<() => void>(() => undefined);
  const beginLayerCloseRef = useRef<() => void>(() => undefined);
  const historyPushed = useRef(false);
  const ignorePop = useRef(false);
  useEffect((): void => {
    closeRef.current = close;
    beginLayerCloseRef.current = beginLayerClose;
  });
  useEffect((): (() => void) | undefined => {
    if (!expanded || typeof window === "undefined") return undefined;
    const pushEntry = (): void => {
      window.history.pushState({ glassMenu: true }, "");
      historyPushed.current = true;
    };
    pushEntry();
    const onPop = (): void => {
      if (ignorePop.current) {
        ignorePop.current = false;
        return;
      }
      historyPushed.current = false;
      if (flyoutRef.current && !flyoutClosing.current) {
        // Back with a submenu open: the root returns, and the menu stays open with an entry of its own.
        beginLayerCloseRef.current();
        pushEntry();
      } else {
        closeRef.current();
      }
    };
    window.addEventListener("popstate", onPop);
    return (): void => {
      window.removeEventListener("popstate", onPop);
      // Closed by the menu itself: drop its history entry so back does not stop at a closed menu.
      if (historyPushed.current) {
        historyPushed.current = false;
        ignorePop.current = true;
        window.history.back();
      }
    };
  }, [expanded]);

  // GlassMenuSession.open / GlassMenuOverlay.open, in Kotlin px.
  const openAt = useCallback(
    (through?: TMenuRect): void => {
      if (!menu || menu.items.length === 0 || !fontReady) return;
      if (expandedRef.current) return;
      perfCount("measure");
      anchor.current?.measureInWindow(
        (x: number, y: number, width: number, height: number): void => {
          if (expandedRef.current) return;
          const source: TRectF = RectF(x, y, x + width, y + height);
          setRestRect(source);
          const throughRect: TRectF = through
            ? RectF(through.x, through.y, through.x + through.width, through.y + through.height)
            : rectCopy(source);
          const next = buildMenuSession({
            menu,
            source,
            throughRect,
            density,
            windowWidth,
            windowHeight,
            config,
          });
          sessionRef.current = next;
          expandedRef.current = true;
          setSession(next);
          setVisible(true);
          setExpanded(true);
          menu.openChange?.(true);
          activity();
        },
      );
    },
    [activity, config, density, fontReady, menu, windowHeight, windowWidth],
  );

  const select = (item: TNativeMenuItem, index: number): void => {
    if (!menu) return;
    const event: TMenuSelectEvent = { id: item.id, index, title: item.title };
    menu.select(event);
    if (!item.keepOpen) close();
  };

  // A submenu row opens its layer (touch and fine pointer alike).
  const toggleSubmenu = useCallback((id: string): void => {
    const current = sessionRef.current;
    if (!menu || !current) return;
    const row = current.layout.rows.find((r: TMenuRowLayout): boolean => r.item.id === id);
    if (row) openFlyout(row, current, false);
  }, [menu, openFlyout]);

  useImperativeHandle<INativeMenuHandle, INativeMenuHandle>(
    menu?.native,
    (): INativeMenuHandle => ({
      open: (x?: number, y?: number, width?: number, height?: number): Promise<void> => {
        const through =
          x !== undefined && y !== undefined && width !== undefined && height !== undefined
            ? { x, y, width, height }
            : undefined;
        openAt(through);
        return Promise.resolve();
      },
      close: (): Promise<void> => {
        close();
        return Promise.resolve();
      },
    }),
    [close, openAt],
  );

  // A press that starts outside the panel dismisses on release (GlassMenuSession dismissOnUp).
  // Escape also dismisses.
  useEffect((): (() => void) | undefined => {
    if (!expanded || typeof document === "undefined") return undefined;
    let downOutside = false;
    const outsideTarget = (x: number, y: number): boolean => {
      const root = sessionRef.current?.target;
      if (!root) return true;
      const layer = flyoutRef.current && !flyoutClosing.current ? flyoutRef.current.target : null;
      // Touch: the layer covers the root, so anything outside the layer closes the menu. Desktop: the layer
      // sits beside the root, so the root and the layer both count as inside.
      if (!fine) return !within(layer ?? root, { x, y });
      return !within(root, { x, y }) && !within(layer ?? undefined, { x, y });
    };
    const onPointerDown = (event: PointerEvent): void => {
      downOutside = outsideTarget(event.clientX, event.clientY);
    };
    const onPointerUp = (): void => {
      if (!downOutside) return;
      downOutside = false;
      // Outside with a submenu open: back to the root (as the header does). Outside with only the root: close.
      if (flyoutRef.current && !flyoutClosing.current) beginLayerClose();
      else close();
    };
    // Escape: with a submenu open it returns to the root (like back); otherwise it closes the menu.
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      if (flyoutRef.current && !flyoutClosing.current) beginLayerClose();
      else close();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("keydown", onKeyDown);
    return (): void => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, close, fine, beginLayerClose]);

  // Resting trigger: press jelly (deformControl) on the pill, measured on press.
  const onPressIn = (event: { nativeEvent: { pageX: number; pageY: number } }): void => {
    const node = anchor.current;
    if (!node || expandedRef.current) return;
    perfCount("measure");
    node.measureInWindow((x: number, y: number, width: number, height: number): void => {
      setRestRect(RectF(x, y, x + width, y + height));
      triggerJelly.down(event.nativeEvent.pageX * density, event.nativeEvent.pageY * density);
      activity();
    });
  };
  const onPressOut = (): void => {
    triggerJelly.release();
    activity();
  };

  // Anchor transform, as GlassMenuSession.draw records the trigger at the lobe, and as
  // GlassMenuOverlay.drawRestingAnchor deforms the pill while it is pressed.
  let anchorStyle: ViewStyle | undefined;
  if (session) {
    const frame = session.motion.frame;
    const lobe = scaleRect(frame.sourceLobe, 1 / density);
    const m = mapRect(session.source, lobe, frame.sourceZoom);
    anchorStyle = webOnly({
      transform: [
        { translateX: m.translateX },
        { translateY: m.translateY },
        { scaleX: m.scaleX },
        { scaleY: m.scaleY },
      ],
      opacity: frame.sourceOpacity,
      filter: frame.sourceBlur > 0.01 && !perfFlag("noblur") ? `blur(${frame.sourceBlur / density}px)` : undefined,
    });
  } else if (restRect) {
    const restPx = scaleRect(restRect, density);
    triggerJelly.deformControl(restPx, density, 1);
    const out = scaleRect(restPx, 1 / density);
    const m = mapRect(restRect, out, 1);
    anchorStyle = webOnly({
      transform: [
        { translateX: m.translateX },
        { translateY: m.translateY },
        { scaleX: m.scaleX },
        { scaleY: m.scaleY },
      ],
    });
  }

  const glassStyle: ViewStyle | undefined = glass
    ? webOnly({
        borderRadius: cornerRadius ?? 999,
        borderWidth: 1,
        borderColor: dark ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.75)",
        backgroundColor: dark ? "rgba(255, 255, 255, 0.13)" : "rgba(255, 255, 255, 0.3)",
        boxShadow: dark
          ? "inset 0 0 8px rgba(255, 255, 255, 0.1), 0 6px 18px rgba(0, 0, 0, 0.3)"
          : "inset 0 0 8px rgba(255, 255, 255, 0.6), 0 6px 18px rgba(0, 0, 0, 0.12)",
        backdropFilter: "blur(12px) saturate(130%)",
        overflow: "hidden",
      })
    : undefined;

  let popover: ReactNode = null;
  if (prewarm && !visible && menu) {
    popover = (
      <Modal transparent visible animationType="none">
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0 }]}>
          <MenuPopover
            session={prewarm}
            scheme={scheme}
            icons={menu.icons}
            glass={glass === true}
            glassReady={skiaReady}
            backdrop={backdrop}
            onSelect={(): void => undefined}
            onToggleSubmenu={(): void => undefined}
            onBack={(): void => undefined}
            onActivity={(): void => undefined}
          />
        </View>
      </Modal>
    );
  }
  if (visible && session && menu && fontReady) {
    const recedeDim = Math.min(Math.max(session.recede.value, 0), 1);
    // The root keeps all its rows visible behind the layer (dimmed and receded): no clip.
    const rowsClipBottom: number | null = null;
    popover = (
      <Modal transparent visible animationType="none" onRequestClose={close}>
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View
            pointerEvents="box-none"
            style={[
              StyleSheet.absoluteFill,
              webOnly({ transformOrigin: `${rectCX(session.target)}px ${rectCY(session.target)}px` }),
              { transform: [{ scale: 1 - RECEDE_SCALE_DROP * recedeDim }] },
            ]}
          >
            <MenuPopover
              session={session}
              scheme={scheme}
              icons={menu.icons}
              glass={glass === true}
              glassReady={skiaReady}
              backdrop={backdrop}
              onSelect={select}
              onToggleSubmenu={toggleSubmenu}
              onBack={(): void => undefined}
              flyoutMode={fine}
              onRowHover={fine ? (row: TMenuRowLayout | null): void => { if (row?.submenu) { if (row.item.id !== suppressRow.current) openFlyout(row, session, true); return; } if (row) suppressRow.current = null; closeFlyoutSoon(); } : undefined}
              recedeDim={recedeDim}
              rowsClipBottom={rowsClipBottom}
              pointerLocked={flyout !== null && !fine}
              onActivity={activity}
            />
          </View>
          {flyout ? (
            <MenuPopover
              session={flyout}
              scheme={scheme}
              icons={menu.icons}
              glass={glass === true}
              glassReady={skiaReady}
              backdrop={backdrop}
              onSelect={select}
              onToggleSubmenu={(): void => undefined}
              onBack={layerBack}
              onActivity={activity}
            />
          ) : null}
        </View>
      </Modal>
    );
  }

  return (
    <>
      {perfOn ? <GlassPerfOverlay /> : null}
      <View ref={anchor} style={[style, glassStyle, anchorStyle]}>
        {children}
        {openOnPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={StyleSheet.absoluteFill}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={() => openAt()}
          />
        ) : null}
      </View>
      {popover}
    </>
  );
};

const MenuTrigger = registerComponent("MenuTrigger", MenuTriggerBase);

export { MenuTrigger };
