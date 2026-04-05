import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, VIDEO_WIDTH, VIDEO_HEIGHT } from "../constants";
import { Background } from "./Background";

const PAIN_POINTS = [
  { text: "30+ page PDFs per payer", icon: "1" },
  { text: "5 major insurers", icon: "2" },
  { text: "Different rules for every drug", icon: "3" },
  { text: "Manual lookup = errors + delays", icon: "4" },
];

export const ProblemScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const headerY = interpolate(frame, [0, 12], [40, 0], {
    extrapolateRight: "clamp",
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
          padding: "0 72px",
        }}
      >
        {/* Section header */}
        <div
          style={{
            opacity: headerOpacity,
            transform: `translateY(${headerY}px)`,
            marginBottom: 60,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.accent,
              fontFamily: "Inter, sans-serif",
              letterSpacing: 4,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            The Problem
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: COLORS.white,
              fontFamily: "Montserrat, sans-serif",
              lineHeight: 1.2,
            }}
          >
            Fragmented. Manual.{"\n"}Error-prone.
          </div>
        </div>

        {/* Pain point cards */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, width: "100%", justifyContent: "center" }}>
          {PAIN_POINTS.map((point, i) => {
            const delay = 15 + i * 10;
            const cardSpring = spring({
              frame: frame - delay,
              fps,
              config: { damping: 15, stiffness: 120 },
            });
            const cardOpacity = interpolate(frame, [delay, delay + 8], [0, 1], {
              extrapolateRight: "clamp",
              extrapolateLeft: "clamp",
            });
            const cardX = interpolate(cardSpring, [0, 1], [-80, 0]);

            return (
              <div
                key={i}
                style={{
                  opacity: cardOpacity,
                  transform: `translateX(${cardX}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  backgroundColor: "rgba(145,191,235,0.06)",
                  border: "1px solid rgba(145,191,235,0.12)",
                  borderRadius: 20,
                  padding: "24px 32px",
                  width: "calc(50% - 12px)",
                }}
              >
                {/* Number badge */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    backgroundColor: COLORS.redAccent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: COLORS.white,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {point.icon}
                  </div>
                </div>

                {/* Text */}
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.white,
                    fontFamily: "Inter, sans-serif",
                    lineHeight: 1.3,
                  }}
                >
                  {point.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
