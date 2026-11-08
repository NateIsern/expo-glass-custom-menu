import type { FC } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { LIBRARY_TOOLBAR_TOP_OFFSET } from "@/constants/components/library-toolbar.const";
import {
  SKELETON_AVATAR_SIZE,
  SKELETON_BONE_COLOR,
  SKELETON_GAP,
  SKELETON_GUTTER,
  SKELETON_HEADER_HEIGHT,
  SKELETON_HERO_HEIGHT_RATIO,
  SKELETON_HERO_RADIUS,
  SKELETON_META_LINE_HEIGHT,
  SKELETON_META_PRIMARY_WIDTH,
  SKELETON_META_SECONDARY_WIDTH,
  SKELETON_SECTION_GAP,
  SKELETON_SURFACE_COLOR,
  SKELETON_TILE_COUNT,
  SKELETON_TILE_HEIGHT_RATIO,
  SKELETON_TILE_RADIUS,
  SKELETON_TITLE_HEIGHT,
  SKELETON_TITLE_WIDTH,
} from "@/constants/components/skeleton-list.const";
import { registerComponent } from "@/utils/register-component.util";

import type { ISkeletonList } from "./interface";

const SkeletonListBase: FC<ISkeletonList> = ({
  topInset,
}: ISkeletonList &
  React.ComponentProps<typeof SkeletonListBase>): React.ReactNode &
  React.JSX.Element => {
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = screenWidth - SKELETON_GUTTER * 2;
  const tileWidth = (contentWidth - SKELETON_GAP) / 2;

  return (
    <View
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={[
        styles.container,
        { paddingTop: topInset + LIBRARY_TOOLBAR_TOP_OFFSET },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.title} />
      </View>

      <View
        style={[
          styles.hero,
          { height: Math.round(contentWidth * SKELETON_HERO_HEIGHT_RATIO) },
        ]}
      />

      <View style={styles.meta}>
        <View style={styles.avatar} />
        <View style={styles.metaLines}>
          <View style={[styles.metaLine, styles.metaPrimary]} />
          <View style={[styles.metaLine, styles.metaSecondary]} />
        </View>
      </View>

      <View style={styles.grid}>
        {Array.from({ length: SKELETON_TILE_COUNT }, (_, index) => (
          <View
            key={index}
            style={[
              styles.tile,
              {
                width: tileWidth,
                height: Math.round(tileWidth * SKELETON_TILE_HEIGHT_RATIO),
              },
            ]}
          />
        ))}
      </View>

      <View
        style={[
          styles.grid,
          {
            paddingTop: 14,
          },
        ]}
      >
        {Array.from({ length: SKELETON_TILE_COUNT }, (_, index) => (
          <View
            key={index}
            style={[
              styles.tile,
              {
                width: tileWidth,
                height: Math.round(tileWidth * SKELETON_TILE_HEIGHT_RATIO),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    paddingHorizontal: SKELETON_GUTTER,
    pointerEvents: "none",
  },
  header: {
    height: SKELETON_HEADER_HEIGHT,
    justifyContent: "center",
    marginBottom: SKELETON_GAP,
  },
  title: {
    width: SKELETON_TITLE_WIDTH,
    height: SKELETON_TITLE_HEIGHT,
    borderRadius: SKELETON_TITLE_HEIGHT / 2,
    backgroundColor: SKELETON_BONE_COLOR,
  },
  hero: {
    borderRadius: SKELETON_HERO_RADIUS,
    borderCurve: "continuous",
    backgroundColor: SKELETON_SURFACE_COLOR,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: SKELETON_GAP,
    marginTop: SKELETON_GAP + 4,
    marginBottom: SKELETON_SECTION_GAP,
  },
  avatar: {
    width: SKELETON_AVATAR_SIZE,
    height: SKELETON_AVATAR_SIZE,
    borderRadius: SKELETON_AVATAR_SIZE / 2,
    backgroundColor: SKELETON_BONE_COLOR,
  },
  metaLines: {
    gap: 9,
  },
  metaLine: {
    height: SKELETON_META_LINE_HEIGHT,
    borderRadius: SKELETON_META_LINE_HEIGHT / 2,
    backgroundColor: SKELETON_BONE_COLOR,
  },
  metaPrimary: {
    width: SKELETON_META_PRIMARY_WIDTH,
  },
  metaSecondary: {
    width: SKELETON_META_SECONDARY_WIDTH,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SKELETON_GAP,
  },
  tile: {
    borderRadius: SKELETON_TILE_RADIUS,
    borderCurve: "continuous",
    backgroundColor: SKELETON_SURFACE_COLOR,
  },
});

const SkeletonList = registerComponent("SkeletonList", SkeletonListBase);

export { SkeletonList };
