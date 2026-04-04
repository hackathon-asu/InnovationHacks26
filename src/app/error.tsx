'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="rounded-2xl border border-[#e8e8e4] bg-white max-w-md w-full p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Something went wrong</h2>
        <p className="text-sm text-[#8b8b8b]">
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest && (
          <p className="text-xs text-[#b0b0ac] font-mono">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="rounded-xl border border-[#e8e8e4] px-4 py-2 text-sm font-medium text-[#6b6b6b] hover:bg-[#f4f4f0] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
