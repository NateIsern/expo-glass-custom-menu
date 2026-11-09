import * as Font from "expo-font";

import { MENU_FONT_FAMILY } from "./menu-layout.web";

// Same face the Android overlay loads (android/src/main/assets/fonts/Inter-Regular.ttf).

let loading: Promise<boolean> | null = null;

// Resolves once the face is registered (or immediately false if it cannot load,
// in which case the system stack is used).
const loadMenuFont = (): Promise<boolean> => {
  loading ??= Font.loadAsync({
    [MENU_FONT_FAMILY]: require("../../../android/src/main/assets/fonts/Inter-Regular.ttf"),
  }).then(
    (): boolean => true,
    (): boolean => false,
  );
  return loading;
};

export { loadMenuFont };
