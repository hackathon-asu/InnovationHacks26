import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { COLORS } from '../config';
import type { CSSProperties } from 'react';

interface AnimatedTextProps {
  text: string;
  delay?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  style?: CSSProperties;
  highlight?: string;
  highlightColor?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  fontSize = 48,
  color = COLORS.white,
  fontWeight = 700,
  style = {},
  highlight,
  highlightColor = COLORS.sky,
  direction = 'up',
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame - delay, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const offsetMap = {
    up: { x: 0, y: 30 },
    down: { x: 0, y: -30 },
    left: { x: 30, y: 0 },
    right: { x: -30, y: 0 },
  };
  const { x: startX, y: startY } = offsetMap[direction];

  const translateX = interpolate(frame - delay, [0, 14], [startX, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const translateY = interpolate(frame - delay, [0, 14], [startY, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const renderText = () => {
    if (!highlight) return text;
    const parts = text.split(highlight);
    return (
      <>
        {parts[0]}
        <span style={{ color: highlightColor }}>{highlight}</span>
        {parts.slice(1).join(highlight)}
      </>
    );
  };

  return (
    <div
      style={{
        opacity,
        transform: `translate(${translateX}px, ${translateY}px)`,
        fontSize,
        fontWeight,
        color,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: 1.2,
        ...style,
      }}
    >
      {renderText()}
    </div>
  );
};
