/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import { z } from 'zod';

export const PolicyClaimSchema = z.object({
  claims: z.array(z.object({
    drugBrandName: z.string().optional(),
    drugGenericName: z.string().optional(),
    jCode: z.string().optional(),
    coverageStatus: z.enum([
      'covered', 'not_covered', 'covered_with_criteria',
      'experimental', 'not_addressed',
    ]),
    priorAuthRequired: z.boolean(),
    extractedData: z.object({
      stepTherapy: z.array(z.object({
        stepNumber: z.number(),
        drugOrClass: z.string(),
        minDuration: z.string().optional(),
        failureDefinition: z.string().optional(),
      })).optional(),
      quantityLimits: z.object({
        quantity: z.number(),
        unit: z.string(),
        period: z.string(),
      }).optional(),
      clinicalCriteria: z.array(z.object({
        type: z.string(),
        description: z.string(),
        icdCodes: z.array(z.string()).optional(),
      })).optional(),
      siteOfCare: z.string().optional(),
      ageRestrictions: z.string().optional(),
      additionalNotes: z.string().optional(),
    }),
    sourceExcerpt: z.string(),
    sourcePage: z.number().optional(),
    sourceSection: z.string().optional(),
    confidence: z.number().min(0).max(1),
  })),
});

export type PolicyClaimExtraction = z.infer<typeof PolicyClaimSchema>;
