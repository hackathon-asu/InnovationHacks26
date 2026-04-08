/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import { getRxCUI, getRelatedConcepts } from './client';

export async function normalizeToRxCUI(drugName: string): Promise<{
  rxcui: string | null;
  brandName: string | null;
  genericName: string | null;
}> {
  const rxcui = await getRxCUI(drugName);

  if (!rxcui) return { rxcui: null, brandName: null, genericName: null };

  const related = await getRelatedConcepts(rxcui);
  const conceptGroups = related?.allRelatedGroup?.conceptGroup ?? [];

  let brandName: string | null = null;
  let genericName: string | null = null;

  for (const group of conceptGroups) {
    const concepts = group.conceptProperties;
    if (!concepts?.length) continue;

    if (group.tty === 'BN') {
      brandName = concepts[0].name;
    } else if (group.tty === 'IN') {
      genericName = concepts[0].name;
    }
  }

  return { rxcui, brandName, genericName };
}
