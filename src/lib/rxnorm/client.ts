/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
const RXNORM_BASE = process.env.RXNORM_API_BASE ?? 'https://rxnav.nlm.nih.gov/REST';

export async function getRxCUI(drugName: string): Promise<string | null> {
  const res = await fetch(
    `${RXNORM_BASE}/rxcui.json?name=${encodeURIComponent(drugName)}`,
  );
  const data = await res.json();
  return data.idGroup?.rxnormId?.[0] ?? null;
}

export async function getRelatedConcepts(rxcui: string) {
  const res = await fetch(`${RXNORM_BASE}/rxcui/${rxcui}/allrelated.json`);
  return res.json();
}
