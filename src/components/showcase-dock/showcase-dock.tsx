import Ionicons from "@expo/vector-icons/Ionicons";
import { Menu } from "@modules/glass-menu-android";
import { BlurView } from "expo-backdrop";
import { Image } from "expo-image";
import type { FC } from "react";
import { StyleSheet, View } from "react-native";

import { MenuPressTarget } from "@/components/ui/menu-press-target";
import { PlusIcon } from "@/components/ui/plus-icon";
import {
  SHOWCASE_DOCK_BOTTOM_OFFSET,
  SHOWCASE_DOCK_BUTTON_SIZE,
  SHOWCASE_DOCK_CREATE_WIDTH,
  SHOWCASE_GUTTER,
  TEMPLATE_SORTS,
} from "@/constants/components/showcase.const";
import { TYPOGRAPHY_FONT_FAMILY } from "@/constants/typography.const";
import { registerComponent } from "@/utils/register-component.util";

import type { IShowcaseDock } from "./interface";

const ShowcaseDockBase: FC<IShowcaseDock> = ({
  avatar,
  bottomInset,
  sort,
  onSortChange,
}: IShowcaseDock &
  React.ComponentProps<typeof ShowcaseDockBase>): React.ReactNode &
  React.JSX.Element => (
  <View
    style={[
      styles.dock,
      { bottom: bottomInset + SHOWCASE_DOCK_BOTTOM_OFFSET },
    ]}
  >
    <Menu colorScheme="dark">
      <MenuPressTarget
        accessibilityLabel="Sort templates"
        style={styles.button}
      >
        <BlurView
          intensity={70}
          tint="systemThinMaterialDark"
          cornerRadius={SHOWCASE_DOCK_BUTTON_SIZE / 2}
          style={styles.iconSurface}
        >
          <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
        </BlurView>
      </MenuPressTarget>
      <Menu.Content alignment="start" fontFamily={TYPOGRAPHY_FONT_FAMILY}>
        <Menu.Label>Sort templates</Menu.Label>
        {TEMPLATE_SORTS.map((option) => (
          <Menu.Item
            key={option.id}
            id={option.id}
            checked={sort === option.id}
            onSelect={() => onSortChange(option.id)}
          >
            <Menu.Item.Icon name={option.id === "featured" ? "sort" : "clock"} />
            <Menu.Item.Title>{option.label}</Menu.Item.Title>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>

    <Menu colorScheme="dark">
      <MenuPressTarget
        accessibilityLabel="Create"
        style={styles.create}
        contentStyle={styles.createSurface}
      >
        <PlusIcon color="#000000" />
      </MenuPressTarget>
      <Menu.Content alignment="center" fontFamily={TYPOGRAPHY_FONT_FAMILY}>
        <Menu.Item id="new">
          <Menu.Item.Icon name="plus" />
          <Menu.Item.Title>New template</Menu.Item.Title>
        </Menu.Item>
        <Menu.Item id="import">
          <Menu.Item.Icon name="folder" />
          <Menu.Item.Title>Import photos</Menu.Item.Title>
        </Menu.Item>
        <Menu.Item id="duplicate">
          <Menu.Item.Icon name="copy" />
          <Menu.Item.Title>Duplicate latest</Menu.Item.Title>
        </Menu.Item>
      </Menu.Content>
    </Menu>

    <Menu colorScheme="dark">
      <MenuPressTarget accessibilityLabel="Account" style={styles.button}>
        <Image source={avatar} contentFit="cover" style={styles.avatar} />
      </MenuPressTarget>
      <Menu.Content alignment="end" fontFamily={TYPOGRAPHY_FONT_FAMILY}>
        <Menu.Item id="profile">
          <Menu.Item.Icon name="pencil" />
          <Menu.Item.Title>Edit profile</Menu.Item.Title>
        </Menu.Item>
        <Menu.Item id="favorites">
          <Menu.Item.Icon name="heart" />
          <Menu.Item.Title>Favorites</Menu.Item.Title>
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item id="sign-out" destructive>
          <Menu.Item.Title>Sign out</Menu.Item.Title>
        </Menu.Item>
      </Menu.Content>
    </Menu>
  </View>
);

const styles = StyleSheet.create({
  dock: {
    position: "absolute",
    left: SHOWCASE_GUTTER,
    right: SHOWCASE_GUTTER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    pointerEvents: "box-none",
  },
  button: {
    width: SHOWCASE_DOCK_BUTTON_SIZE,
    height: SHOWCASE_DOCK_BUTTON_SIZE,
  },
  iconSurface: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    flex: 1,
    borderRadius: SHOWCASE_DOCK_BUTTON_SIZE / 2,
  },
  create: {
    width: SHOWCASE_DOCK_CREATE_WIDTH,
    height: SHOWCASE_DOCK_BUTTON_SIZE,
  },
  createSurface: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SHOWCASE_DOCK_BUTTON_SIZE / 2,
    backgroundColor: "#FFFFFF",
  },
});

const ShowcaseDock = registerComponent("ShowcaseDock", ShowcaseDockBase);

export { ShowcaseDock };
