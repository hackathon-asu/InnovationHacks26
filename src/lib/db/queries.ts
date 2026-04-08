/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */
import { db } from './index';
import { payers, plans, policies, policyClaims, policyVersions } from './schema';
import { eq, and, ilike, or, desc, sql } from 'drizzle-orm';

export async function searchDrugs(query: string, limit = 20) {
  return db
    .select({
      drugBrandName: policyClaims.drugBrandName,
      drugGenericName: policyClaims.drugGenericName,
      rxcui: policyClaims.rxcui,
      jCode: policyClaims.jCode,
      planCount: sql<number>`count(distinct ${policies.planId})`,
    })
    .from(policyClaims)
    .innerJoin(policies, eq(policyClaims.policyId, policies.id))
    .where(
      or(
        ilike(policyClaims.drugBrandName, `%${query}%`),
        ilike(policyClaims.drugGenericName, `%${query}%`),
        ilike(policyClaims.jCode, `%${query}%`),
      ),
    )
    .groupBy(
      policyClaims.drugBrandName,
      policyClaims.drugGenericName,
      policyClaims.rxcui,
      policyClaims.jCode,
    )
    .limit(limit);
}

export async function getDrugCoverage(rxcui: string) {
  return db
    .select({
      payerName: payers.name,
      planName: plans.name,
      lineOfBusiness: plans.lineOfBusiness,
      state: plans.state,
      productType: plans.productType,
      coverageStatus: policyClaims.coverageStatus,
      priorAuth: policyClaims.priorAuthRequired,
      extractedData: policyClaims.extractedData,
      sourceExcerpt: policyClaims.sourceExcerpt,
      confidence: policyClaims.confidence,
      policyNumber: policies.policyNumber,
      effectiveDate: policies.effectiveDate,
    })
    .from(policyClaims)
    .innerJoin(policies, eq(policyClaims.policyId, policies.id))
    .innerJoin(plans, eq(policies.planId, plans.id))
    .innerJoin(payers, eq(plans.payerId, payers.id))
    .where(and(
      eq(policyClaims.rxcui, rxcui),
      eq(policies.status, 'active'),
    ));
}

export async function getRecentChanges(limit = 20) {
  return db
    .select({
      payerName: payers.name,
      planName: plans.name,
      policyTitle: policies.title,
      policyNumber: policies.policyNumber,
      versionNumber: policyVersions.versionNumber,
      effectiveDate: policyVersions.effectiveDate,
      changeSummary: policyVersions.changeSummary,
      diffJson: policyVersions.diffJson,
    })
    .from(policyVersions)
    .innerJoin(policies, eq(policyVersions.policyId, policies.id))
    .innerJoin(plans, eq(policies.planId, plans.id))
    .innerJoin(payers, eq(plans.payerId, payers.id))
    .orderBy(desc(policyVersions.createdAt))
    .limit(limit);
}

export async function getDashboardStats() {
  const [drugCount] = await db
    .select({ count: sql<number>`count(distinct ${policyClaims.rxcui})` })
    .from(policyClaims);

  const [planCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(plans);

  const [policyCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(policies);

  const [changeCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(policyVersions);

  return {
    totalDrugs: drugCount?.count ?? 0,
    totalPlans: planCount?.count ?? 0,
    totalPolicies: policyCount?.count ?? 0,
    totalChanges: changeCount?.count ?? 0,
  };
}
