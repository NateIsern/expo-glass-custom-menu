import type { ReactElement } from "react";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { MENU_METRICS } from "./menu-layout.web";

type TMenuIconProps = {
  name?: string;
  path?: string;
  size?: number;
  weight?: number;
  color: string;
};

// Shapes mirror GlassIcons.kt (24-unit grid, stroked with round caps/joins).
const renderShape = (name: string): ReactElement | null => {
  switch (name) {
    case "check":
      return <Path d="M4.5 12.8 L9.8 18.5 L19.5 5.5" />;
    // Right-facing: collapsed submenu. Rotated 90 degrees when expanded inline (points down).
    case "chevron":
      return <Path d="M9 6 L15 12 L9 18" />;
    case "grid":
      return (
        <>
          <Rect x={3.5} y={3.5} width={7} height={7} rx={1.8} />
          <Rect x={13.5} y={3.5} width={7} height={7} rx={1.8} />
          <Rect x={3.5} y={13.5} width={7} height={7} rx={1.8} />
          <Rect x={13.5} y={13.5} width={7} height={7} rx={1.8} />
        </>
      );
    case "list":
      return (
        <>
          {[6, 12, 18].map((y: number): ReactElement => (
            <Path key={`l${y}`} d={`M8.5 ${y} L21 ${y}`} />
          ))}
          {[6, 12, 18].map((y: number): ReactElement => (
            <Circle key={`d${y}`} cx={3.9} cy={y} r={0.35} />
          ))}
        </>
      );
    case "plus":
      return <Path d="M12 4 L12 20 M4 12 L20 12" />;
    case "filter":
      return <Path d="M3.5 7 L20.5 7 M6.5 12 L17.5 12 M9.5 17 L14.5 17" />;
    case "ellipsis":
      return (
        <>
          <Circle cx={5} cy={12} r={0.9} />
          <Circle cx={12} cy={12} r={0.9} />
          <Circle cx={19} cy={12} r={0.9} />
        </>
      );
    case "trash":
      return (
        <Path d="M4 6.5 L20 6.5 M9 6.5 L9 4 L15 4 L15 6.5 M6 6.5 L7 20 L17 20 L18 6.5 M10 10 L10.3 16.5 M14 10 L13.7 16.5" />
      );
    case "share":
      return (
        <Path d="M12 15 L12 3.5 M8 7 L12 3.5 L16 7 M8 10.5 L5.5 10.5 L5.5 20.5 L18.5 20.5 L18.5 10.5 L16 10.5" />
      );
    case "pencil":
      return <Path d="M4 20 L5 15.5 L16 4.5 L19.5 8 L8.5 19 Z M14 6.5 L17.5 10" />;
    case "copy":
      return (
        <>
          <Rect x={8.5} y={8.5} width={11.5} height={11.5} rx={2.5} />
          <Path d="M15.5 5.5 L15.5 5 Q15.5 4 13.5 4 L6 4 Q4 4 4 6 L4 13.5 Q4 15.5 5.5 15.5" />
        </>
      );
    case "heart":
      return (
        <Path d="M12 20 C5 15 3 11.5 3 8.6 C3 6 5 4.2 7.4 4.2 C9.3 4.2 11 5.3 12 7 C13 5.3 14.7 4.2 16.6 4.2 C19 4.2 21 6 21 8.6 C21 11.5 19 15 12 20 Z" />
      );
    case "folder":
      return (
        <Path d="M3.5 18 L3.5 6.5 Q3.5 5 5 5 L9.5 5 L11.5 7.5 L19 7.5 Q20.5 7.5 20.5 9 L20.5 18 Q20.5 19.5 19 19.5 L5 19.5 Q3.5 19.5 3.5 18 Z" />
      );
    case "sort":
      return <Path d="M8 19.5 L8 4.5 M4 8.5 L8 4.5 L12 8.5 M16 4.5 L16 19.5 M12 15.5 L16 19.5 L20 15.5" />;
    case "clock":
      return (
        <>
          <Circle cx={12} cy={12} r={8.5} />
          <Path d="M12 7 L12 12 L15.5 14" />
        </>
      );
    default:
      return null;
  }
};

const MenuIcon = ({
  name,
  path,
  size = MENU_METRICS.iconSize,
  weight = 1.45,
  color,
}: TMenuIconProps): React.JSX.Element | null => {
  if (path != null) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={path} fill={color} />
      </Svg>
    );
  }
  const shape = name != null ? renderShape(name) : null;
  if (shape == null) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* stroke width is expressed in 24-unit space so it renders as `weight` px */}
      <G
        stroke={color}
        strokeWidth={(weight * 24) / size}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {shape}
      </G>
    </Svg>
  );
};

export { MenuIcon };
