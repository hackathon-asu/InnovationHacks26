import { Series } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { FPS, SCENE_DURATIONS } from "./constants";
import { HookScene } from "./components/HookScene";
import { ProblemScene } from "./components/ProblemScene";
import { RevealScene } from "./components/RevealScene";
import { FeaturesScene } from "./components/FeaturesScene";
import { DifferentiatorScene } from "./components/DifferentiatorScene";
import { OutroScene } from "./components/OutroScene";

// Load fonts globally
loadInter("normal", { weights: ["400", "600", "700", "800", "900"], subsets: ["latin"] });
const { fontFamily: montserrat } = loadMontserrat("normal", {
  weights: ["700", "800", "900"],
  subsets: ["latin"],
});

export { montserrat };

export const AInsightRXPromo = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.hook * FPS}>
        <HookScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.problem * FPS}>
        <ProblemScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.reveal * FPS}>
        <RevealScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.features * FPS}>
        <FeaturesScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.differentiator * FPS}>
        <DifferentiatorScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={SCENE_DURATIONS.outro * FPS}>
        <OutroScene />
      </Series.Sequence>
    </Series>
  );
};
