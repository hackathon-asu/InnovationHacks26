'use client';
/* --------0x0x0x0x0x0-----------
 * AntonRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

import { useEffect, useRef } from 'react';

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Force light mode for this page
    document.documentElement.classList.remove('dark');

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
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
      }
    };
    document.body.appendChild(script);

    return () => {
      document.documentElement.classList.add('dark');
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        .swagger-ui { font-family: var(--font-sans) !important; }
        .swagger-ui .topbar { display: none !important; }
        .swagger-ui .info { margin: 20px 0 !important; }
        .swagger-ui .scheme-container { background: transparent !important; box-shadow: none !important; }
      `}</style>
      <div id="swagger-ui" ref={containerRef} />
    </div>
  );
}
