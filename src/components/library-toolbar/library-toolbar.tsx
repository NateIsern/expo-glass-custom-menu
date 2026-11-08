import { EllipsisIcon } from "@/components/ui/ellipsis-icon";
import { FilterIcon } from "@/components/ui/filter-icon";
import { PlusIcon } from "@/components/ui/plus-icon";
import {
  LIBRARY_TOOLBAR_DEFAULT_LAYOUT,
  LIBRARY_TOOLBAR_DEFAULT_SORT,
  LIBRARY_TOOLBAR_ICON_SIZE,
  LIBRARY_TOOLBAR_LAYOUT_ICONS,
  LIBRARY_TOOLBAR_LAYOUT_TITLES,
  LIBRARY_TOOLBAR_LAYOUTS,
  LIBRARY_TOOLBAR_SORTS,
  LIBRARY_TOOLBAR_TOP_OFFSET,
  LIBRARY_TOOLBAR_TRIGGER_LABEL,
} from "@/constants/components/library-toolbar.const";
import type { TLibraryLayout } from "@/constants/interface";
import { registerComponent } from "@/utils/register-component.util";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Menu, type TMenuItemIconState } from "@modules/glass-menu-android";
import { useState, type FC } from "react";
import { StyleSheet, View } from "react-native";

import type { ILibraryToolbar } from "./interface";

const LibraryToolbarBase: FC<ILibraryToolbar> = ({
  topInset,
  palette,
}: ILibraryToolbar &
  React.ComponentProps<typeof LibraryToolbarBase>): React.ReactNode &
  React.JSX.Element => {
  const [layout, setLayout] = useState<TLibraryLayout>(
    LIBRARY_TOOLBAR_DEFAULT_LAYOUT,
  );
  const [sort, setSort] = useState<string>(LIBRARY_TOOLBAR_DEFAULT_SORT);

  return (
    <View
      style={[styles.container, { top: topInset + LIBRARY_TOOLBAR_TOP_OFFSET }]}
    >
      <Menu colorScheme="dark">
        <Menu.Trigger
          openOnPress={true}
          style={styles.pill}
          glass={true}
          config={{ absorb: { duration: 0.48 } }}
        >
          <PlusIcon color={palette.ink} />
          <Menu.TriggerButton
            accessibilityLabel={LIBRARY_TOOLBAR_TRIGGER_LABEL}
            hitSlop={6}
            style={styles.button}
          >
            <FilterIcon color={palette.ink} />
          </Menu.TriggerButton>
          <EllipsisIcon color={palette.ink} />
        </Menu.Trigger>
        <Menu.Content>
          {LIBRARY_TOOLBAR_LAYOUTS.map(
            (option): React.JSX.Element => (
              <Menu.Item
                key={option}
                id={option}
                checked={layout === option}
                onSelect={() => setLayout(option)}
              >
                <Menu.Item.Icon>
                  {({ color }: TMenuItemIconState): React.JSX.Element => (
                    <Ionicons
                      name={LIBRARY_TOOLBAR_LAYOUT_ICONS[option]}
                      size={LIBRARY_TOOLBAR_ICON_SIZE}
                      color={color}
                    />
                  )}
                </Menu.Item.Icon>
                <Menu.Item.Title>
                  {LIBRARY_TOOLBAR_LAYOUT_TITLES[option]}
                </Menu.Item.Title>
              </Menu.Item>
            ),
          )}
          <Menu.Separator />
          {LIBRARY_TOOLBAR_SORTS.map((title) => (
            <Menu.Item
              key={title}
              id={title}
              checked={sort === title}
              onSelect={() => setSort(title)}
            >
              <Menu.Item.Title>{title}</Menu.Item.Title>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",

    right: 20,
  },
  pill: {
    flexDirection: "row",
    width: 155,
    height: 44,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});

const LibraryToolbar = registerComponent("LibraryToolbar", LibraryToolbarBase);

export { LibraryToolbar };
