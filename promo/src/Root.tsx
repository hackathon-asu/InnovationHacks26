import { Composition } from "remotion";
import { AInsightRXPromo } from "./Video";
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  FPS,
  TOTAL_DURATION_FRAMES,
} from "./constants";

export const RemotionRoot = () => {
  return (
    <Composition
      id="InsightRX-Promo"
      component={AInsightRXPromo}
      durationInFrames={TOTAL_DURATION_FRAMES}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
  );
};
