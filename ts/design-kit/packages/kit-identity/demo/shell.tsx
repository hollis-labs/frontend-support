import { useEffect, useState } from 'react'
import { IDENTITY_PAGES, IDENTITY_ROUTES, SignOutButton } from '../src'
import type { IdentityRouteId } from '../src'

const IDS: readonly IdentityRouteId[] = ['account', 'keys', 'pairing', 'sessions', 'signOut']

export function Shell() {
  const fromHash = location.hash.slice(1) as IdentityRouteId
  const [page, setPage] = useState<IdentityRouteId>(IDS.includes(fromHash) ? fromHash : 'keys')
  useEffect(() => { location.hash = page }, [page])
  const Page = IDENTITY_PAGES[page]
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 bg-bg p-4 text-fg">
      <nav aria-label="Pages" className="flex flex-wrap items-center gap-2">
        {IDS.filter((id) => id !== 'signOut').map((id) => (
          <button key={id} type="button" aria-current={id === page ? 'page' : undefined} onClick={() => setPage(id)}
            className={`rounded-control border border-border px-2 py-1 text-control ${id === page ? 'bg-bg-elevated text-fg' : 'text-fg-muted'}`}>{IDENTITY_ROUTES[id].label}</button>
        ))}
        <span className="ml-auto"><SignOutButton variant="ghost" /></span>
      </nav>
      <Page key={page} />
    </div>
  )
}
