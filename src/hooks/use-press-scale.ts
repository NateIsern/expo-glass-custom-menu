import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { SPRING } from "@/constants/motion.const";

const usePressScale = (scaleTo: number) => {
  const pressed = useSharedValue<number>(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - scaleTo) * pressed.get() }],
  }));

  const onPressIn = (): void => pressed.set(withSpring(1, SPRING.snappy));
  const onPressOut = (): void => pressed.set(withSpring(0, SPRING.snappy));

  return { animatedStyle, onPressIn, onPressOut };
};

export { usePressScale };
