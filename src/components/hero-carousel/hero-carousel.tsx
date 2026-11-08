import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView, ProgressiveBlurView } from "expo-backdrop";
import { Image } from "expo-image";
import type { FC } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import {
  HERO_BADGE_TINT,
  HERO_BLUR_WASH,
  HERO_CARD_HEIGHT_RATIO,
  HERO_CARD_PEEK,
  HERO_CARD_RADIUS,
  HERO_CARD_REST_OPACITY,
  HERO_CARD_REST_SCALE,
  SHOWCASE_GAP,
  SHOWCASE_GUTTER,
  SHOWCASE_MAX_FONT_SCALE,
} from "@/constants/components/showcase.const";
import { TYPOGRAPHY_FONT_FAMILY } from "@/constants/typography.const";
import { registerComponent } from "@/utils/register-component.util";

import type { IHeroCardView, IHeroCarousel } from "./interface";

const BADGE_HEIGHT: number = 44;

const HeroCardView: FC<IHeroCardView> = ({
  card,
  index,
  width,
  height,
  snap,
  offset,
}: IHeroCardView): React.ReactNode & React.JSX.Element => {
  const cardStyle = useAnimatedStyle(() => {
    const range = [(index - 1) * snap, index * snap, (index + 1) * snap];
    const position = offset.get();

    return {
      opacity: interpolate(
        position,
        range,
        [HERO_CARD_REST_OPACITY, 1, HERO_CARD_REST_OPACITY],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            position,
            range,
            [HERO_CARD_REST_SCALE, 1, HERO_CARD_REST_SCALE],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.card, { width, height }, cardStyle]}>
      <View style={styles.collage}>
        {card.images.map((source, position) => (
          <Image
            key={position}
            source={source}
            contentFit="cover"
            style={styles.collageImage}
          />
        ))}
      </View>
      <ProgressiveBlurView
        edge="bottom"
        intensity={36}
        startOffset={0.15}
        scrollFallback={false}
        tintColor={HERO_BLUR_WASH}
        style={styles.blur}
      />
      <View style={styles.badgeLayer}>
        <BlurView
          intensity={60}
          tintColor={HERO_BADGE_TINT}
          cornerRadius={BADGE_HEIGHT / 2}
          style={styles.badge}
        >
          <Ionicons name={card.icon} size={17} color="#FFFFFF" />
          <Text
            maxFontSizeMultiplier={SHOWCASE_MAX_FONT_SCALE}
            numberOfLines={1}
            style={styles.badgeLabel}
          >
            {card.label}
          </Text>
        </BlurView>
      </View>
    </Animated.View>
  );
};

const HeroCarouselBase: FC<IHeroCarousel> = ({
  cards,
}: IHeroCarousel &
  React.ComponentProps<typeof HeroCarouselBase>): React.ReactNode &
  React.JSX.Element => {
  const { width: screenWidth } = useWindowDimensions();
  const offset = useSharedValue<number>(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      offset.set(event.contentOffset.x);
    },
  });

  const cardWidth = screenWidth - SHOWCASE_GUTTER * 2 - HERO_CARD_PEEK;
  const cardHeight = Math.round(screenWidth * HERO_CARD_HEIGHT_RATIO);
  const snap = cardWidth + SHOWCASE_GAP;

  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      disableIntervalMomentum
      snapToInterval={snap}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={styles.content}
    >
      {cards.map((card, index) => (
        <HeroCardView
          key={card.id}
          card={card}
          index={index}
          width={cardWidth}
          height={cardHeight}
          snap={snap}
          offset={offset}
        />
      ))}
    </Animated.ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: SHOWCASE_GAP,
    paddingHorizontal: SHOWCASE_GUTTER,
  },
  card: {
    overflow: "hidden",
    borderRadius: HERO_CARD_RADIUS,
    backgroundColor: "#16181D",
  },
  collage: {
    flex: 1,
    flexDirection: "row",
  },
  collageImage: {
    flex: 1,
  },
  blur: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "62%",
    pointerEvents: "none",
  },
  badgeLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: BADGE_HEIGHT,
    paddingHorizontal: 16,
  },
  badgeLabel: {
    color: "#FFFFFF",
    fontFamily: TYPOGRAPHY_FONT_FAMILY,
    fontSize: 17,
    includeFontPadding: false,
  },
});

const HeroCarousel = registerComponent("HeroCarousel", HeroCarouselBase);

export { HeroCarousel };
