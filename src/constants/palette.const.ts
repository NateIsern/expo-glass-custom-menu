import type { TPalette, TScheme } from "./interface";

const PALETTE: Record<TScheme, TPalette> = {
  dark: { background: "#000", ink: "#fff", chevron: "#5a5a5e" },
  light: { background: "#fff", ink: "#000", chevron: "#c4c4c7" },
};

export { PALETTE };
