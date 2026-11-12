import type { ReactNode } from 'react'
import type { SettingsGroup, SettingsProvenanceRendererProps, SettingsProvenanceState, SettingsWizardProps } from '@hollis-labs/kit-settings'
import type { HealthSummaryProps, StatObservation, DiagnosticPanelProps, ObservationUnit, ObservationKind } from '@hollis-labs/kit-observe'
import type { SampleSeriesViewProps } from '@hollis-labs/kit-observe/charts'

/** View projections only. The host validates wire schemas, endpoints, auth and bounds. */
export interface AdminDeclaration { readonly id: string; readonly label: string; readonly section: string }
export interface AdminObservationDeclaration extends AdminDeclaration { readonly stale_after_ms: number }
export interface AdminSettingsDeclaration extends SettingsGroup {
  readonly section: string
  readonly scope?: { readonly kind: string; readonly id?: string }
}
export interface AdminStatDeclaration extends AdminObservationDeclaration { readonly unit: ObservationUnit; readonly kind: ObservationKind }
export interface AdminSeriesDeclaration extends AdminStatDeclaration { readonly max_points: number; readonly max_window_seconds: number }
export interface AdminDiagnosticDeclaration extends AdminObservationDeclaration { readonly schema: DiagnosticPanelProps['schema'] }
export interface AdminManifest {
  readonly contract_version: number
  readonly app: { readonly id: string; readonly label: string }
  readonly revision: string
  readonly settings: readonly AdminSettingsDeclaration[]
  readonly health: readonly AdminObservationDeclaration[]
  readonly stats: readonly AdminStatDeclaration[]
  readonly series: readonly AdminSeriesDeclaration[]
  readonly diagnostics: readonly AdminDiagnosticDeclaration[]
}
export type AdminPage = 'dashboard' | 'settings' | 'status' | 'diagnostics'
export interface AdminTarget { readonly page: AdminPage; readonly groupId?: string }
export type AdminDestination = { readonly href: string; readonly onSelect?: never } | { readonly onSelect: () => void; readonly href?: never }
export interface AdminSelection extends AdminTarget { readonly mode?: 'edit' | 'setup' }
export interface AdminDiscovery {
  readonly phase: 'loading' | 'ready' | 'error'
  /** Must match the active authorized host context; never retain a prior principal. */
  readonly contextKey: string
  readonly manifest?: AdminManifest
  readonly error?: string
}
export interface AdminSettingsRead {
  readonly phase: 'loading' | 'ready' | 'error'
  readonly state?: SettingsProvenanceState
  readonly error?: string
}
export interface AdminObservations {
  readonly health?: Readonly<Record<string, Omit<HealthSummaryProps, 'label'> | undefined>>
  readonly stats?: Readonly<Record<string, Pick<StatObservation, 'value' | 'observation'> | undefined>>
  readonly series?: Readonly<Record<string, Omit<SampleSeriesViewProps, 'label' | 'unit' | 'kind' | 'bounds'> | undefined>>
  readonly diagnostics?: Readonly<Record<string, Omit<DiagnosticPanelProps, 'label' | 'schema'> | undefined>>
}
export interface AdminContentProps {
  readonly contextKey: string
  readonly discovery: AdminDiscovery
  readonly selection: AdminSelection
  /** Host maps canonical targets to its routes or controlled navigation callbacks. */
  readonly destination: (target: AdminTarget) => AdminDestination
  readonly settings?: Readonly<Record<string, AdminSettingsRead | undefined>>
  readonly settingsActions?: Pick<SettingsProvenanceRendererProps, 'onDraftChange' | 'onSave' | 'onReset' | 'onValidate' | 'onApply'>
  readonly setup?: Omit<SettingsWizardProps, 'contractVersion' | 'groups' | 'states' | 'onDraftChange'>
  /** Context/metadata beside the Wizard; never a second editable form. */
  readonly setupContext?: ReactNode
  readonly observations?: AdminObservations
  readonly nowMs: number
  /** Explicit opt-in: root imports no chart implementation. See /charts. */
  readonly renderSeries?: (props: SampleSeriesViewProps) => ReactNode
}
