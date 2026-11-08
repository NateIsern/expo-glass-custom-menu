# expo-glass-custom-menu

Liquid glass menu for React Native on Android. The trigger melts into a droplet, grows into the menu and shrinks back the same way.

https://github.com/user-attachments/assets/01e2b7cf-398d-4341-bfb6-12667ea3090f

---

## ⚙️ Installation

```bash
git clone https://github.com/rit3zh/expo-glass-custom-menu
cd expo-glass-custom-menu
bun install
bunx expo run:android
```

This uses a local native module, so it needs a development build and won't run in Expo Go. The full glass effect needs Android 13 (API 33) or newer. Older versions get a solid menu with the same motion and rows. On other platforms the trigger still renders, but no menu opens.

To use it in your own app, copy [`modules/glass-menu-android`](modules/glass-menu-android) into your project's `modules/` folder and rebuild. Expo autolinks it. There are no extra dependencies.

The module lives in [`modules/glass-menu-android`](modules/glass-menu-android). The demo toolbar is in [`src/components/library-toolbar`](src/components/library-toolbar).

---

## 🚀 Usage

`Menu` is a compound component. Put a `Menu.Trigger` and a `Menu.Content` inside it:

```tsx
import { Menu } from "@modules/glass-menu-android";

export function Options() {
  return (
    <Menu>
      <Menu.Trigger style={{ width: 120, height: 44 }}>
        <Label />
      </Menu.Trigger>

      <Menu.Content
        items={[
          { id: "share", title: "Share", icon: "share" },
          { id: "copy", title: "Copy", icon: "copy" },
          { separator: true },
          { id: "delete", title: "Delete", icon: "trash", destructive: true },
        ]}
      />
    </Menu>
  );
}
```

Passing `items` gives you the default look. To build the rows yourself, compose them instead:

```tsx
import Ionicons from "@expo/vector-icons/Ionicons";

<Menu>
  <Menu.Trigger style={styles.pill}>
    <Label />
  </Menu.Trigger>

  <Menu.Content>
    <Menu.Label>View as</Menu.Label>
    <Menu.Item
      id="grid"
      checked={layout === "grid"}
      onSelect={() => setLayout("grid")}
    >
      <Menu.Item.Icon>
        {({ color }) => <Ionicons name="grid-outline" size={20} color={color} />}
      </Menu.Item.Icon>
      <Menu.Item.Title>Grid</Menu.Item.Title>
      <Menu.Item.Subtitle>Large artwork</Menu.Item.Subtitle>
    </Menu.Item>
    <Menu.Separator />
    <Menu.Item id="sort" keepOpen>
      <Menu.Item.Icon name="sort" />
      <Menu.Item.Title>Sort</Menu.Item.Title>
    </Menu.Item>
  </Menu.Content>
</Menu>;
```

`Menu.Item.Icon` takes any React Native view, so `@expo/vector-icons`, `react-native-svg` and images all work. Use the render function to get the row's text colour, which also handles destructive rows. It can also take a built-in `name`, or a 24-unit SVG `path`.

When only one button inside a larger pill should open the menu, turn off `openOnPress` and use `Menu.TriggerButton`. The morph then starts from that button:

```tsx
<Menu>
  <Menu.Trigger openOnPress={false} style={styles.pill}>
    <AddButton />
    <Menu.TriggerButton accessibilityLabel="Sort and view options">
      <FilterIcon />
    </Menu.TriggerButton>
    <MoreButton />
  </Menu.Trigger>

  <Menu.Content items={items} />
</Menu>
```

Hold on the menu and drag to slide the highlight between rows, then let go to choose one. The glass stretches toward your finger and wobbles back when you release. The glass trigger lights up under your finger and swells while pressed. Tapping outside or pressing Back closes the menu, and TalkBack can read every row.

---

## 🧩 API

### `<Menu>`

| Prop           | Type                          | Default  | Description                              |
| -------------- | ----------------------------- | -------- | ---------------------------------------- |
| `colorScheme`  | `"auto" \| "light" \| "dark"` | `"auto"` | Follows the system when `auto`.          |
| `onSelect`     | `(event) => void`             | none     | Called with `{ id, index, title }`.      |
| `onOpenChange` | `(open: boolean) => void`     | none     | Called when the menu opens or closes.    |
| `ref`          | `Ref<IMenuHandle>`            | none     | Exposes `open(from?)` and `close()`.     |

### `<Menu.Trigger>`

| Prop                 | Type                 | Default | Description                                                |
| -------------------- | -------------------- | ------- | ---------------------------------------------------------- |
| `glass`              | `boolean`            | `true`  | Draws the trigger as glass that the menu morphs out of.    |
| `cornerRadius`       | `number`             | capsule | Corner radius of the glass.                                |
| `openOnPress`        | `boolean`            | `true`  | Opens the menu when any part of the trigger is pressed.    |
| `config`             | `TMenuTriggerConfig` | none    | Trigger glass and morph options.                           |
| `accessibilityLabel` | `string`             | none    | Label for the press target.                                |
| `style`              | `ViewStyle`          | none    | Give the trigger a size here.                              |

### `<Menu.TriggerButton>`

Accepts every `Pressable` prop. Opens the menu and starts the morph from this button.

### `<Menu.Content>`

Must be a direct child of `Menu`.

| Prop         | Type                                     | Default     | Description                                   |
| ------------ | ---------------------------------------- | ----------- | --------------------------------------------- |
| `items`      | `TMenuEntry[]`                           | none        | Builds the rows from data.                    |
| `width`      | `number`                                 | fits rows   | At least 250 and as wide as the longest row.  |
| `alignment`  | `"auto" \| "start" \| "center" \| "end"` | `"auto"`    | Horizontal alignment to the trigger.          |
| `fontFamily` | `string`                                 | bundled Inter | A font loaded with `expo-font`.             |
| `config`     | `TMenuConfig`                            | none        | Menu glass and motion options.                |

### `<Menu.Item>`

| Prop          | Type         | Default       | Description                                      |
| ------------- | ------------ | ------------- | ------------------------------------------------ |
| `id`          | `string`     | `item-<index>` | Sent to `onSelect` on `Menu`.                   |
| `checked`     | `boolean`    | none          | Shows a checkmark. Any boolean reserves its space. |
| `destructive` | `boolean`    | `false`       | Colours the row red.                             |
| `disabled`    | `boolean`    | `false`       | Dims the row and stops it being chosen.          |
| `keepOpen`    | `boolean`    | `false`       | Leaves the menu open after this row is chosen.   |
| `onSelect`    | `() => void` | none          | Called when this row is chosen.                  |

Its parts are `Menu.Item.Icon`, `Menu.Item.Title` and `Menu.Item.Subtitle`. `Menu.Separator` adds a divider and `Menu.Label` adds a section heading.

Built-in icon names: `check`, `grid`, `list`, `plus`, `filter`, `ellipsis`, `trash`, `share`, `pencil`, `copy`, `heart`, `folder`, `sort`, `clock`.

### Config

`Menu.Content` takes a `config` for the open menu:

| Option             | Default                    | Description                                       |
| ------------------ | -------------------------- | ------------------------------------------------- |
| `blur`             | `16`                       | Frost behind the open menu, in dp.                |
| `morphBlur`        | `1`                        | Multiplies the blur on the rows while morphing.   |
| `tintColor`        | near black or white        | Colour over the glass.                            |
| `tintOpacity`      | `0.7` dark, `0.5` light    | Strength of the tint.                             |
| `saturation`       | `1`                        | Multiplies colour saturation behind the glass.    |
| `refraction`       | `1`                        | Multiplies how far the edges bend.                |
| `rim`              | `1`                        | Multiplies the bright edge line.                  |
| `shine`            | `1`                        | Multiplies the light under the finger.            |
| `highlightOpacity` | `1`                        | Multiplies the row highlight.                     |
| `jelly`            | `1`                        | Multiplies the stretch and wobble.                |
| `speed`            | `1`                        | Multiplies the speed of all motion.               |

`Menu.Trigger` takes a `config` for the trigger and the morph:

| Option             | Default     | Description                                                           |
| ------------------ | ----------- | --------------------------------------------------------------------- |
| `morphOrigin`      | `"trigger"` | Use `"press"` to grow from the finger and close back into that spot.  |
| `shrink.duration`  | `0.21`      | Seconds for the trigger to collapse when opening.                     |
| `shrink.scale`     | `0.25`      | How small the trigger gets.                                           |
| `shrink.damping`   | none        | Bounce of the collapse. Lower is bouncier.                            |
| `absorb.duration`  | `0.35`      | Seconds for the menu to shrink back when closing.                     |
| `absorb.damping`   | `0.8`       | Bounce of the close.                                                  |
| `blur`             | `1`         | Frost behind the trigger, in dp.                                      |
| `tintColor`        | none        | Colour over the glass.                                                |
| `tintOpacity`      | `0`         | Strength of the tint.                                                 |
| `saturation`       | `1`         | Multiplies colour saturation behind the glass.                        |
| `refraction`       | `1`         | Multiplies how far the edges bend.                                    |
| `rim`              | `1`         | Multiplies the bright edge line.                                      |
| `shine`            | `1`         | Multiplies the light under the finger.                                |
| `jelly`            | `1`         | Multiplies the swell and stretch.                                     |

---

## 🧱 Stack

[Expo SDK 58](https://expo.dev/changelog) · [React Native 0.88](https://reactnative.dev/) · [Expo Modules API](https://docs.expo.dev/modules/overview/) · [AGSL](https://developer.android.com/develop/ui/views/graphics/agsl) · [RenderEffect](https://developer.android.com/reference/android/graphics/RenderEffect) · [Expo Router](https://docs.expo.dev/router/introduction/)

---
