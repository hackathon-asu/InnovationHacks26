import { AbsoluteFill, Sequence } from 'remotion';
import { VIDEO, SCENES } from './config';
import { HookScene } from './scenes/HookScene';
import { ProblemScene } from './scenes/ProblemScene';
import { RevealScene } from './scenes/RevealScene';
import { FeaturesScene } from './scenes/FeaturesScene';
import { DifferentiatorScene } from './scenes/DifferentiatorScene';
import { OutroScene } from './scenes/OutroScene';

export const InsightRXAd: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#0D0F2B' }}>
      <Sequence
        from={SCENES.hook.start}
        durationInFrames={SCENES.hook.duration}
        name="Hook"
      >
        <HookScene />
      </Sequence>

      <Sequence
        from={SCENES.problem.start}
        durationInFrames={SCENES.problem.duration}
        name="Problem"
      >
        <ProblemScene />
      </Sequence>

      <Sequence
        from={SCENES.reveal.start}
        durationInFrames={SCENES.reveal.duration}
        name="Reveal"
      >
        <RevealScene />
      </Sequence>

      <Sequence
        from={SCENES.features.start}
        durationInFrames={SCENES.features.duration}
        name="Features"
      >
        <FeaturesScene />
      </Sequence>

      <Sequence
        from={SCENES.differentiator.start}
        durationInFrames={SCENES.differentiator.duration}
        name="Differentiator"
      >
        <DifferentiatorScene />
      </Sequence>

      <Sequence
        from={SCENES.outro.start}
        durationInFrames={SCENES.outro.duration}
        name="Outro"
      >
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
