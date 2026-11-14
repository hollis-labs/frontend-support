import type { ReactNode } from 'react'
import { AuthLayout } from './auth-layout'

export interface SetupOfflineScreenProps {
  readonly story?: ReactNode
  /** The app's command name; shown as `<app> identity setup --username NAME` (the CLI requires `--username`). Defaults to the literal `<app>`. */
  readonly appName?: string
}

/** The server creates the owner on the host, not over HTTP. Information only: no form and nothing to retry from here. */
export function SetupOfflineScreen({ story, appName = '<app>' }: SetupOfflineScreenProps) {
  return (
    <AuthLayout title="No owner yet" story={story}
      description="This app has no owner yet. The owner is created on the host, not from this page.">
      <p className="text-control text-fg-secondary">
        On the host, run <code className="rounded-control bg-surface px-1 font-mono [overflow-wrap:anywhere]">{appName} identity setup --username NAME</code>, then reload this page.
      </p>
    </AuthLayout>
  )
}
