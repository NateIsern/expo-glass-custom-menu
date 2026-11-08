import type { WithSpringConfig } from "react-native-reanimated";

const SPRING = {
  snappy: { damping: 22, stiffness: 320, mass: 1 },
  smooth: { damping: 28, stiffness: 220, mass: 1 },
} satisfies Record<string, WithSpringConfig>;

const TIMING_FAST_DURATION: number = 150;

export { SPRING, TIMING_FAST_DURATION };
