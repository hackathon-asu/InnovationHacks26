/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
export interface PolicyChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  significance: 'breaking' | 'material' | 'minor' | 'cosmetic';
}

export function computeDiff(
  oldClaims: Record<string, unknown>[],
  newClaims: Record<string, unknown>[],
): PolicyChange[] {
  // TODO: Implement structured diff between policy claim versions
  // Compare by rxcui, detect added/removed drugs, changed coverage_status,
  // changed prior_auth, changed step therapy
  return [];
}
