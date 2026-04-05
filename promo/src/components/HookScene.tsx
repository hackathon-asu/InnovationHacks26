import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, VIDEO_WIDTH, VIDEO_HEIGHT } from "../constants";
import { Background } from "./Background";

export const HookScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main text animation
  const textScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const textOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  // PDF stack animation
  const stackOpacity = interpolate(frame, [15, 25], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const stackY = interpolate(frame, [15, 30], [60, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Shake effect for frustration
  const shakeX =
    frame > 40
      ? Math.sin(frame * 2.5) * interpolate(frame, [40, 70], [0, 4], { extrapolateRight: "clamp" })
      : 0;

  // Red flash pulse
  const flashOpacity =
    frame > 60
      ? interpolate(Math.sin(frame * 0.3), [-1, 1], [0, 0.08])
      : 0;

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

      {/* Red frustration flash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: COLORS.redAccent,
          opacity: flashOpacity,
        }}
      />

      {/* Content container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 80px",
          transform: `translateX(${shakeX}px)`,
        }}
      >
        {/* PDF stack icons */}
        <div
          style={{
            opacity: stackOpacity,
            transform: `translateY(${stackY}px)`,
            marginBottom: 40,
            display: "flex",
            gap: 16,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const delay = i * 4;
            const itemOpacity = interpolate(frame, [15 + delay, 22 + delay], [0, 1], {
              extrapolateRight: "clamp",
              extrapolateLeft: "clamp",
            });
            const itemY = interpolate(frame, [15 + delay, 22 + delay], [30, 0], {
              extrapolateRight: "clamp",
              extrapolateLeft: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  width: 72,
                  height: 92,
                  borderRadius: 8,
                  backgroundColor: "rgba(145,191,235,0.12)",
                  border: "1px solid rgba(145,191,235,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: itemOpacity,
                  transform: `translateY(${itemY}px) rotate(${(i - 2) * 3}deg)`,
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    color: COLORS.accent,
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 700,
                  }}
                >
                  PDF
                </div>
              </div>
            );
          })}
        </div>

        {/* Main hook text */}
        <div
          style={{
            opacity: textOpacity,
            transform: `scale(${textScale})`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: COLORS.white,
              fontFamily: "Montserrat, sans-serif",
              lineHeight: 1.15,
              letterSpacing: -2,
            }}
          >
            Doctors waste hours
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: COLORS.redAccent,
              fontFamily: "Montserrat, sans-serif",
              lineHeight: 1.15,
              letterSpacing: -2,
              marginTop: 8,
            }}
          >
            reading drug policies.
          </div>
        </div>
      </div>
    </div>
  );
};
