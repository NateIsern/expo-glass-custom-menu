# expo-module-template

## Unreleased

### Added

- `Menu.Submenu`: a row with a chevron that opens its child items. On Android the child is a stacked layer over the root (flag `GLASS_SUBMENU_LAYERS`, `overlay/GlassSubmenuLayer.kt`); the parent row is the layer's header.
- Predictive back on Android 14+ for every menu: with a submenu open, the gesture moves it back into its row; with only the root open, the gesture scrubs the close animation. The system decides commit and cancel. Requires `android.predictiveBackGestureEnabled` in `app.json` and `android:enableOnBackInvokedCallback` in the manifest.
- `GlassMotion.beginScrub`, `scrubTo` and `endScrub`, and `GlassSpring.copyFrom`, for manual control of a morph's progress. Additive: the existing timeline is unchanged.
- Web: submenus open as a layer (touch covers the root; fine pointer opens beside the row). Escape and the browser back button close the submenu first, then the menu.

### Changed

- Web, fine pointer: the menu is set at 0.7 of the phone size (`DESKTOP_MENU_SCALE`).
- Native, tapping outside while a submenu is open returns to the root instead of closing the menu.

### Known issues

- Web: opening a submenu layer drops frames (over 33 ms on 17 of 59 frames on touch, 14 of 76 on desktop, headless software GL). The live glass of the layer is the measured cause.
- Submenu morph on `GlassMotion` and a second test menu are not done.

## 58.0.9

### Patch Changes

- Upgrade React Native to 0.88.1. ([#52404](https://github.com/expo/expo/pull/52404) by [@intergalacticspacehighway](https://github.com/intergalacticspacehighway))

## 58.0.8

### Patch Changes

- Upgrade React Native to 0.88.0. ([#51613](https://github.com/expo/expo/pull/51613) by [@gabrieldonadel](https://github.com/gabrieldonadel))

## 58.0.7

### Patch Changes

- [Android] Fix the Jetpack Compose view and modifier examples failing to compile with SDK 58: pass the converter context to `recordFromMap` and add the `react-android` dependency required by `ModifierList`. ([#51248](https://github.com/expo/expo/pull/51248) by [@behenate](https://github.com/behenate))
- Fixed the example app bundling a second copy of `react-native` and `expo` from the module's dependencies, which crashed it with `TypeError: property is not writable` when the module was created with pnpm. The example app now enables `experiments.autolinkingModuleResolution`. ([#51267](https://github.com/expo/expo/pull/51267) by [@behenate](https://github.com/behenate))
- Fix creating a standalone module with pnpm 11 and later failing with `ERR_PNPM_IGNORED_BUILDS`. When pnpm 11 or later is used and the module isn't a project of an existing pnpm workspace, the module and its example app now get their own `pnpm-workspace.yaml`, which skips the unneeded install scripts of Jest's dependencies. Inside an existing pnpm workspace that doesn't allow these scripts, `create-expo-module` now explains how to allow them. The example app's dependencies are now installed once, after the template files are in place. ([#51249](https://github.com/expo/expo/pull/51249) by [@behenate](https://github.com/behenate))
- Fix the `build` and `test` scripts exiting successfully when TypeScript or Jest can't be started. The scripts now print why the tool couldn't start and how to fix it. ([#51252](https://github.com/expo/expo/pull/51252) by [@behenate](https://github.com/behenate))
- Update the template's development dependencies to match SDK 58: `babel-preset-expo`, `jest-expo`, `@expo/ui`, `react-native`, `@types/react`, `jest`, `@types/jest`, `typescript` and `eslint-config-universe`. Add `react` and `@react-native/jest-preset`, which are required peer dependencies of `react-native` and `jest-expo`. ([#51250](https://github.com/expo/expo/pull/51250) by [@behenate](https://github.com/behenate))
- [Android] Bump Jetpack Compose UI and Foundation to 1.12.1 and Material3 to 1.5.0-beta01. Add `preferredItemWidth` to `HorizontalCenteredHeroCarousel` and deprecate `maxItemWidth`, matching the Material3 rename. Add `TimePickerElementColors` props without the `Unselected` infix (for example `clockDialContentColor`) and deprecate the old names. ([#51426](https://github.com/expo/expo/pull/51426) by [@intergalacticspacehighway](https://github.com/intergalacticspacehighway))

## 58.0.6

### Patch Changes

- Fix absolute destinations for standalone modules being created inside the current directory. Standalone modules now get their podspec metadata from `package.json`, and Android uses the `--module-version` value. ([#50184](https://github.com/expo/expo/pull/50184) by [@behenate](https://github.com/behenate))
- Import `SharedObject` and `useReleasingSharedObject` from `expo` instead of `expo-modules-core`, so standalone modules that use `SharedObject` build when installed outside an Expo app. ([#50183](https://github.com/expo/expo/pull/50183) by [@behenate](https://github.com/behenate))

## 58.0.5

### Patch Changes

- Force-bump all packages, due to migration to changesets. ([#50762](https://github.com/expo/expo/pull/50762) by [@kitten](https://github.com/kitten))
