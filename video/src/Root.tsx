import { Composition } from 'remotion';
import { InsightRXAd } from './Composition';
import { VIDEO } from './config';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="InsightRXAd"
        component={InsightRXAd}
        durationInFrames={VIDEO.durationInFrames}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    </>
  );
};
