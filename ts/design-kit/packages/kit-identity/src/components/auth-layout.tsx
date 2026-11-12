import type { ReactNode } from 'react'
import { Skeleton } from '@hollis-labs/design-components'

export interface AuthLayoutProps {
  readonly title: string
  readonly description?: ReactNode
  /** Branding slot (logo, tagline). Default is a single centred card with no hero. */
  readonly story?: ReactNode
  readonly children: ReactNode
}

/** Full-page frame for the screens that sit outside the app shell. */
export function AuthLayout({ title, description, story, children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-bg p-4 text-fg">
      <div className="flex w-full max-w-sm min-w-0 flex-col gap-4">
        {story ? <div className="flex flex-col items-center gap-2 text-center">{story}</div> : null}
        <section className="flex min-w-0 flex-col gap-4 rounded-panel border border-border bg-bg-elevated p-4">
          <header className="flex flex-col gap-1">
            <h1 className="text-control font-semibold text-fg">{title}</h1>
            {description ? <p className="text-caption text-fg-muted">{description}</p> : null}
          </header>
          {children}
        </section>
      </div>
    </main>
  )
}

/** Neutral page while the setup state resolves, so no form flashes. */
export function BootScreen({ story }: { readonly story?: ReactNode }) {
  return (
    <AuthLayout title="Loading…" story={story}>
      <div role="status" aria-busy="true" aria-label="Loading" className="flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </AuthLayout>
  )
}
