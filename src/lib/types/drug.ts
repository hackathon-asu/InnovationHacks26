/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
export interface Drug {
  brandName: string | null;
  genericName: string | null;
  rxcui: string | null;
  jCode: string | null;
}

export interface DrugSearchResult extends Drug {
  planCount: number;
}
