import Link from 'next/link';

interface PolicyCardProps {
  id: string;
  policyNumber: string;
  title: string;
  effectiveDate: string;
  version: number | null;
  status: string;
  planName: string;
  lineOfBusiness: string;
  payerName: string;
}

export function PolicyCard(props: PolicyCardProps) {
  return (
    <Link href={`/policies/${props.id}`}>
      <div className="rounded-2xl border border-[#e8e8e4] bg-white p-5 hover:border-emerald-300 hover:shadow-sm transition-all space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#1a1a1a]">
            {props.payerName}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            props.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#f0f0ec] text-[#8b8b8b]'
          }`}>
            {props.status}
          </span>
        </div>
        <p className="font-medium text-[#1a1a1a] leading-tight">{props.title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#f0f0ec] px-2 py-0.5 text-xs text-[#6b6b6b]">
            {props.planName}
          </span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
            {props.lineOfBusiness}
          </span>
          <span className="text-xs text-[#8b8b8b] font-mono">
            #{props.policyNumber}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#8b8b8b]">
          <span>Effective: {props.effectiveDate}</span>
          {props.version && <span className="font-mono">v{props.version}</span>}
        </div>
      </div>
    </Link>
  );
}
