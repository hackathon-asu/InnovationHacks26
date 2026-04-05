/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import { ImageResponse } from 'next/og';

export const alt = 'AntonRX — AI-Powered Drug Policy Tracker';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 80px',
          background: 'linear-gradient(135deg, #0F1117 0%, #15173F 50%, #1a1d4a 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#91BFEB22',
              border: '2px solid #91BFEB44',
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 800, color: '#91BFEB' }}>A</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF' }}>Rx</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              ANTONRX
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#91BFEB',
                background: '#91BFEB18',
                padding: '4px 12px',
                borderRadius: 20,
                border: '1px solid #91BFEB33',
              }}
            >
              AI Policy Tracker
            </span>
          </div>
        </div>

        {/* Center: Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            Drug Coverage Intelligence
          </div>
          <div style={{ fontSize: 24, color: '#94a3b8', lineHeight: 1.4, maxWidth: 700 }}>
            Parse, compare, and track medical policies across major US payers with AI-powered extraction.
          </div>
        </div>

        {/* Bottom: Stats */}
        <div style={{ display: 'flex', gap: 48 }}>
          {[
            { label: 'AI Models', value: '5' },
            { label: 'Pipeline Stages', value: '8' },
            { label: 'Payer Adapters', value: '3+' },
            { label: 'Embedding Dims', value: '768' },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#91BFEB' }}>{stat.value}</span>
              <span style={{ fontSize: 14, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
