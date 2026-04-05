/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
export interface Payer {
  id: string;
  name: string;
  websiteUrl: string | null;
}

export interface Plan {
  id: string;
  payerId: string;
  name: string;
  lineOfBusiness: string;
  state: string | null;
  productType: string | null;
}

export interface Policy {
  id: string;
  planId: string;
  policyNumber: string;
  title: string;
  effectiveDate: string;
  version: number;
  status: string;
}

export interface PolicyClaim {
  id: string;
  policyId: string;
  drugBrandName: string | null;
  drugGenericName: string | null;
  rxcui: string | null;
  jCode: string | null;
  coverageStatus: string | null;
  priorAuthRequired: boolean | null;
  extractedData: unknown;
  sourceExcerpt: string | null;
  sourcePage: number | null;
  sourceSection: string | null;
  confidence: number | null;
}
