/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#15173F',
          borderRadius: 36,
        }}
      >
        <span style={{ fontSize: 48, fontWeight: 800, color: '#91BFEB' }}>A</span>
        <span style={{ fontSize: 48, fontWeight: 800, color: '#FFFFFF' }}>Rx</span>
      </div>
    ),
    { ...size }
  );
}
