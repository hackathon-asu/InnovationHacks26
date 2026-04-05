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
  const changes: PolicyChange[] = [];

  const oldMap = new Map(oldClaims.map((c) => [String(c.rxcui ?? c.drug_brand_name ?? c.id), c]));
  const newMap = new Map(newClaims.map((c) => [String(c.rxcui ?? c.drug_brand_name ?? c.id), c]));

  // Detect removed drugs
  for (const [key, old] of oldMap) {
    if (!newMap.has(key)) {
      changes.push({
        field: `drug_removed:${String(old.drug_brand_name ?? key)}`,
        oldValue: String(old.coverage_status ?? 'covered'),
        newValue: null,
        significance: 'breaking',
      });
    }
  }

  // Detect added drugs
  for (const [key, curr] of newMap) {
    if (!oldMap.has(key)) {
      changes.push({
        field: `drug_added:${String(curr.drug_brand_name ?? key)}`,
        oldValue: null,
        newValue: String(curr.coverage_status ?? 'covered'),
        significance: 'material',
      });
    }
  }

  // Detect changed fields on existing drugs
  for (const [key, curr] of newMap) {
    const old = oldMap.get(key);
    if (!old) continue;

    const tracked: Array<{ field: string; sig: PolicyChange['significance'] }> = [
      { field: 'coverage_status', sig: 'breaking' },
      { field: 'prior_auth_required', sig: 'material' },
      { field: 'step_therapy', sig: 'material' },
      { field: 'quantity_limit', sig: 'material' },
      { field: 'drug_generic_name', sig: 'minor' },
      { field: 'j_code', sig: 'minor' },
      { field: 'indication', sig: 'minor' },
    ];

    for (const { field, sig } of tracked) {
      const oldVal = old[field];
      const newVal = curr[field];
      const oldStr = oldVal == null ? null : String(oldVal);
      const newStr = newVal == null ? null : String(newVal);

      if (oldStr !== newStr) {
        const drugName = String(curr.drug_brand_name ?? key);
        changes.push({
          field: `${drugName}:${field}`,
          oldValue: oldStr,
          newValue: newStr,
          significance: sig,
        });
      }
    }
  }

  return changes;
}
