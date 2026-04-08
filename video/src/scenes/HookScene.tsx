import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { COLORS } from '../config';
import { AnimatedText } from '../components/AnimatedText';
import { GlowOrb } from '../components/GlowOrb';
import { GridBackground } from '../components/GridBackground';

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();

  /* Flicker effect on the pill icon */
  const pillScale = interpolate(frame, [0, 10, 20], [0, 1.2, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.5)),
  });

  const lineWidth = interpolate(frame, [30, 60], [0, 800], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <GridBackground />
      <GlowOrb x={540} y={700} size={500} color={COLORS.red} />
      <GlowOrb x={200} y={1400} size={350} color={COLORS.sky} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 80px',
        }}
      >
        {/* Pill icon */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 24,
            background: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.amber})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${pillScale})`,
            marginBottom: 40,
            boxShadow: `0 10px 40px ${COLORS.red}50`,
          }}
        >
          <span style={{ fontSize: 52, filter: 'grayscale(1) brightness(10)' }}>
            Rx
          </span>
        </div>

        <AnimatedText
          text="Your patient needs a drug."
          fontSize={56}
          fontWeight={800}
          delay={10}
          style={{ textAlign: 'center' }}
        />

        <AnimatedText
          text="Which payer covers it?"
          fontSize={56}
          fontWeight={800}
          color={COLORS.sky}
          delay={22}
          style={{ textAlign: 'center', marginTop: 12 }}
        />

        {/* Accent line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${COLORS.sky}, transparent)`,
            marginTop: 40,
            borderRadius: 2,
          }}
        />

        <AnimatedText
          text="Good luck finding out."
          fontSize={32}
          fontWeight={500}
          color={`${COLORS.white}99`}
          delay={45}
          style={{ textAlign: 'center', marginTop: 24 }}
        />
      </div>
    </div>
  );
};
