import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { COLORS, BRAND } from '../config';
import { AnimatedText } from '../components/AnimatedText';
import { GlowOrb } from '../components/GlowOrb';
import { GridBackground } from '../components/GridBackground';
import { UICard } from '../components/UICard';

export const RevealScene: React.FC = () => {
  const frame = useCurrentFrame();

  /* Logo entrance */
  const logoScale = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.7)),
  });

  const logoRotate = interpolate(frame, [0, 20], [-180, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  /* Glow ring pulse */
  const ringScale = interpolate(frame, [15, 40], [0.8, 1.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ringOpacity = interpolate(frame, [15, 40], [0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <GridBackground />
      <GlowOrb x={540} y={960} size={600} color={COLORS.sky} />
      <GlowOrb x={300} y={600} size={350} color={COLORS.accent} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 60px',
        }}
      >
        {/* Logo icon with glow ring */}
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <div
            style={{
              position: 'absolute',
              inset: -30,
              borderRadius: '50%',
              border: `3px solid ${COLORS.sky}`,
              transform: `scale(${ringScale})`,
              opacity: ringOpacity,
            }}
          />
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.accent})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
              boxShadow: `0 20px 60px ${COLORS.sky}50`,
            }}
          >
            <span
              style={{
                fontSize: 50,
                fontWeight: 900,
                color: COLORS.navy,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              iRx
            </span>
          </div>
        </div>

        {/* Product name */}
        <AnimatedText
          text={BRAND.name}
          fontSize={72}
          fontWeight={900}
          delay={15}
          style={{ textAlign: 'center', letterSpacing: -2 }}
        />

        <AnimatedText
          text={BRAND.tagline}
          fontSize={30}
          fontWeight={500}
          color={COLORS.sky}
          delay={28}
          style={{ textAlign: 'center', marginTop: 8 }}
        />

        {/* Mini dashboard preview card */}
        <div style={{ marginTop: 50 }}>
          <UICard delay={40} width={920} glow>
            {/* Fake dashboard header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.sky,
                    fontFamily: 'system-ui, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: 1.5,
                  }}
                >
                  Policy Intelligence Dashboard
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: COLORS.navy,
                    fontFamily: 'system-ui, sans-serif',
                    marginTop: 4,
                  }}
                >
                  AntonRX
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                }}
              >
                {['Upload PDF', 'Auto-Fetch'].map((btn) => (
                  <div
                    key={btn}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: 'system-ui, sans-serif',
                      background:
                        btn === 'Upload PDF' ? COLORS.sky : 'transparent',
                      color:
                        btn === 'Upload PDF' ? COLORS.navy : COLORS.navy,
                      border:
                        btn === 'Upload PDF'
                          ? 'none'
                          : `1px solid ${COLORS.navy}30`,
                    }}
                  >
                    {btn}
                  </div>
                ))}
              </div>
            </div>

            {/* Stat row */}
            <div
              style={{
                display: 'flex',
                gap: 24,
                borderTop: `1px solid ${COLORS.offWhite}`,
                paddingTop: 16,
              }}
            >
              {[
                { n: '47', label: 'Policies' },
                { n: '312', label: 'Drugs' },
                { n: '5', label: 'Payers' },
                { n: '23', label: 'Changes' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: COLORS.navy,
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    {stat.n}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#888',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </UICard>
        </div>
      </div>
    </div>
  );
};
