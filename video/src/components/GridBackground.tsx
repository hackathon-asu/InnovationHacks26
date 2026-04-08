import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS } from '../config';

export const GridBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const offset = interpolate(frame, [0, 900], [0, -100]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(160deg, ${COLORS.dark} 0%, ${COLORS.navy} 50%, #1a1d4a 100%)`,
        overflow: 'hidden',
      }}
    >
      {/* Animated grid */}
      <div
        style={{
          position: 'absolute',
          inset: -100,
          backgroundImage: `
            linear-gradient(${COLORS.sky}08 1px, transparent 1px),
            linear-gradient(90deg, ${COLORS.sky}08 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: `translateY(${offset}px)`,
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, transparent 40%, ${COLORS.dark}dd 100%)`,
        }}
      />
    </div>
  );
};
