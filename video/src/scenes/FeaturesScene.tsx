import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { COLORS } from '../config';
import { AnimatedText } from '../components/AnimatedText';
import { GlowOrb } from '../components/GlowOrb';
import { GridBackground } from '../components/GridBackground';
import { UICard } from '../components/UICard';

interface Feature {
  title: string;
  desc: string;
  detail: string;
  color: string;
  startFrame: number;
}

const FEATURES: Feature[] = [
  {
    title: '8-Stage AI Pipeline',
    desc: 'Upload a PDF. Get structured drug data.',
    detail: 'Parse > NLP > LLM Extract > RxNorm > Store > Chunk > Embed > Index',
    color: COLORS.sky,
    startFrame: 0,
  },
  {
    title: 'Cross-Payer Comparison',
    desc: 'Side-by-side coverage, PA, step therapy.',
    detail: 'Cigna vs UHC vs Priority Health in one matrix',
    color: COLORS.accent,
    startFrame: 75,
  },
  {
    title: 'RAG-Powered Q&A',
    desc: 'Ask questions. Get cited answers.',
    detail: 'pgvector similarity search + Gemini grounding',
    color: '#A78BFA',
    startFrame: 150,
  },
  {
    title: 'Change Detection',
    desc: 'Know when policies shift beneath you.',
    detail: 'Semantic diff + significance classification',
    color: COLORS.amber,
    startFrame: 225,
  },
];

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <GridBackground />

      {FEATURES.map((feature, idx) => {
        const featureFrame = frame - feature.startFrame;
        const isVisible = featureFrame >= 0 && featureFrame < 85;
        const isCurrent = featureFrame >= 0 && featureFrame < 75;

        if (!isVisible) return null;

        const opacity = isCurrent
          ? interpolate(featureFrame, [0, 12, 65, 75], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          : 0;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              inset: 0,
              opacity,
            }}
          >
            <GlowOrb
              x={540}
              y={800}
              size={500}
              color={feature.color}
              pulseSpeed={50}
            />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 70px',
              }}
            >
              {/* Feature number */}
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: feature.color,
                  fontFamily: 'system-ui, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: 3,
                  marginBottom: 16,
                }}
              >
                0{idx + 1} / 04
              </div>

              <AnimatedText
                text={feature.title}
                fontSize={52}
                fontWeight={900}
                delay={5}
                style={{ textAlign: 'center', letterSpacing: -1 }}
              />

              <AnimatedText
                text={feature.desc}
                fontSize={30}
                fontWeight={500}
                color={`${COLORS.white}cc`}
                delay={14}
                style={{ textAlign: 'center', marginTop: 12 }}
              />

              {/* Feature card */}
              <div style={{ marginTop: 40, width: '100%' }}>
                <FeatureDetailCard
                  feature={feature}
                  idx={idx}
                  featureFrame={featureFrame}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const FeatureDetailCard: React.FC<{
  feature: Feature;
  idx: number;
  featureFrame: number;
}> = ({ feature, idx, featureFrame }) => {
  return (
    <UICard delay={20} glow>
      {idx === 0 && <PipelineViz frame={featureFrame} />}
      {idx === 1 && <ComparisonViz frame={featureFrame} />}
      {idx === 2 && <ChatViz frame={featureFrame} />}
      {idx === 3 && <ChangeViz frame={featureFrame} />}
      <div
        style={{
          marginTop: 16,
          fontSize: 16,
          color: '#666',
          fontFamily: 'monospace',
          textAlign: 'center',
        }}
      >
        {feature.detail}
      </div>
    </UICard>
  );
};

/* ── Pipeline visualization ──────────────────────────── */
const PipelineViz: React.FC<{ frame: number }> = ({ frame }) => {
  const stages = ['Parse', 'NLP', 'LLM', 'RxNorm', 'Store', 'Chunk', 'Embed', 'Index'];

  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
      {stages.map((stage, i) => {
        const stageFrame = frame - 22 - i * 3;
        const opacity = interpolate(stageFrame, [0, 6], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const isActive = stageFrame > 6;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                opacity,
                padding: '10px 14px',
                borderRadius: 10,
                background: isActive
                  ? `${COLORS.sky}20`
                  : `${COLORS.offWhite}`,
                border: `1px solid ${isActive ? COLORS.sky : '#ddd'}`,
                fontSize: 14,
                fontWeight: 600,
                color: isActive ? COLORS.navy : '#999',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {stage}
            </div>
            {i < stages.length - 1 && (
              <span style={{ opacity, color: '#ccc', fontSize: 16 }}>
                {'\u2192'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ── Comparison matrix viz ───────────────────────────── */
const ComparisonViz: React.FC<{ frame: number }> = ({ frame }) => {
  const payers = [
    { name: 'Cigna', status: 'Covered', pa: 'Required', color: COLORS.emerald },
    { name: 'UHC', status: 'Conditional', pa: 'Required', color: COLORS.amber },
    { name: 'Priority', status: 'Not Covered', pa: 'N/A', color: COLORS.red },
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '8px 12px',
          borderBottom: `1px solid ${COLORS.offWhite}`,
          marginBottom: 8,
        }}
      >
        {['Payer', 'Coverage', 'Prior Auth', 'Step Therapy'].map((h) => (
          <div
            key={h}
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 700,
              color: '#999',
              fontFamily: 'system-ui, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {h}
          </div>
        ))}
      </div>
      {payers.map((p, i) => {
        const rowOpacity = interpolate(frame - 24 - i * 6, [0, 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={i}
            style={{
              opacity: rowOpacity,
              display: 'flex',
              gap: 12,
              padding: '10px 12px',
              borderBottom: i < 2 ? `1px solid ${COLORS.offWhite}` : 'none',
            }}
          >
            <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: COLORS.navy, fontFamily: 'system-ui, sans-serif' }}>{p.name}</div>
            <div style={{ flex: 1 }}>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  background: `${p.color}20`,
                  color: p.color,
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {p.status}
              </span>
            </div>
            <div style={{ flex: 1, fontSize: 14, color: '#666', fontFamily: 'system-ui, sans-serif' }}>{p.pa}</div>
            <div style={{ flex: 1, fontSize: 14, color: '#666', fontFamily: 'system-ui, sans-serif' }}>{i === 0 ? 'Yes' : 'No'}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Chat / RAG viz ──────────────────────────────────── */
const ChatViz: React.FC<{ frame: number }> = ({ frame }) => {
  const q = 'Which plans cover bevacizumab?';
  const a = 'Cigna covers bevacizumab (J9035) under medical benefit with prior auth. UHC covers it as conditional with step therapy through biosimilar first.';

  const qOpacity = interpolate(frame - 22, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const aOpacity = interpolate(frame - 35, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* User question */}
      <div style={{ opacity: qOpacity, display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            background: COLORS.navy,
            color: COLORS.white,
            padding: '12px 18px',
            borderRadius: '16px 16px 4px 16px',
            fontSize: 16,
            fontFamily: 'system-ui, sans-serif',
            maxWidth: '80%',
          }}
        >
          {q}
        </div>
      </div>
      {/* AI answer */}
      <div style={{ opacity: aOpacity, display: 'flex', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: COLORS.sky,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 800,
            color: COLORS.navy,
            fontFamily: 'system-ui, sans-serif',
            flexShrink: 0,
          }}
        >
          AI
        </div>
        <div
          style={{
            background: COLORS.offWhite,
            padding: '12px 18px',
            borderRadius: '16px 16px 16px 4px',
            fontSize: 15,
            color: COLORS.navy,
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.5,
          }}
        >
          {a}
        </div>
      </div>
    </div>
  );
};

/* ── Change detection viz ────────────────────────────── */
const ChangeViz: React.FC<{ frame: number }> = ({ frame }) => {
  const changes = [
    { label: 'Breaking', desc: 'Rituxan removed from Cigna coverage', color: COLORS.red, severity: 'breaking' },
    { label: 'Material', desc: 'New ICD-10 codes added for Avastin', color: COLORS.amber, severity: 'material' },
    { label: 'Minor', desc: 'Effective date updated to Q2 2026', color: COLORS.sky, severity: 'minor' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {changes.map((c, i) => {
        const rowOpacity = interpolate(frame - 22 - i * 7, [0, 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={i}
            style={{
              opacity: rowOpacity,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 14px',
              borderRadius: 12,
              background: `${c.color}08`,
              border: `1px solid ${c.color}25`,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: c.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: c.color,
                fontFamily: 'system-ui, sans-serif',
                minWidth: 70,
              }}
            >
              {c.label}
            </span>
            <span
              style={{
                fontSize: 15,
                color: COLORS.navy,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {c.desc}
            </span>
          </div>
        );
      })}
    </div>
  );
};
