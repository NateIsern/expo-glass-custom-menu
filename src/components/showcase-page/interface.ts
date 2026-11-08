import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";

interface IShowcasePage {
  index: number;
  active: boolean;
  progress: SharedValue<number>;
  topInset: number;
  bottomInset: number;
  children: ReactNode;
}

export { type IShowcasePage };
