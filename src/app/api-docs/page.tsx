'use client';
/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/theme-provider';

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load Swagger UI CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
    link.id = 'swagger-css';
    document.head.appendChild(link);

    // Load Swagger UI JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
    script.id = 'swagger-js';
    script.onload = () => {
      if (containerRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SwaggerUIBundle = (window as any).SwaggerUIBundle;
        SwaggerUIBundle({
          url: '/api/openapi',
          dom_id: '#swagger-ui',
          deepLinking: true,
          layout: 'BaseLayout',
          defaultModelsExpandDepth: 2,
          tryItOutEnabled: true,
        });
        setLoaded(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      const css = document.getElementById('swagger-css');
      const js = document.getElementById('swagger-js');
      if (css) css.remove();
      if (js) js.remove();
    };
  }, []);

  const isDark = theme === 'dark';

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-[var(--font-montserrat)] dark:text-white">API Documentation</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Interactive REST API reference. All endpoints are available at <code className="text-xs bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">/api/v1</code>
        </p>
      </div>

      {!loaded && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-8">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#91BFEB] border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading API documentation...</p>
          </div>
        </div>
      )}

      <div className={`rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden ${loaded ? '' : 'hidden'}`}>
        <style>{`
          .swagger-ui { font-family: var(--font-inter), system-ui, sans-serif !important; }
          .swagger-ui .topbar { display: none !important; }
          .swagger-ui .info { margin: 20px 0 !important; }
          .swagger-ui .scheme-container { background: transparent !important; box-shadow: none !important; padding: 16px 20px !important; }
          .swagger-ui .opblock-tag { font-family: var(--font-montserrat), system-ui, sans-serif !important; }
          .swagger-ui .wrapper { padding: 0 20px !important; max-width: 100% !important; }
          .swagger-ui .info .title { font-family: var(--font-montserrat), system-ui, sans-serif !important; }

          ${isDark ? `
          /* Dark mode overrides for Swagger UI */
          .swagger-ui { background: #181A20 !important; color: #e2e8f0 !important; }
          .swagger-ui .info .title, .swagger-ui .info h1, .swagger-ui .info h2,
          .swagger-ui .info h3, .swagger-ui .info h4, .swagger-ui .info h5 { color: #fff !important; }
          .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info table td,
          .swagger-ui .info table th { color: #94a3b8 !important; }
          .swagger-ui .opblock-tag { color: #e2e8f0 !important; border-bottom-color: rgba(255,255,255,0.06) !important; }
          .swagger-ui .opblock-tag:hover { background: rgba(255,255,255,0.03) !important; }
          .swagger-ui .opblock { background: rgba(255,255,255,0.02) !important; border-color: rgba(255,255,255,0.06) !important; }
          .swagger-ui .opblock .opblock-summary { border-color: rgba(255,255,255,0.06) !important; }
          .swagger-ui .opblock .opblock-summary-description { color: #94a3b8 !important; }
          .swagger-ui .opblock .opblock-section-header { background: rgba(255,255,255,0.03) !important; }
          .swagger-ui .opblock .opblock-section-header h4 { color: #e2e8f0 !important; }
          .swagger-ui .opblock-body pre { background: #0F1117 !important; color: #91BFEB !important; }
          .swagger-ui .model-box { background: rgba(255,255,255,0.02) !important; }
          .swagger-ui .model { color: #e2e8f0 !important; }
          .swagger-ui .model-title { color: #e2e8f0 !important; }
          .swagger-ui table thead tr td, .swagger-ui table thead tr th { color: #94a3b8 !important; border-color: rgba(255,255,255,0.06) !important; }
          .swagger-ui table tbody tr td { color: #e2e8f0 !important; border-color: rgba(255,255,255,0.06) !important; }
          .swagger-ui .parameters-col_description input, .swagger-ui .parameters-col_description textarea,
          .swagger-ui .parameters-col_description select { background: #0F1117 !important; color: #e2e8f0 !important; border-color: rgba(255,255,255,0.1) !important; }
          .swagger-ui .scheme-container { border-color: rgba(255,255,255,0.06) !important; }
          .swagger-ui select { background: #0F1117 !important; color: #e2e8f0 !important; }
          .swagger-ui .btn { background: transparent !important; color: #91BFEB !important; border-color: #91BFEB !important; }
          .swagger-ui .btn.execute { background: #91BFEB !important; color: #15173F !important; }
          .swagger-ui .response-col_status { color: #e2e8f0 !important; }
          .swagger-ui .response-col_description { color: #94a3b8 !important; }
          .swagger-ui .responses-inner { background: transparent !important; }
          .swagger-ui .markdown p, .swagger-ui .markdown code { color: #94a3b8 !important; }
          .swagger-ui .prop-type { color: #91BFEB !important; }
          .swagger-ui .parameter__name { color: #e2e8f0 !important; }
          .swagger-ui .parameter__type { color: #91BFEB !important; }
          .swagger-ui input[type=text], .swagger-ui textarea { background: #0F1117 !important; color: #e2e8f0 !important; border-color: rgba(255,255,255,0.1) !important; }
          .swagger-ui .loading-container { background: #181A20 !important; }
          ` : `
          .swagger-ui { background: #fff !important; }
          `}
        `}</style>
        <div id="swagger-ui" ref={containerRef} className={isDark ? 'bg-[#181A20]' : 'bg-white'} />
      </div>
    </main>
  );
}
