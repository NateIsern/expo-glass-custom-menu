import type { TMenuScheme } from "../interface";
import type { TMenuIconColors } from "./interface";

const MENU_ICON_COLORS: Record<TMenuScheme, TMenuIconColors> = {
  dark: { base: "rgba(255, 255, 255, 0.96)", destructive: "#FF5254" },
  light: { base: "rgba(0, 0, 0, 0.92)", destructive: "#DC1E30" },
};
const MENU_ICON_HOST_ID: string = "glass-menu-icons";
const MENU_NATIVE_VIEW: string = "GlassMenuAndroid";

export { MENU_ICON_COLORS, MENU_ICON_HOST_ID, MENU_NATIVE_VIEW };
