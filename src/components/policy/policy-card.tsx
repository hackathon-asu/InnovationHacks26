import Link from 'next/link';

interface PolicyCardProps {
  id: string; policyNumber: string; title: string; effectiveDate: string;
  version: number | null; status: string; planName: string; lineOfBusiness: string; payerName: string;
}

export function PolicyCard(props: PolicyCardProps) {
  return (
    <Link href={`/policies/${props.id}`}>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800">{props.payerName}</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            props.status === 'active' ? 'border-[#91BFEB] bg-[#dceeff] text-[#15173F]' : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}>{props.status}</span>
        </div>
        <p className="font-medium text-slate-800 leading-tight">{props.title}</p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-[#F6F8FB] px-2 py-0.5 text-xs text-slate-600">{props.planName}</span>
          <span className="rounded-full border border-[#91BFEB] bg-[#dceeff] px-2 py-0.5 text-xs text-[#15173F]">{props.lineOfBusiness}</span>
          <span className="text-xs text-slate-400 font-mono">#{props.policyNumber}</span>
        </div>
        <div className="text-xs text-slate-400">Effective: {props.effectiveDate} {props.version && `• v${props.version}`}</div>
      </div>
    </Link>
  );
}
