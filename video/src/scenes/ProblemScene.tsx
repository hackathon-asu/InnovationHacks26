import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { COLORS } from '../config';
import { AnimatedText } from '../components/AnimatedText';
import { GlowOrb } from '../components/GlowOrb';
import { GridBackground } from '../components/GridBackground';

const PAIN_POINTS = [
  { icon: '\u{1F4C4}', text: '200+ page PDFs per payer', delay: 15 },
  { icon: '\u{1F50D}', text: 'Manual Ctrl+F for drug names', delay: 28 },
  { icon: '\u23F3', text: 'Hours to compare one drug', delay: 41 },
  { icon: '\u{1F6AB}', text: 'Policies change without warning', delay: 54 },
];

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <GridBackground />
      <GlowOrb x={800} y={500} size={400} color={COLORS.red} pulseSpeed={40} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 80px',
        }}
      >
        <AnimatedText
          text="The status quo is broken."
          fontSize={46}
          fontWeight={800}
          delay={0}
          color={COLORS.red}
        />

        <div style={{ marginTop: 50 }}>
          {PAIN_POINTS.map((point, i) => {
            const opacity = interpolate(
              frame - point.delay,
              [0, 10],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            );
            const translateX = interpolate(
              frame - point.delay,
              [0, 14],
              [60, 0],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.out(Easing.cubic),
              },
            );

            return (
              <div
                key={i}
                style={{
                  opacity,
                  transform: `translateX(${translateX}px)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  marginBottom: 28,
                  background: `${COLORS.white}08`,
                  borderRadius: 16,
                  padding: '20px 28px',
                  border: `1px solid ${COLORS.white}12`,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <span style={{ fontSize: 36 }}>{point.icon}</span>
                <span
                  style={{
                    fontSize: 30,
                    fontWeight: 600,
                    color: COLORS.white,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  {point.text}
                </span>
              </div>
            );
          })}
        </div>

        <AnimatedText
          text="Healthcare teams deserve better."
          fontSize={28}
          fontWeight={500}
          color={`${COLORS.white}88`}
          delay={72}
          style={{ marginTop: 20 }}
        />
      </div>
    </div>
  );
};
