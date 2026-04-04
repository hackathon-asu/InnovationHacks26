export async function GET() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Anton RX Track API',
      description: 'Drug coverage tracking and comparison across major US payers.',
      version: '1.0.0',
    },
    servers: [{ url: '/' }],
    paths: {
      '/api/stats': {
        get: {
          summary: 'Dashboard statistics',
          description: 'Returns aggregate counts: total drugs, plans, policies, and changes.',
          operationId: 'getStats',
          tags: ['Dashboard'],
          responses: {
            '200': {
              description: 'Dashboard stats',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalDrugs: { type: 'number' },
                      totalPlans: { type: 'number' },
                      totalPolicies: { type: 'number' },
                      totalChanges: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/drugs/search': {
        get: {
          summary: 'Search drugs',
          description: 'Search drugs by name or J-code. Returns matching drugs with coverage summary across plans.',
          operationId: 'searchDrugs',
          tags: ['Drugs'],
          parameters: [
            { name: 'q', in: 'query', required: true, description: 'Drug name or J-code (min 2 chars)', schema: { type: 'string' } },
            { name: 'limit', in: 'query', required: false, description: 'Max results (default 20)', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            '200': {
              description: 'Drug search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      drugs: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            drugBrandName: { type: 'string', nullable: true },
                            drugGenericName: { type: 'string', nullable: true },
                            rxcui: { type: 'string', nullable: true },
                            jCode: { type: 'string', nullable: true },
                            planCount: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/drugs/{rxcui}/coverage': {
        get: {
          summary: 'Drug coverage matrix',
          description: 'Returns coverage comparison across all plans for a given drug RxCUI.',
          operationId: 'getDrugCoverage',
          tags: ['Drugs'],
          parameters: [
            { name: 'rxcui', in: 'path', required: true, description: 'RxNorm Concept ID', schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Coverage comparison matrix',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      drug: { type: 'string' },
                      comparisons: { type: 'array', items: { $ref: '#/components/schemas/CoverageComparison' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/compare': {
        get: {
          summary: 'Compare drug across plans',
          description: 'Build a Drug x Plan comparison grid for a given drug.',
          operationId: 'compareDrug',
          tags: ['Comparison'],
          parameters: [
            { name: 'drug', in: 'query', required: true, description: 'RxCUI or drug name', schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Comparison matrix',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      drug: { type: 'string' },
                      comparisons: { type: 'array', items: { $ref: '#/components/schemas/CoverageComparison' } },
                    },
                  },
                },
              },
            },
            '400': { description: 'Missing drug parameter' },
          },
        },
      },
      '/api/policies': {
        get: {
          summary: 'List policies',
          description: 'Browse and search policies with pagination.',
          operationId: 'listPolicies',
          tags: ['Policies'],
          parameters: [
            { name: 'search', in: 'query', required: false, description: 'Search by title', schema: { type: 'string' } },
            { name: 'status', in: 'query', required: false, description: 'Filter by status', schema: { type: 'string', default: 'active', enum: ['active', 'archived', 'draft'] } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 50 } },
            { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': {
              description: 'Paginated policy list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      policies: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/PolicySummary' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/policies/{id}': {
        get: {
          summary: 'Policy detail',
          description: 'Returns full policy detail with all extracted claims and provenance.',
          operationId: 'getPolicy',
          tags: ['Policies'],
          parameters: [
            { name: 'id', in: 'path', required: true, description: 'Policy UUID', schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': {
              description: 'Policy with claims',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      policy: { $ref: '#/components/schemas/PolicySummary' },
                      claims: { type: 'array', items: { $ref: '#/components/schemas/PolicyClaim' } },
                    },
                  },
                },
              },
            },
            '404': { description: 'Policy not found' },
          },
        },
      },
      '/api/changes': {
        get: {
          summary: 'Recent policy changes',
          description: 'Returns recent policy version changes with structured diffs and summaries.',
          operationId: 'getChanges',
          tags: ['Changes'],
          parameters: [
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            '200': {
              description: 'Policy change list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      changes: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/PolicyChange' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/chat': {
        post: {
          summary: 'RAG chat (P1)',
          description: 'Ask natural language questions about drug coverage. Uses pgvector retrieval + Gemini streaming.',
          operationId: 'chat',
          tags: ['AI'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['messages'],
                  properties: {
                    messages: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          role: { type: 'string', enum: ['user', 'assistant'] },
                          content: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Streaming text response with citations' },
          },
        },
      },
      '/api/policies/upload': {
        post: {
          summary: 'Upload policy PDF (P1)',
          description: 'Upload a PDF for extraction. Runs pdf-parse → Gemini → RxNorm → Postgres.',
          operationId: 'uploadPolicy',
          tags: ['AI'],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file'],
                  properties: {
                    file: { type: 'string', format: 'binary', description: 'PDF file' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Upload result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      jobId: { type: 'string', format: 'uuid' },
                      policyId: { type: 'string', format: 'uuid' },
                      status: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { description: 'Invalid file or no plans exist' },
            '500': { description: 'Extraction failed' },
          },
        },
      },
    },
    components: {
      schemas: {
        CoverageComparison: {
          type: 'object',
          properties: {
            payerName: { type: 'string' },
            planName: { type: 'string' },
            lineOfBusiness: { type: 'string' },
            state: { type: 'string', nullable: true },
            productType: { type: 'string', nullable: true },
            coverageStatus: { type: 'string', enum: ['covered', 'not_covered', 'covered_with_criteria', 'experimental', 'not_addressed'] },
            priorAuth: { type: 'boolean' },
            extractedData: {
              type: 'object',
              description: 'Step therapy, quantity limits, clinical criteria, site of care',
              properties: {
                stepTherapy: { type: 'array', items: { type: 'object', properties: { stepNumber: { type: 'integer' }, drugOrClass: { type: 'string' }, minDuration: { type: 'string' } } } },
                quantityLimits: { type: 'object', properties: { quantity: { type: 'number' }, unit: { type: 'string' }, period: { type: 'string' } } },
                clinicalCriteria: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, description: { type: 'string' }, icdCodes: { type: 'array', items: { type: 'string' } } } } },
                siteOfCare: { type: 'string' },
              },
            },
            sourceExcerpt: { type: 'string', nullable: true },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            policyNumber: { type: 'string' },
            effectiveDate: { type: 'string', format: 'date' },
          },
        },
        PolicySummary: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            policyNumber: { type: 'string' },
            title: { type: 'string' },
            effectiveDate: { type: 'string', format: 'date' },
            version: { type: 'integer', nullable: true },
            status: { type: 'string' },
            planName: { type: 'string' },
            lineOfBusiness: { type: 'string' },
            payerName: { type: 'string' },
          },
        },
        PolicyClaim: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            policyId: { type: 'string', format: 'uuid' },
            drugBrandName: { type: 'string', nullable: true },
            drugGenericName: { type: 'string', nullable: true },
            rxcui: { type: 'string', nullable: true },
            jCode: { type: 'string', nullable: true },
            coverageStatus: { type: 'string' },
            priorAuthRequired: { type: 'boolean', nullable: true },
            extractedData: { type: 'object' },
            sourceExcerpt: { type: 'string', nullable: true },
            sourcePage: { type: 'integer', nullable: true },
            sourceSection: { type: 'string', nullable: true },
            confidence: { type: 'number', nullable: true },
          },
        },
        PolicyChange: {
          type: 'object',
          properties: {
            payerName: { type: 'string' },
            planName: { type: 'string' },
            policyTitle: { type: 'string' },
            policyNumber: { type: 'string' },
            versionNumber: { type: 'integer' },
            effectiveDate: { type: 'string', format: 'date' },
            changeSummary: { type: 'string', nullable: true },
            diffJson: {
              type: 'array',
              nullable: true,
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  old: { type: 'string', nullable: true },
                  new: { type: 'string', nullable: true },
                  significance: { type: 'string', enum: ['breaking', 'material', 'minor', 'cosmetic'] },
                },
              },
            },
          },
        },
      },
    },
  };

  return Response.json(spec);
}
