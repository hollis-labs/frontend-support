import { CASES } from '../fixtures/cases'

/**
 * `?case=<card>:<state>` renders one fixture alone, which is what the Playwright
 * matrix drives. With no parameter it renders every fixture grouped by card, which is
 * what a person reads. `?mode=dark` selects the dark token set.
 */
export function Gallery({ caseId }: { caseId: string | null }) {
  if (caseId) {
    const found = CASES.find((c) => c.id === caseId)
    return (
      <main className="min-h-screen min-w-0 bg-bg p-4 text-fg" data-case={caseId}>
        {found ? found.element : <p>No such case: {caseId}</p>}
      </main>
    )
  }
  const cards = [...new Set(CASES.map((c) => c.card))]
  return (
    <main className="min-h-screen min-w-0 bg-bg p-4 text-fg">
      {cards.map((card) => (
        <section key={card} className="mb-8">
          <h2 className="mb-2 font-mono text-label uppercase text-fg-muted">{card}</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {CASES.filter((c) => c.card === card).map((c) => (
              <div key={c.id} className="min-w-0">
                <p className="mb-1 font-mono text-caption text-fg-faint">{c.state}</p>
                {c.element}
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
