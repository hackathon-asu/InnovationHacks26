import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="rounded-2xl border border-[#e8e8e4] bg-white max-w-md w-full p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Page not found</h2>
        <p className="text-sm text-[#8b8b8b]">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl border border-[#e8e8e4] px-4 py-2 text-sm font-medium text-[#6b6b6b] hover:bg-[#f4f4f0] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
