'use client';
/* --------0x0x0x0x0x0-----------
 * InsightRX - AI Policy Tracker
 * Written by Abhinav & Neeharika
 * CC BY-NC-SA 4.0
 * Commercial use: chatgpt@asu.edu
 * -------------------------------- */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MessageBubble } from './message-bubble';
import { Toast, useToast } from '@/components/ui/toast';

type Message = { id: string; role: 'user' | 'assistant'; content: string };
type Provider = 'gemini' | 'ollama';

const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Gemini 2.5',
  ollama: 'Ollama Local',
};

const SUGGESTIONS = [
  {
    icon: '💊',
    title: 'Drug Coverage',
    desc: 'Which plans cover bevacizumab?',
    query: 'Which plans cover bevacizumab?',
    hardcodedAnswer: `Based on the InsightRX policy database, here is coverage for bevacizumab (Avastin) across payers:

UnitedHealthcare — Covered with criteria (Policy 2026D0017). Prior authorization required. Covered for colorectal cancer, NSCLC, glioblastoma, cervical cancer, and ovarian cancer. J-code: J9035. Step therapy: biosimilars (Mvasi, Zirabev) preferred over Avastin.

Cigna — Covered with criteria (Policy 1403). PA required. Oncology indications per NCCN guidelines. Biosimilar-first step therapy applies.

Aetna — Covered with criteria. PA required for all indications. Site-of-care restrictions apply — infusion center or hospital outpatient preferred.

Florida Blue — Covered with criteria (Bevacizumab policy). PA required. Covers NCCN-compendium listed oncology indications. J-code: J9035.

Key takeaway: All payers cover bevacizumab but require prior authorization. Biosimilar products (Mvasi, Zirabev, Vegzelma) are preferred over branded Avastin at UHC and Cigna, requiring documented biosimilar trial or contraindication for Avastin approval.

Sources: UHC 2026D0017, Cigna Policy 1403, Florida Blue Bevacizumab Policy, Aetna 2026 Drug Guide.`,
  },
  {
    icon: '🔄',
    title: 'Step Therapy',
    desc: 'Compare Rituxan step therapy',
    query: 'Compare step therapy requirements for Rituxan across payers',
    hardcodedAnswer: `Step therapy requirements for Rituximab (Rituxan) across payers:

UnitedHealthcare (Policy 2026D0003AO):
• Step 1 (Preferred): Riabni (Q5123), Ruxience (Q5119), or Truxima (Q5115) — biosimilars required first
• Step 2 (Non-preferred): Rituxan (J9312) — requires documented failure, intolerance, or contraindication to ALL preferred biosimilars
• Authorization: 6-month cycles for RA; 12-month for oncology indications

Cigna (Policy IP0319):
• Biosimilar preferred products required before branded Rituxan
• RA indication: requires prior failure of ≥1 TNF inhibitor (e.g., adalimumab, etanercept)
• ANCA vasculitis: biosimilar preferred, used in combination with glucocorticoids
• Specialist prescriber (rheumatologist, nephrologist, or neurologist) required

Key differences:
— UHC explicitly names 3 preferred biosimilars and requires trial of all before approving Rituxan
— Cigna requires TNF inhibitor failure for RA but allows direct biosimilar rituximab access for vasculitis
— Both require specialist prescriber documentation

Sources: UHC Policy 2026D0003AO, Cigna Policy IP0319 (Rituximab IV Non-Oncology).`,
  },
  {
    icon: '📋',
    title: 'Prior Auth',
    desc: 'Cigna biologics prior auth?',
    query: 'What prior authorization does Cigna require for biologics?',
    hardcodedAnswer: `Cigna Prior Authorization Requirements for Biologics:

TNF Inhibitors (Humira/adalimumab, Enbrel/etanercept, Remicade/infliximab):
• Diagnosis confirmation from a specialist (rheumatologist, dermatologist, or gastroenterologist)
• Inadequate response to conventional therapies (e.g., MTX for RA, 5-ASA for IBD)
• Biosimilar-first: preferred adalimumab biosimilars (Cyltezo, Simlandi) required before Humira
• Step therapy: all preferred biosimilars must be tried before non-preferred agents
• Renewal: documentation of clinical response required at each authorization period

IL-17/IL-23 Inhibitors (Cosentyx, Skyrizi, Tremfya, Stelara):
• Moderate-to-severe disease severity (PASI ≥12 for psoriasis, or inadequate DMARD response for PsA)
• Prior failure of ≥1 conventional therapy
• Specialist prescriber required

JAK Inhibitors (Rinvoq, Xeljanz):
• Require prior failure of ≥1 TNF inhibitor for RA and PsA (FDA/Cigna black box requirements)
• Cardiovascular risk assessment documentation
• Age ≥18 for most indications

GLP-1 Agonists (Wegovy, Zepbound):
• BMI ≥30, or BMI ≥27 with ≥1 weight-related comorbidity
• Enrollment in behavioral modification program required
• 3-month response assessment for renewal

Sources: Cigna IP0660, IP0319, IP0687, IP0670, IP0692, GLP-1 PA policy.`,
  },
  {
    icon: '📊',
    title: 'Policy Changes',
    desc: 'What changed recently?',
    query: 'What changed in recent policy updates?',
    hardcodedAnswer: `Recent Policy Changes (2025–2026) from InsightRX database:

Cigna 2025 Formulary Changes:
• Mounjaro (tirzepatide) and Ozempic (semaglutide) moved to covered tiers with new PA requirements (BMI + comorbidity criteria)
• Eliquis and Xarelto: PA requirements removed — now covered without prior authorization
• Descovy (emtricitabine/tenofovir): PA removed for PrEP indication
• Hyrimoz (adalimumab-adaz) specific NDCs removed from formulary — transition to Cyltezo or Simlandi required
• Humatrope and Norditropin: removed from formulary — transition to Skytrofa or generic somatropin

UHC 2026 Updates:
• Leqembi (lecanemab) added: new PA policy effective 2026-04-01 for early Alzheimer's — requires MRI, cognitive scores (MMSE 20–30), amyloid confirmation, and neurologist prescriber
• Denosumab policy updated: Stoboclo added as preferred biosimilar alongside Prolia; Jubbonti/Wyost are non-preferred requiring step through preferred products
• Botulinum toxins: Daxxify (daxibotulinumtoxinA) now explicitly excluded/not covered

Aetna 2026 Exclusions:
• HUMIRA, CIMZIA, ACTEMRA, INFLECTRA: excluded — members must transition to preferred biosimilars
• GLEEVEC, IMBRUVICA, COPIKTRA: excluded — generic/preferred alternatives required
• AUBAGIO, GILENYA, COPAXONE: excluded MS therapies — transition to preferred DMTs

Sources: Cigna Rx Changes 2025, UHC 2026D0125E, UHC 2026D0068S, Aetna 2026 Exclusion Drug List.`,
  },
];

export function ChatInterface() {
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<Provider>('gemini');
  const { toast, showToast } = useToast();

  useEffect(() => { setMounted(true); }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  async function typeAnswer(answerId: string, fullText: string) {
    const charsPerTick = 2;
    const delay = 28;
    // Simulate initial "thinking" pause
    await new Promise((r) => setTimeout(r, 2000));
    let i = 0;
    setStreamingId(answerId);
    while (i < fullText.length) {
      const chunk = fullText.slice(0, i + charsPerTick);
      setMessages((prev) =>
        prev.map((m) => (m.id === answerId ? { ...m, content: chunk } : m))
      );
      i += charsPerTick;
      // Slightly randomize delay for natural feel
      const jitter = Math.random() * 20;
      await new Promise((r) => setTimeout(r, delay + jitter));
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === answerId ? { ...m, content: fullText } : m))
    );
    setStreamingId(null);
  }

  async function handleSend(text?: string, hardcodedAnswer?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    setInput('');

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: msg };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    if (hardcodedAnswer) {
      // Show thinking spinner for ~2s then start typing
      await new Promise((r) => setTimeout(r, 2000));
      setIsLoading(false);
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);
      await typeAnswer(assistantId, hardcodedAnswer);
      return;
    }

    // Live API disabled — hackathon demo period has ended
    setIsLoading(false);
    setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    showToast('Live AI chat is disabled — API costs have been cut since the hackathon ended (effective April 7, 2026). Try the demo questions above!');
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-[#FAFBFD] dark:bg-[#0F1117]">
        <Toast {...toast} />
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-[#15173F] dark:bg-[#91BFEB] flex items-center justify-center">
              <span className="text-[10px] font-bold text-white dark:text-[#15173F]">Rx</span>
            </div>
            <span className="text-sm font-semibold text-slate-800 dark:text-white">InsightRX Policy AI</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMessages([]); setInput(''); }}
              className="rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              New Chat
            </button>
          </div>
        </header>

        {/* Messages / Welcome area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center px-6 py-20">
              {/* Greeting */}
              <div className="mb-2 h-14 w-14 rounded-2xl bg-[#15173F] dark:bg-[#91BFEB] flex items-center justify-center">
                <span className="text-lg font-bold text-white dark:text-[#15173F]">Rx</span>
              </div>
              <h1 className="mt-4 text-2xl font-bold text-[#15173F] dark:text-white font-[var(--font-montserrat)]">
                How can I help you today?
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md text-center">
                Ask questions about drug coverage, prior authorization, step therapy, and policy differences across payers.
              </p>

              {/* Suggestion cards */}
              <div className="mt-8 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => handleSend(s.query, s.hardcodedAnswer)}
                    className="group flex flex-col items-start rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] p-4 text-left transition-all hover:border-[#91BFEB] hover:shadow-md dark:hover:border-[#91BFEB]/60"
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span className="mt-2 text-sm font-semibold text-slate-800 dark:text-white group-hover:text-[#15173F] dark:group-hover:text-[#91BFEB]">{s.title}</span>
                    <span className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-snug">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
              {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="shrink-0 h-8 w-8 rounded-lg bg-[#15173F] dark:bg-[#91BFEB] flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white dark:text-[#15173F]">Rx</span>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-[#181A20] border border-slate-200 dark:border-white/10 p-3 text-sm text-slate-500 dark:text-slate-400 animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-[#91BFEB] animate-bounce" />
                      <div className="h-2 w-2 rounded-full bg-[#91BFEB] animate-bounce [animation-delay:0.15s]" />
                      <div className="h-2 w-2 rounded-full bg-[#91BFEB] animate-bounce [animation-delay:0.3s]" />
                      <span className="ml-2 text-xs">Analyzing policies...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#181A20] px-6 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-[#F0EDE8] dark:bg-[#0F1117] focus-within:border-[#91BFEB] focus-within:ring-2 focus-within:ring-[#91BFEB]/20 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about drug coverage policies..."
                rows={1}
                className="w-full resize-none bg-transparent px-4 pt-3 pb-12 text-sm text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
              {/* Bottom toolbar inside textarea */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                {/* Model selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowProviderMenu(!showProviderMenu)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {mounted ? PROVIDER_LABELS[provider] : 'Gemini 2.5'}
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {showProviderMenu && (
                    <div className="absolute bottom-full left-0 mb-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2028] py-1 shadow-lg min-w-[160px] z-10">
                      {(Object.entries(PROVIDER_LABELS) as [Provider, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => { setProvider(key); setShowProviderMenu(false); }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors ${
                            provider === key
                              ? 'bg-[#F0EDE8] dark:bg-white/5 text-[#15173F] dark:text-white font-semibold'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                          }`}
                        >
                          {provider === key && <svg className="h-3 w-3 text-[#91BFEB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          {provider !== key && <span className="w-3" />}
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Send button */}
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#15173F] dark:bg-[#91BFEB] text-white dark:text-[#15173F] hover:opacity-90 disabled:opacity-30 transition-opacity"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
              InsightRX AI can make mistakes. Verify drug coverage details with official payer documentation.
            </p>
          </div>
        </div>
      </div>
  );
}
