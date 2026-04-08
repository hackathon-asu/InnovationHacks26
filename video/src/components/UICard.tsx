import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { COLORS } from '../config';
import type { CSSProperties, ReactNode } from 'react';

interface UICardProps {
  delay?: number;
  children: ReactNode;
  width?: number;
  style?: CSSProperties;
  glow?: boolean;
}

export const UICard: React.FC<UICardProps> = ({
  delay = 0,
  children,
  width = 900,
  style = {},
  glow = false,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const scale = interpolate(frame - delay, [0, 18], [0.92, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const translateY = interpolate(frame - delay, [0, 18], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        width,
        background: COLORS.white,
        borderRadius: 24,
        padding: 32,
        boxShadow: glow
          ? `0 0 60px ${COLORS.sky}40, 0 20px 60px rgba(0,0,0,0.2)`
          : '0 20px 60px rgba(0,0,0,0.15)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
