/** Shared page frame: serif title, slate description, optional action. */
export function PageHeader({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-7.5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-medium text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
