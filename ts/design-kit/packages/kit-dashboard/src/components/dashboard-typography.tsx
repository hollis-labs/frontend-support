import type { ReactNode } from 'react'
import { DashboardTypographyContext, type DashboardTypographyProfile } from '../lib/dashboard-typography'

/** Scope record typography without changing the document root or layout density. */
export function DashboardTypographyProvider({ profile = 'compact', children }: {
  profile?: DashboardTypographyProfile
  children: ReactNode
}) {
  return <DashboardTypographyContext.Provider value={profile}>
    <div className="contents" data-dashboard-typography={profile}>{children}</div>
  </DashboardTypographyContext.Provider>
}
