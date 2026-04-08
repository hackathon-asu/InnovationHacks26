import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { COLORS, BRAND } from '../config';
import { AnimatedText } from '../components/AnimatedText';
import { GlowOrb } from '../components/GlowOrb';
import { GridBackground } from '../components/GridBackground';

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();

  /* Logo entrance */
  const logoScale = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.5)),
  });

  /* Expanding ring */
  const ringScale = interpolate(frame, [10, 50], [0.5, 2.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ringOpacity = interpolate(frame, [10, 50], [0.4, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  /* Bottom bar slide-up */
  const barY = interpolate(frame, [50, 70], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const barOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <GridBackground />
      <GlowOrb x={540} y={800} size={600} color={COLORS.sky} />
      <GlowOrb x={540} y={1200} size={400} color={COLORS.accent} />

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
        {/* Ring */}
        <div
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            border: `2px solid ${COLORS.sky}`,
            transform: `scale(${ringScale})`,
            opacity: ringOpacity,
          }}
        />

        {/* Logo */}
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: 32,
            background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.accent})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${logoScale})`,
            boxShadow: `0 20px 80px ${COLORS.sky}60`,
            marginBottom: 28,
          }}
        >
          <span
            style={{
              fontSize: 54,
              fontWeight: 900,
              color: COLORS.navy,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            iRx
          </span>
        </div>

        <AnimatedText
          text={BRAND.name}
          fontSize={76}
          fontWeight={900}
          delay={10}
          style={{ textAlign: 'center', letterSpacing: -2 }}
        />

        <AnimatedText
          text={BRAND.tagline}
          fontSize={28}
          fontWeight={500}
          color={COLORS.sky}
          delay={22}
          style={{ textAlign: 'center', marginTop: 8 }}
        />

        {/* Divider */}
        <div
          style={{
            width: interpolate(frame, [30, 55], [0, 600], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            height: 2,
            background: `linear-gradient(90deg, transparent, ${COLORS.sky}, transparent)`,
            marginTop: 36,
            marginBottom: 36,
          }}
        />

        <AnimatedText
          text={BRAND.hackathon}
          fontSize={24}
          fontWeight={600}
          color={`${COLORS.white}bb`}
          delay={38}
          style={{ textAlign: 'center' }}
        />

        <AnimatedText
          text={`Team ${BRAND.team}`}
          fontSize={22}
          fontWeight={500}
          color={`${COLORS.white}88`}
          delay={45}
          style={{ textAlign: 'center', marginTop: 6 }}
        />

        <AnimatedText
          text={BRAND.members.join(' \u00B7 ')}
          fontSize={20}
          fontWeight={500}
          color={`${COLORS.white}66`}
          delay={50}
          style={{ textAlign: 'center', marginTop: 4 }}
        />
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: barOpacity,
          transform: `translateY(${barY}px)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: `${COLORS.white}10`,
            border: `1px solid ${COLORS.white}20`,
            borderRadius: 16,
            padding: '14px 28px',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* GitHub icon */}
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill={COLORS.white}
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: COLORS.white,
              fontFamily: 'monospace',
            }}
          >
            {BRAND.github}
          </span>
        </div>
      </div>
    </div>
  );
};
