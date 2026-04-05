/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
export interface ComparisonMatrix {
  drug: {
    brandName: string;
    genericName: string;
    rxcui: string;
    jCode?: string;
  };
  comparisons: ComparisonEntry[];
}

export interface ComparisonEntry {
  payerName: string;
  planName: string;
  lineOfBusiness: string;
  coverageStatus: string;
  priorAuth: boolean;
  extractedData: {
    stepTherapy?: Array<{
      stepNumber: number;
      drugOrClass: string;
    }>;
    quantityLimits?: {
      quantity: number;
      unit: string;
      period: string;
    };
    clinicalCriteria?: Array<{
      type: string;
      description: string;
    }>;
  };
  confidence: number;
  policyNumber: string;
  effectiveDate: string;
}
