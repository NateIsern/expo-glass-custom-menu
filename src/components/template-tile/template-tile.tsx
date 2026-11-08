import Ionicons from "@expo/vector-icons/Ionicons";
import { Menu } from "@modules/glass-menu-android";
import { ProgressiveBlurView } from "expo-backdrop";
import { Image } from "expo-image";
import { useState, type FC } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { MenuPressTarget } from "@/components/ui/menu-press-target";
import {
  SHOWCASE_MAX_FONT_SCALE,
  TEMPLATE_PILL_HEIGHT,
  TEMPLATE_PILL_WIDTH,
  TEMPLATE_TILE_BLUR_WASH,
  TEMPLATE_TILE_HEIGHT_RATIO,
  TEMPLATE_TILE_RADIUS,
} from "@/constants/components/showcase.const";
import { TIMING_FAST_DURATION } from "@/constants/motion.const";
import { TYPOGRAPHY_FONT_FAMILY } from "@/constants/typography.const";
import { registerComponent } from "@/utils/register-component.util";

import type { ITemplateTile } from "./interface";

const TemplateTileBase: FC<ITemplateTile> = ({
  template,
  width,
}: ITemplateTile &
  React.ComponentProps<typeof TemplateTileBase>): React.ReactNode &
  React.JSX.Element => {
  const [added, setAdded] = useState<boolean>(false);
  const [favorite, setFavorite] = useState<boolean>(false);
  const addedProgress = useSharedValue<number>(0);

  const idleLabelStyle = useAnimatedStyle(() => ({
    opacity: 1 - addedProgress.get(),
  }));
  const addedLabelStyle = useAnimatedStyle(() => ({
    opacity: addedProgress.get(),
  }));

  const toggleAdded = (): void => {
    const next = !added;
    setAdded(next);
    addedProgress.set(
      withTiming(next ? 1 : 0, { duration: TIMING_FAST_DURATION }),
    );
  };

  return (
    <View
      style={[
        styles.tile,
        { width, height: Math.round(width * TEMPLATE_TILE_HEIGHT_RATIO) },
      ]}
    >
      <Image
        source={template.image}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
      />
      <ProgressiveBlurView
        edge="bottom"
        intensity={32}
        startOffset={0.2}
        scrollFallback={false}
        tintColor={TEMPLATE_TILE_BLUR_WASH}
        style={styles.blur}
      />
      <Menu colorScheme="dark">
        <MenuPressTarget
          accessibilityLabel={`${template.name} options`}
          style={styles.pillAnchor}
          contentStyle={styles.pill}
        >
          <Animated.View style={[styles.pillRow, idleLabelStyle]}>
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text
              maxFontSizeMultiplier={SHOWCASE_MAX_FONT_SCALE}
              numberOfLines={1}
              style={styles.pillLabel}
            >
              Use
            </Text>
          </Animated.View>
          <Animated.View style={[styles.pillRow, addedLabelStyle]}>
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text
              maxFontSizeMultiplier={SHOWCASE_MAX_FONT_SCALE}
              numberOfLines={1}
              style={styles.pillLabel}
            >
              Added
            </Text>
          </Animated.View>
        </MenuPressTarget>
        <Menu.Content alignment="center" fontFamily={TYPOGRAPHY_FONT_FAMILY}>
          <Menu.Label>{template.name}</Menu.Label>
          <Menu.Item id="use" onSelect={toggleAdded}>
            <Menu.Item.Icon name={added ? "trash" : "plus"} />
            <Menu.Item.Title>
              {added ? "Remove from projects" : "Use template"}
            </Menu.Item.Title>
          </Menu.Item>
          <Menu.Item
            id="favorite"
            checked={favorite}
            keepOpen
            onSelect={() => setFavorite(!favorite)}
          >
            <Menu.Item.Icon name="heart" />
            <Menu.Item.Title>Favorite</Menu.Item.Title>
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item id="share">
            <Menu.Item.Icon name="share" />
            <Menu.Item.Title>Share</Menu.Item.Title>
          </Menu.Item>
        </Menu.Content>
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    overflow: "hidden",
    borderRadius: TEMPLATE_TILE_RADIUS,
    backgroundColor: "#16181D",
  },
  blur: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "42%",
    pointerEvents: "none",
  },
  pillAnchor: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    width: TEMPLATE_PILL_WIDTH,
    height: TEMPLATE_PILL_HEIGHT,
  },
  pill: {
    borderRadius: TEMPLATE_PILL_HEIGHT / 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  pillRow: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pillLabel: {
    color: "#FFFFFF",
    fontFamily: TYPOGRAPHY_FONT_FAMILY,
    fontSize: 15,
    includeFontPadding: false,
  },
});

const TemplateTile = registerComponent("TemplateTile", TemplateTileBase);

export { TemplateTile };
