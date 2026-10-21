/**
 * A section heading set *inside* a hairline rule rather than above it.
 *
 * Straight off the reference, where every divider carries its label inline
 * (docs/DESIGN.md § Chrome). It is a heading first — the panels are documents and a
 * screen reader walks them by heading — and the rule is decoration drawn beside it,
 * which is why the line is the `aria-hidden` half and not the other way round.
 */
export function SectionRule({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 id={id} className="u-label shrink-0 text-dim">
        {children}
      </h2>
      <span aria-hidden="true" className="h-px flex-1 bg-dim/30" />
    </div>
  )
}
