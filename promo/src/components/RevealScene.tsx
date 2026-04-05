import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, VIDEO_WIDTH, VIDEO_HEIGHT, PIPELINE_STAGES } from "../constants";
import { Background } from "./Background";

export const RevealScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo reveal
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const logoOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Tagline
  const taglineOpacity = interpolate(frame, [25, 40], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const taglineY = interpolate(frame, [25, 40], [30, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Accent glow behind logo
  const glowScale = interpolate(frame, [5, 30], [0.5, 1.2], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const glowOpacity = interpolate(frame, [5, 20, 50, 80], [0, 0.4, 0.4, 0.2], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Background variant="dark" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 60px",
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${COLORS.accent}40, transparent 70%)`,
            transform: `scale(${glowScale})`,
            opacity: glowOpacity,
          }}
        />

        {/* Logo */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              color: COLORS.white,
              fontFamily: "Montserrat, sans-serif",
              letterSpacing: -3,
            }}
          >
            INSIGHT
            <span style={{ color: COLORS.accent }}>RX</span>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 38,
              fontWeight: 600,
              color: COLORS.accent,
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.4,
            }}
          >
            From PDF to prior auth in seconds.
          </div>
        </div>

        {/* 8-stage pipeline animation */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 16,
            maxWidth: 900,
          }}
        >
          {PIPELINE_STAGES.map((stage, i) => {
            const stageDelay = 50 + i * 6;
            const stageSpring = spring({
              frame: frame - stageDelay,
              fps,
              config: { damping: 14, stiffness: 150 },
            });
            const stageOpacity = interpolate(
              frame,
              [stageDelay, stageDelay + 6],
              [0, 1],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            );

            // Active highlight sweeps across stages
            const isActive =
              frame > stageDelay + 10 &&
              Math.floor((frame - stageDelay - 10) / 8) % PIPELINE_STAGES.length === 0;
            const activePulse =
              frame > stageDelay
                ? interpolate(
                    ((frame - stageDelay) * 0.8) % (PIPELINE_STAGES.length * 8),
                    [i * 8, i * 8 + 4, i * 8 + 8],
                    [0, 1, 0],
                    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
                  )
                : 0;

            return (
              <div
                key={i}
                style={{
                  opacity: stageOpacity,
                  transform: `scale(${stageSpring})`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  width: 110,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    backgroundColor: interpolate(activePulse, [0, 1], [0.08, 0.25]).toString().includes(".")
                      ? `rgba(145,191,235,${interpolate(activePulse, [0, 1], [0.08, 0.3])})`
                      : "rgba(145,191,235,0.08)",
                    border: `2px solid rgba(145,191,235,${interpolate(activePulse, [0, 1], [0.2, 0.8])})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: COLORS.accent,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {stage.icon}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: COLORS.whiteAlpha,
                    fontFamily: "Inter, sans-serif",
                    textAlign: "center",
                  }}
                >
                  {stage.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
