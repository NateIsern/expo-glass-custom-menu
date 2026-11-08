import type { TMenuTriggerConfig } from "@modules/glass-menu-android";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

interface IMenuPressTarget {
  accessibilityLabel: string;
  glass?: boolean;
  config?: TMenuTriggerConfig;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export { type IMenuPressTarget };
