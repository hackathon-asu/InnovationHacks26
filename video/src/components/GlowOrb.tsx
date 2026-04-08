import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS } from '../config';

interface GlowOrbProps {
  x: number;
  y: number;
  size?: number;
  color?: string;
  pulseSpeed?: number;
}

export const GlowOrb: React.FC<GlowOrbProps> = ({
  x,
  y,
  size = 300,
  color = COLORS.sky,
  pulseSpeed = 60,
}) => {
  const frame = useCurrentFrame();

  const scale = interpolate(
    frame % pulseSpeed,
    [0, pulseSpeed / 2, pulseSpeed],
    [1, 1.15, 1],
  );

  const drift = Math.sin(frame / 80) * 12;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2 + drift,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
        transform: `scale(${scale})`,
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }}
    />
  );
};
