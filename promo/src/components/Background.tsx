import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS, VIDEO_WIDTH, VIDEO_HEIGHT } from "../constants";

// Floating geometric shapes for subtle background motion
export const Background: React.FC<{ variant?: "dark" | "light" }> = ({
  variant = "dark",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgColor = variant === "dark" ? COLORS.navy : COLORS.bodyBg;
  const shapeColor =
    variant === "dark" ? "rgba(145,191,235,0.06)" : "rgba(21,23,63,0.04)";

  const shapes = [
    { x: 100, y: 80, size: 180, speed: 0.3, rotation: 0.5 },
    { x: 1500, y: 200, size: 140, speed: 0.2, rotation: -0.3 },
    { x: 800, y: 700, size: 200, speed: 0.4, rotation: 0.7 },
    { x: 1700, y: 500, size: 100, speed: 0.25, rotation: -0.6 },
    { x: 400, y: 600, size: 160, speed: 0.35, rotation: 0.4 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        backgroundColor: bgColor,
        overflow: "hidden",
      }}
    >
      {/* Subtle grid lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(${variant === "dark" ? "rgba(145,191,235,0.03)" : "rgba(21,23,63,0.03)"} 1px, transparent 1px),
            linear-gradient(90deg, ${variant === "dark" ? "rgba(145,191,235,0.03)" : "rgba(21,23,63,0.03)"} 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Floating shapes */}
      {shapes.map((shape, i) => {
        const yOffset = Math.sin((frame * shape.speed) / fps) * 30;
        const rotation = (frame * shape.rotation) % 360;
        const pulseScale = interpolate(
          Math.sin((frame * 0.02 * (i + 1)) % (Math.PI * 2)),
          [-1, 1],
          [0.9, 1.1]
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: shape.x,
              top: shape.y + yOffset,
              width: shape.size,
              height: shape.size,
              borderRadius: i % 2 === 0 ? "50%" : "20%",
              border: `1px solid ${shapeColor}`,
              backgroundColor: i % 3 === 0 ? shapeColor : "transparent",
              transform: `rotate(${rotation}deg) scale(${pulseScale})`,
            }}
          />
        );
      })}

      {/* Gradient overlay at top and bottom */}
      <div
        style={{
          position: "absolute",
          top: 0,
          width: "100%",
          height: 300,
          background: `linear-gradient(180deg, ${bgColor}, transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          width: "100%",
          height: 300,
          background: `linear-gradient(0deg, ${bgColor}, transparent)`,
        }}
      />
    </div>
  );
};
