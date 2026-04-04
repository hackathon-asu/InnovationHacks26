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
