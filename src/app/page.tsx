const swatches = [
  { name: "bg-0", className: "bg-bg-0" },
  { name: "bg-1", className: "bg-bg-1" },
  { name: "bg-2", className: "bg-bg-2" },
  { name: "bg-4", className: "bg-bg-4" },
  { name: "lime", className: "bg-lime" },
  { name: "pink", className: "bg-pink" },
  { name: "blue", className: "bg-blue" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-360 flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center sm:px-6">
      <span className="rounded-full border border-border-3 bg-bg-3 px-3 py-1 text-xs font-medium text-text-2">
        Step 0 · scaffold
      </span>

      <h1 className="font-display text-display-sm uppercase sm:text-display">
        Type a prompt.
        <br />
        <span className="text-lime">Get a real image.</span>
      </h1>

      <p className="max-w-md text-base text-text-2">
        Placeholder page. If the headline above is narrow and heavy, Barlow
        Condensed loaded. If it looks wide, it fell back to Arial.
      </p>

      <p className="flex gap-4 text-sm text-text-1">
        <span className="font-normal">Inter 400</span>
        <span className="font-medium">Inter 500</span>
        <span className="font-semibold">Inter 600</span>
        <span className="font-semibold tabular-nums text-lime">0123456789</span>
      </p>

      <ul className="flex flex-wrap justify-center gap-2" aria-label="Color tokens">
        {swatches.map((s) => (
          <li key={s.name} className="flex flex-col items-center gap-1">
            <span className={`size-10 rounded-md border border-border-3 ${s.className}`} />
            <span className="text-xs text-text-3">{s.name}</span>
          </li>
        ))}
      </ul>

      <div className="rounded-xl bg-lime px-6 py-3 text-base font-semibold text-lime-ink inset-shadow-lip">
        Generate <span className="opacity-50 line-through">3</span>{" "}
        <span className="font-bold">2</span>
      </div>
    </main>
  );
}
