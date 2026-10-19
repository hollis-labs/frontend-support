import { createContext, useContext } from 'react'

export type DashboardTypographyProfile = 'scalable' | 'compact'
export const DashboardTypographyContext = createContext<DashboardTypographyProfile>('compact')

/** Spread onto portal content: React context crosses portals; CSS does not. */
export function useDashboardTypography() {
  return { 'data-dashboard-typography': useContext(DashboardTypographyContext) }
}
