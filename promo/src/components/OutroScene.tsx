import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, VIDEO_WIDTH, VIDEO_HEIGHT } from "../constants";
import { Background } from "./Background";

export const OutroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const logoOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Tagline
  const taglineOpacity = interpolate(frame, [15, 28], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const taglineY = interpolate(frame, [15, 28], [20, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Details
  const detailsOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const detailsY = interpolate(frame, [30, 45], [20, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Divider line width
  const dividerWidth = interpolate(frame, [25, 45], [0, 400], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Accent glow pulse
  const glowPulse = interpolate(
    Math.sin(frame * 0.05),
    [-1, 1],
    [0.15, 0.35]
  );

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

      {/* Large glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accent}${Math.round(glowPulse * 255).toString(16).padStart(2, "0")}, transparent 70%)`,
          transform: "translate(-50%, -50%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 80px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 72,
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
            marginBottom: 30,
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: COLORS.accent,
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.4,
            }}
          >
            Every payer. Every drug. One search.
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: dividerWidth,
            height: 2,
            backgroundColor: `${COLORS.accent}40`,
            borderRadius: 1,
            marginBottom: 30,
          }}
        />

        {/* Details */}
        <div
          style={{
            opacity: detailsOpacity,
            transform: `translateY(${detailsY}px)`,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: COLORS.white,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Built at Innovation Hacks 2.0 -- ASU
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: COLORS.white,
              fontFamily: "Inter, sans-serif",
            }}
          >
            The Formulators
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: COLORS.whiteAlpha,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Abhinav, Neeharika & Adi
          </div>

          {/* GitHub link */}
          <div
            style={{
              marginTop: 24,
              padding: "16px 36px",
              borderRadius: 16,
              backgroundColor: "rgba(145,191,235,0.08)",
              border: "1px solid rgba(145,191,235,0.2)",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.accent,
                fontFamily: "Inter, sans-serif",
                letterSpacing: 0.5,
              }}
            >
              github.com/hackathon-asu/InnovationHacks26
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
