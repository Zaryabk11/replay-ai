/** Hairline rule with a centred word — the "or" between sign-in and demo. */
export function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-blue-grey">
      <span aria-hidden className="h-px flex-1 bg-line-300" />
      {children}
      <span aria-hidden className="h-px flex-1 bg-line-300" />
    </div>
  );
}
