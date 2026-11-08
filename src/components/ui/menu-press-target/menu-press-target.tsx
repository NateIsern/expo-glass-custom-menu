import { Menu } from "@modules/glass-menu-android";
import type { FC } from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import { usePressScale } from "@/hooks/use-press-scale";
import { registerComponent } from "@/utils/register-component.util";

import type { IMenuPressTarget } from "./interface";

const MenuPressTargetBase: FC<IMenuPressTarget> = ({
  accessibilityLabel,
  glass = false,
  config,
  scaleTo = 0.94,
  style,
  contentStyle,
  children,
}: IMenuPressTarget &
  React.ComponentProps<typeof MenuPressTargetBase>): React.ReactNode &
  React.JSX.Element => {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(scaleTo);

  return (
    <Menu.Trigger
      glass={glass}
      config={config}
      openOnPress={false}
      style={style}
    >
      <Menu.TriggerButton
        accessibilityLabel={accessibilityLabel}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.fill}
      >
        <Animated.View style={[styles.fill, contentStyle, animatedStyle]}>
          {children}
        </Animated.View>
      </Menu.TriggerButton>
    </Menu.Trigger>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

const MenuPressTarget = registerComponent(
  "MenuPressTarget",
  MenuPressTargetBase,
);

export { MenuPressTarget };
