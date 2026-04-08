import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { COLORS } from '../config';
import { AnimatedText } from '../components/AnimatedText';
import { GlowOrb } from '../components/GlowOrb';
import { GridBackground } from '../components/GridBackground';

const DIFFS = [
  { icon: '\u26A1', text: 'Fully automated\n8-stage pipeline', delay: 10 },
  { icon: '\u{1F30E}', text: 'Multi-payer\nauto-fetch', delay: 22 },
  { icon: '\u{1F9EC}', text: 'Biomedical NLP +\nRxNorm normalization', delay: 34 },
  { icon: '\u{1F50E}', text: 'Hybrid RAG with\nvector search', delay: 46 },
  { icon: '\u{1F504}', text: 'Semantic change\ndetection', delay: 58 },
  { icon: '\u{1F916}', text: '5 LLM providers\nswappable', delay: 70 },
];

export const DifferentiatorScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <GridBackground />
      <GlowOrb x={540} y={960} size={700} color={COLORS.accent} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 70px',
        }}
      >
        <AnimatedText
          text="Why it stands out."
          fontSize={48}
          fontWeight={900}
          delay={0}
          style={{ textAlign: 'center', marginBottom: 40 }}
        />

        {/* 2x3 grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'center',
            maxWidth: 940,
          }}
        >
          {DIFFS.map((d, i) => {
            const opacity = interpolate(frame - d.delay, [0, 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const scale = interpolate(frame - d.delay, [0, 12], [0.85, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.out(Easing.back(1.3)),
            });

            return (
              <div
                key={i}
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                  width: 290,
                  padding: '24px 20px',
                  borderRadius: 20,
                  background: `${COLORS.white}0a`,
                  border: `1px solid ${COLORS.white}15`,
                  backdropFilter: 'blur(12px)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>{d.icon}</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: COLORS.white,
                    fontFamily: 'system-ui, sans-serif',
                    lineHeight: 1.3,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {d.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
