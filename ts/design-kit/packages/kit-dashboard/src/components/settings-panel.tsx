import type { ReactNode } from 'react'
import { cn } from '@hollis-labs/design-components'

export interface SettingsPanelProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export interface SettingsGridProps {
  children: ReactNode
  className?: string
}

export interface SettingsFieldProps {
  label: string
  children: ReactNode
  className?: string
  labelClassName?: string
  valueClassName?: string
}

export interface SettingsNoticeProps {
  title: string
  description: string
  tone?: 'warning' | 'danger' | 'info'
  className?: string
}

export interface SettingsStatusPillProps {
  pending: boolean
  pendingLabel?: string
  currentLabel?: string
}

/**
 * Compact settings section used inside operations/settings pages. It matches
 * the Sysop page vocabulary: full-width bands, tight section headers, and
 * dense value rows instead of nested cards.
 */
export function SettingsPanel({ title, icon, children, className }: SettingsPanelProps) {
  return (
    <section
      className={cn('min-w-0 border-b border-border bg-panel last:border-b-0', className)}
    >
      <div className="flex h-9 items-center gap-2 border-b border-border-subtle px-4 text-text-subtle">
        {icon ? <span className="shrink-0 text-text-subtle">{icon}</span> : null}
        <h2 className="truncate text-label font-semibold uppercase tracking-label text-text-muted">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

export function SettingsGrid({ children, className }: SettingsGridProps) {
  return (
    <dl
      className={cn(
        'grid grid-cols-[10rem_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-3 text-xs',
        className,
      )}
    >
      {children}
    </dl>
  )
}

export function SettingsField({
  label,
  children,
  className,
  labelClassName,
  valueClassName,
}: SettingsFieldProps) {
  return (
    <div className={cn('contents', className)}>
      <dt className={cn('truncate text-text-subtle', labelClassName)}>{label}</dt>
      <dd className={cn('min-w-0 break-words text-text-soft', valueClassName)}>{children}</dd>
    </div>
  )
}

export function SettingsNotice({
  title,
  description,
  tone = 'warning',
  className,
}: SettingsNoticeProps) {
  const toneClassName =
    tone === 'danger'
      ? 'border-danger/30 bg-danger/10 text-danger'
      : tone === 'info'
        ? 'border-info/30 bg-info/10 text-info'
        : 'border-warning/30 bg-warning/10 text-warning'

  return (
    <div className={cn('rounded border px-3 py-2', toneClassName, className)}>
      <div className="text-label font-semibold uppercase tracking-label">{title}</div>
      <div className="mt-1 text-xs text-text-soft">{description}</div>
    </div>
  )
}

export function SettingsStatusPill({
  pending,
  pendingLabel = 'reload required',
  currentLabel = 'current',
}: SettingsStatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-label font-medium',
        pending
          ? 'border-dash-status-doing/30 bg-dash-status-doing/10 text-dash-status-doing'
          : 'border-dash-status-done/30 bg-dash-status-done/10 text-dash-status-done',
      )}
    >
      {pending ? pendingLabel : currentLabel}
    </span>
  )
}
