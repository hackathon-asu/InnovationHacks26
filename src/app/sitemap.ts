/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://antonrx.vercel.app';

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/demo`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/drugs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/compare`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/upload`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/fetch`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/chat`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/changes`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.5 },
  ];
}
