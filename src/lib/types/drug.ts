export interface Drug {
  brandName: string | null;
  genericName: string | null;
  rxcui: string | null;
  jCode: string | null;
}

export interface DrugSearchResult extends Drug {
  planCount: number;
}
