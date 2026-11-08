import { BlurView } from "expo-backdrop";
import type { FC } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
} from "react-native-reanimated";

import {
  SHOWCASE_MAX_FONT_SCALE,
  SHOWCASE_TAB_CELL_WIDTH,
  SHOWCASE_TAB_HEIGHT,
  SHOWCASE_TAB_PADDING,
  SHOWCASE_TAB_TOP_OFFSET,
  SHOWCASE_TABS,
} from "@/constants/components/showcase.const";
import { TYPOGRAPHY_FONT_FAMILY } from "@/constants/typography.const";
import { registerComponent } from "@/utils/register-component.util";

import type { IShowcaseTabCell, IShowcaseTabs } from "./interface";

const LABEL_ACTIVE: string = "#FFFFFF";
const LABEL_IDLE: string = "rgba(255, 255, 255, 0.5)";
const THUMB_HEIGHT: number = SHOWCASE_TAB_HEIGHT - SHOWCASE_TAB_PADDING * 2;

const ShowcaseTabCell: FC<IShowcaseTabCell> = ({
  index,
  label,
  selected,
  progress,
  onPress,
}: IShowcaseTabCell): React.ReactNode & React.JSX.Element => {
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.get(),
      [index - 1, index, index + 1],
      [LABEL_IDLE, LABEL_ACTIVE, LABEL_IDLE],
    ),
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.cell}
    >
      <Animated.Text
        maxFontSizeMultiplier={SHOWCASE_MAX_FONT_SCALE}
        numberOfLines={1}
        style={[styles.label, labelStyle]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
};

const ShowcaseTabsBase: FC<IShowcaseTabs> = ({
  tab,
  progress,
  topInset,
  onChange,
}: IShowcaseTabs &
  React.ComponentProps<typeof ShowcaseTabsBase>): React.ReactNode &
  React.JSX.Element => {
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.get() * SHOWCASE_TAB_CELL_WIDTH }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.container, { top: topInset + SHOWCASE_TAB_TOP_OFFSET }]}
    >
      <BlurView
        intensity={70}
        tint="systemThinMaterialDark"
        cornerRadius={SHOWCASE_TAB_HEIGHT / 2}
        style={styles.track}
      >
        <Animated.View style={[styles.thumb, thumbStyle]} />
        {SHOWCASE_TABS.map((item, index) => (
          <ShowcaseTabCell
            key={item.id}
            index={index}
            label={item.label}
            selected={item.id === tab}
            progress={progress}
            onPress={() => onChange(item.id)}
          />
        ))}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
  },
  track: {
    flexDirection: "row",
    height: SHOWCASE_TAB_HEIGHT,
    padding: SHOWCASE_TAB_PADDING,
  },
  thumb: {
    position: "absolute",
    top: SHOWCASE_TAB_PADDING,
    left: SHOWCASE_TAB_PADDING,
    width: SHOWCASE_TAB_CELL_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: THUMB_HEIGHT / 2,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  cell: {
    width: SHOWCASE_TAB_CELL_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: TYPOGRAPHY_FONT_FAMILY,
    fontSize: 15,
    includeFontPadding: false,
  },
});

const ShowcaseTabs = registerComponent("ShowcaseTabs", ShowcaseTabsBase);

export { ShowcaseTabs };
