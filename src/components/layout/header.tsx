export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground md:hidden">
          Anton <span className="text-primary">RX</span> Track
        </span>
      </div>
      <div className="flex items-center gap-3">
        {/* TODO: Quick search, theme toggle */}
      </div>
    </header>
  );
}
