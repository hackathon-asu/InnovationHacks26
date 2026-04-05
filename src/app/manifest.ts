/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AntonRX — AI Policy Tracker',
    short_name: 'AntonRX',
    description: 'Drug coverage tracking and comparison across major US payers with AI-powered extraction.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F1117',
    theme_color: '#15173F',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
