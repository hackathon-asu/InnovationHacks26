import { google } from '@ai-sdk/google';
import { generateText, Output } from 'ai';
import { PolicyClaimSchema } from './schemas';

export async function extractPolicyClaims(sectionText: string) {
  const result = await generateText({
    model: google('gemini-2.5-flash'),
    temperature: 0,
    output: Output.object({ schema: PolicyClaimSchema }),
    prompt: `Extract structured drug coverage data from this medical policy section.
For each drug mentioned, extract: brand name, generic name, J-code,
coverage status, prior auth requirement, step therapy details,
quantity limits, and clinical criteria.

Include the exact source text you based each extraction on.

Section: ${sectionText}`,
  });

  return result.output;
}
