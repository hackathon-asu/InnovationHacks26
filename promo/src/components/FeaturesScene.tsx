import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, VIDEO_WIDTH, VIDEO_HEIGHT } from "../constants";
import { Background } from "./Background";

const FEATURES = [
  {
    title: "AI Extraction",
    desc: "8-stage pipeline, 5 LLM providers",
    color: COLORS.accent,
    bgColor: "rgba(145,191,235,0.10)",
    borderColor: "rgba(145,191,235,0.25)",
  },
  {
    title: "Drug Compare",
    desc: "Side-by-side across all payers",
    color: COLORS.greenAccent,
    bgColor: "rgba(52,211,153,0.10)",
    borderColor: "rgba(52,211,153,0.25)",
  },
  {
    title: "Ask AI",
    desc: "RAG Q&A with real citations",
    color: COLORS.purple,
    bgColor: "rgba(167,139,250,0.10)",
    borderColor: "rgba(167,139,250,0.25)",
  },
  {
    title: "Auto-Fetch",
    desc: "Pull latest from payer sites",
    color: COLORS.amber,
    bgColor: "rgba(251,191,36,0.10)",
    borderColor: "rgba(251,191,36,0.25)",
  },
];

export const FeaturesScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header
  const headerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const headerY = interpolate(frame, [0, 15], [30, 0], {
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
          padding: "0 64px",
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: headerOpacity,
            transform: `translateY(${headerY}px)`,
            textAlign: "center",
            marginBottom: 40,
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
              marginBottom: 12,
            }}
          >
            Key Features
          </div>
          <div
            style={{
              fontSize: 46,
              fontWeight: 900,
              color: COLORS.white,
              fontFamily: "Montserrat, sans-serif",
              lineHeight: 1.2,
            }}
          >
            Everything you need.
          </div>
        </div>

        {/* Feature cards */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            width: "100%",
            justifyContent: "center",
          }}
        >
          {FEATURES.map((feature, i) => {
            const cardDelay = 20 + i * 18;
            const cardSpring = spring({
              frame: frame - cardDelay,
              fps,
              config: { damping: 14, stiffness: 100 },
            });
            const cardOpacity = interpolate(
              frame,
              [cardDelay, cardDelay + 10],
              [0, 1],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            );
            const cardX = interpolate(
              cardSpring,
              [0, 1],
              [i % 2 === 0 ? -120 : 120, 0]
            );
            const cardScale = interpolate(cardSpring, [0, 1], [0.9, 1]);

            // Accent bar width animates in
            const barWidth = interpolate(
              frame,
              [cardDelay + 8, cardDelay + 25],
              [0, 6],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            );

            return (
              <div
                key={i}
                style={{
                  opacity: cardOpacity,
                  transform: `translateX(${cardX}px) scale(${cardScale})`,
                  display: "flex",
                  alignItems: "stretch",
                  backgroundColor: feature.bgColor,
                  border: `1px solid ${feature.borderColor}`,
                  borderRadius: 24,
                  overflow: "hidden",
                  width: "calc(50% - 12px)",
                }}
              >
                {/* Accent bar */}
                <div
                  style={{
                    width: barWidth,
                    backgroundColor: feature.color,
                    flexShrink: 0,
                    borderRadius: "24px 0 0 24px",
                  }}
                />

                {/* Content */}
                <div style={{ padding: "24px 28px" }}>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: feature.color,
                      fontFamily: "Montserrat, sans-serif",
                      marginBottom: 8,
                    }}
                  >
                    {feature.title}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 500,
                      color: COLORS.whiteAlpha,
                      fontFamily: "Inter, sans-serif",
                      lineHeight: 1.4,
                    }}
                  >
                    {feature.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
