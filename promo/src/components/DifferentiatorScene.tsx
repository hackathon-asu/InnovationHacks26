import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, VIDEO_WIDTH, VIDEO_HEIGHT } from "../constants";
import { Background } from "./Background";

const FLOW_STEPS = ["PDF", "Pipeline", "Data", "Search", "Answer"];

export const DifferentiatorScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header
  const headerOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const headerScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Subheader
  const subOpacity = interpolate(frame, [12, 24], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const subY = interpolate(frame, [12, 24], [20, 0], {
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

      {/* Accent glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accent}20, transparent 70%)`,
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
          padding: "0 64px",
        }}
      >
        {/* Main statement */}
        <div
          style={{
            opacity: headerOpacity,
            transform: `scale(${headerScale})`,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: COLORS.white,
              fontFamily: "Montserrat, sans-serif",
              lineHeight: 1.15,
              letterSpacing: -2,
            }}
          >
            End-to-end.
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: COLORS.accent,
              fontFamily: "Montserrat, sans-serif",
              lineHeight: 1.15,
              letterSpacing: -2,
            }}
          >
            Zero manual work.
          </div>
        </div>

        <div
          style={{
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: COLORS.whiteAlpha,
              fontFamily: "Inter, sans-serif",
            }}
          >
            One flow. From upload to answer.
          </div>
        </div>

        {/* Flow visualization */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            justifyContent: "center",
          }}
        >
          {FLOW_STEPS.map((step, i) => {
            const stepDelay = 30 + i * 10;
            const stepSpring = spring({
              frame: frame - stepDelay,
              fps,
              config: { damping: 14, stiffness: 120 },
            });
            const stepOpacity = interpolate(
              frame,
              [stepDelay, stepDelay + 8],
              [0, 1],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            );
            const stepScale = interpolate(stepSpring, [0, 1], [0.5, 1]);

            // Arrow opacity
            const arrowOpacity =
              i < FLOW_STEPS.length - 1
                ? interpolate(
                    frame,
                    [stepDelay + 6, stepDelay + 12],
                    [0, 1],
                    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
                  )
                : 0;

            // Active pulse
            const pulseProgress =
              frame > 70
                ? ((frame - 70) * 0.15) % FLOW_STEPS.length
                : -1;
            const isPulsing =
              pulseProgress >= i - 0.3 && pulseProgress <= i + 0.3;
            const pulseScale = isPulsing ? 1.1 : 1;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  opacity: stepOpacity,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    transform: `scale(${stepScale * pulseScale})`,
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 18,
                      backgroundColor: isPulsing
                        ? `${COLORS.accent}30`
                        : "rgba(145,191,235,0.08)",
                      border: `2px solid ${isPulsing ? COLORS.accent : "rgba(145,191,235,0.2)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: isPulsing ? COLORS.accent : COLORS.whiteAlpha,
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {`0${i + 1}`}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: isPulsing ? COLORS.white : COLORS.whiteAlpha,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {step}
                  </div>
                </div>

                {/* Arrow */}
                {i < FLOW_STEPS.length - 1 && (
                  <div
                    style={{
                      opacity: arrowOpacity,
                      margin: "0 6px",
                      marginBottom: 30,
                      fontSize: 28,
                      color: COLORS.accent,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {"\u203A"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
