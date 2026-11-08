import { Image } from "expo-image";
import type { FC } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import {
  GALLERY_ASPECTS,
  GALLERY_RADIUS,
  SHOWCASE_GAP,
  SHOWCASE_GUTTER,
} from "@/constants/components/showcase.const";
import type { TShowcaseImage } from "@/config/interface";
import { registerComponent } from "@/utils/register-component.util";

import type { IGalleryGrid } from "./interface";

const GalleryGridBase: FC<IGalleryGrid> = ({
  images,
}: IGalleryGrid &
  React.ComponentProps<typeof GalleryGridBase>): React.ReactNode &
  React.JSX.Element => {
  const { width: screenWidth } = useWindowDimensions();
  const columnWidth = (screenWidth - SHOWCASE_GUTTER * 2 - SHOWCASE_GAP) / 2;

  return (
    <View style={styles.columns}>
      {GALLERY_ASPECTS.map((aspects, column) => (
        <View key={column} style={styles.column}>
          {images
            .filter(
              (_: TShowcaseImage, index: number) =>
                index % GALLERY_ASPECTS.length === column,
            )
            .map((source, position) => (
              <Image
                key={position}
                source={source}
                contentFit="cover"
                style={[
                  styles.image,
                  {
                    width: columnWidth,
                    height: Math.round(
                      columnWidth * aspects[position % aspects.length],
                    ),
                  },
                ]}
              />
            ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  columns: {
    flexDirection: "row",
    gap: SHOWCASE_GAP,
    paddingHorizontal: SHOWCASE_GUTTER,
  },
  column: {
    gap: SHOWCASE_GAP,
  },
  image: {
    borderRadius: GALLERY_RADIUS,
    backgroundColor: "#16181D",
  },
});

const GalleryGrid = registerComponent("GalleryGrid", GalleryGridBase);

export { GalleryGrid };
