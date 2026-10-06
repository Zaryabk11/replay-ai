const swatches = [
  { name: "deep-teal", className: "bg-deep-teal", hex: "#2F5D62" },
  { name: "harbor-blue", className: "bg-harbor-blue", hex: "#6C8CA0" },
  { name: "ink", className: "bg-ink", hex: "#1E2527" },
  { name: "slate", className: "bg-slate", hex: "#5A676A" },
  { name: "blue-grey", className: "bg-blue-grey", hex: "#AAB8C1" },
  { name: "mist-paper", className: "bg-mist-paper border", hex: "#F3F6F5" },
];

export default function DesignPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-8">
      <h1 className="font-serif text-4xl text-ink">Design</h1>
      <p className="mt-2 text-slate">Tokens, type and primitives.</p>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-slate">Colour</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {swatches.map((s) => (
            <li key={s.name}>
              <div className={`h-16 rounded ${s.className}`} />
              <p className="mt-1 text-sm text-ink">{s.name}</p>
              <p className="font-mono text-xs text-slate">{s.hex}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-slate">Type</h2>
        <p className="mt-3 font-serif text-2xl text-ink">Newsreader — serif display</p>
        <p className="mt-1 text-ink">Geist — sans body text</p>
        <p className="mt-1 font-mono text-sm text-ink">Geist Mono — 00:12:41</p>
      </section>
    </main>
  );
}
