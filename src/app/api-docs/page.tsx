'use client';

import { useEffect, useRef } from 'react';

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
    script.onload = () => {
      if (containerRef.current && (window as unknown as Record<string, unknown>).SwaggerUIBundle) {
        const SwaggerUIBundle = (window as unknown as Record<string, unknown>).SwaggerUIBundle as (config: Record<string, unknown>) => void;
        SwaggerUIBundle({
          url: '/api/openapi',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            (window as unknown as Record<string, { SwaggerUIStandalonePreset: unknown }>).SwaggerUIBundle?.presets?.apis,
          ].filter(Boolean),
          layout: 'BaseLayout',
          defaultModelsExpandDepth: 2,
          tryItOutEnabled: true,
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <style>{`
        .swagger-ui { font-family: var(--font-sans) !important; }
        .swagger-ui .topbar { display: none !important; }
        .swagger-ui .info { margin: 20px 0 !important; }
        .swagger-ui .scheme-container { background: transparent !important; box-shadow: none !important; }
        /* Dark mode overrides */
        .dark .swagger-ui { color: #e5e7eb; }
        .dark .swagger-ui .info .title { color: #f9fafb; }
        .dark .swagger-ui .info p, .dark .swagger-ui .info li { color: #d1d5db; }
        .dark .swagger-ui .opblock-tag { color: #f3f4f6; border-bottom-color: #374151; }
        .dark .swagger-ui .opblock { border-color: #374151; background: #1f2937; }
        .dark .swagger-ui .opblock .opblock-summary { border-color: #374151; }
        .dark .swagger-ui .opblock .opblock-summary-description { color: #9ca3af; }
        .dark .swagger-ui .opblock.opblock-get { background: rgba(59,130,246,0.08); border-color: #3b82f6; }
        .dark .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #3b82f6; }
        .dark .swagger-ui .opblock.opblock-post { background: rgba(34,197,94,0.08); border-color: #22c55e; }
        .dark .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #22c55e; }
        .dark .swagger-ui .opblock-body { background: #111827; }
        .dark .swagger-ui table thead tr td, .dark .swagger-ui table thead tr th { color: #d1d5db; border-color: #374151; }
        .dark .swagger-ui table tbody tr td { color: #e5e7eb; border-color: #374151; }
        .dark .swagger-ui .model-box, .dark .swagger-ui section.models { background: #1f2937; }
        .dark .swagger-ui .model { color: #e5e7eb; }
        .dark .swagger-ui .model-title { color: #f3f4f6; }
        .dark .swagger-ui .prop-type { color: #60a5fa; }
        .dark .swagger-ui .parameter__name { color: #f3f4f6; }
        .dark .swagger-ui .parameter__type { color: #60a5fa; }
        .dark .swagger-ui .response-col_status { color: #f3f4f6; }
        .dark .swagger-ui .response-col_description { color: #d1d5db; }
        .dark .swagger-ui .btn { color: #f3f4f6; border-color: #4b5563; }
        .dark .swagger-ui select { background: #1f2937; color: #f3f4f6; border-color: #4b5563; }
        .dark .swagger-ui input[type=text], .dark .swagger-ui textarea { background: #1f2937; color: #f3f4f6; border-color: #4b5563; }
        .dark .swagger-ui .highlight-code { background: #111827 !important; }
        .dark .swagger-ui .microlight { background: #111827 !important; color: #e5e7eb !important; }
        .dark .swagger-ui section.models .model-container { background: #111827; }
        .dark .swagger-ui section.models h4 { color: #f3f4f6; border-color: #374151; }
      `}</style>
      <div id="swagger-ui" ref={containerRef} />
    </div>
  );
}
