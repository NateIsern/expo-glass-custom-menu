import { ProgressiveBlurView } from "expo-backdrop";
import type { FC } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

import {
  SHOWCASE_EDGE_BOTTOM_EXTRA,
  SHOWCASE_EDGE_TOP_EXTRA,
  SHOWCASE_EDGE_WASH,
} from "@/constants/components/showcase.const";
import { PALETTE } from "@/constants/palette.const";
import { registerComponent } from "@/utils/register-component.util";

import type { IShowcasePage } from "./interface";

const PAGE_SHIFT: number = 32;
const PAGE_REST_SCALE: number = 0.98;

const ShowcasePageBase: FC<IShowcasePage> = ({
  index,
  active,
  progress,
  topInset,
  bottomInset,
  children,
}: IShowcasePage &
  React.ComponentProps<typeof ShowcasePageBase>): React.ReactNode &
  React.JSX.Element => {
  const pageStyle = useAnimatedStyle(() => {
    const range = [index - 1, index, index + 1];
    const position = progress.get();

    return {
      opacity: interpolate(position, range, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(
            position,
            range,
            [PAGE_SHIFT, 0, -PAGE_SHIFT],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            position,
            range,
            [PAGE_REST_SCALE, 1, PAGE_REST_SCALE],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { pointerEvents: active ? "auto" : "none" },
        pageStyle,
      ]}
    >
      {children}
      <ProgressiveBlurView
        edge="top"
        intensity={40}
        tintColor={SHOWCASE_EDGE_WASH}
        fallbackColor={PALETTE.dark.background}
        style={[styles.top, { height: topInset + SHOWCASE_EDGE_TOP_EXTRA }]}
      />
      <ProgressiveBlurView
        edge="bottom"
        intensity={40}
        tintColor={SHOWCASE_EDGE_WASH}
        fallbackColor={PALETTE.dark.background}
        style={[
          styles.bottom,
          { height: bottomInset + SHOWCASE_EDGE_BOTTOM_EXTRA },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: "none",
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: "none",
  },
});

const ShowcasePage = registerComponent("ShowcasePage", ShowcasePageBase);

export { ShowcasePage };
