/**
 * Settings, secret and mobile-nav parts (SF-6 gaps 6-8): settings field row and group card, the one-time secret reveal,
 * and the narrow-width tab bar with its More sheet. Controlled and presentational.
 */
import { useState, type ReactNode } from 'react'
import { Button, Card, CopyButton, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Sheet, SheetContent, SheetHeader, SheetTitle, cn } from '@hollis-labs/design-components'

/* ---- 6. settings field row and group card ---- */

export interface SettingsFieldRowProps {
  /** Id of the control, so the label names it. */
  controlId: string
  label: string
  hint?: string
  /** Edited and not yet saved. */
  dirty?: boolean
  error?: string
  children: ReactNode
}

/** Label and hint on the left, the control on the right. */
export function SettingsFieldRow({ controlId, label, hint, dirty = false, error, children }: SettingsFieldRowProps) {
  return (
    <div data-field={controlId} data-dirty={dirty ? '' : undefined} className="flex items-start justify-between gap-6 border-t border-border-subtle px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 flex-col">
        <label htmlFor={controlId} className="text-control text-fg">{label}</label>
        {hint ? <span id={`${controlId}-hint`} className="text-caption text-fg-muted">{hint}</span> : null}
      </div>
      <div className={cn('flex flex-col items-end gap-1 rounded-md', dirty && 'ring-1 ring-border')}>
        {children}
        {error ? <span id={`${controlId}-error`} role="alert" className="text-caption text-danger">{error}</span> : null}
      </div>
    </div>
  )
}

export interface SettingsGroupCardProps {
  /** Element id of the card, the target of an outline anchor. */
  id?: string
  title: string
  description?: string
  /** The danger zone is its own group at the end. */
  danger?: boolean
  children: ReactNode
}

export function SettingsGroupCard({ id, title, description, danger = false, children }: SettingsGroupCardProps) {
  return (
    <Card id={id} role="group" aria-label={title} data-danger={danger ? '' : undefined} className={cn('gap-0 py-0', danger && 'border-danger/40')}>
      <header className="flex flex-col px-4 py-3">
        <h3 className={cn('text-control font-semibold', danger ? 'text-danger' : 'text-fg')}>{title}</h3>
        {description ? <p className="text-caption text-fg-muted">{description}</p> : null}
      </header>
      {children}
    </Card>
  )
}

/* ---- 7. one-time secret reveal ---- */

export interface SecretRevealDialogProps {
  /** Present while the secret is to be shown. The dialog holds it only in props; clearing it removes it from the page. */
  secret: string | null
  title?: string
  description?: string
  onDone: () => void
}

/**
 * Shows a secret once, with Copy and Done. It cannot be dismissed any other way, and it keeps no copy:
 * the host drops `secret` on Done. The value never goes to a log, the audit sink or the list.
 */
export function SecretRevealDialog({ secret, title = 'Copy your key now', description = 'This is the only time it is shown. Store it somewhere safe.', onDone }: SecretRevealDialogProps) {
  return (
    <Dialog open={secret !== null} onOpenChange={(_open, details) => { details.cancel() }}>
      <DialogContent showCloseButton={false} data-secret-reveal="">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border border-border bg-bg p-2">
          <code aria-label="Secret" className="min-w-0 flex-1 break-all font-mono text-control text-fg">{secret}</code>
          <CopyButton text={secret ?? ''} />
        </div>
        <div className="flex justify-end"><Button type="button" onClick={onDone}>Done</Button></div>
      </DialogContent>
    </Dialog>
  )
}

/* ---- 8. mobile tab bar and More sheet ---- */

export interface TabBarItem { id: string; label: string; icon?: ReactNode }
export interface MoreGroup { label: string; items: readonly TabBarItem[] }

export interface MobileTabBarProps {
  tabs: readonly TabBarItem[]
  /** Id of the current tab or of an item inside More. */
  currentId?: string
  /** What the More sheet lists, grouped. More is always the last tab. */
  more: readonly MoreGroup[]
  onSelect: (id: string) => void
  moreLabel?: string
}

/** Narrow-width nav: a tab bar whose last tab opens a bottom sheet listing the rest. */
export function MobileTabBar({ tabs, currentId, more, onSelect, moreLabel = 'More' }: MobileTabBarProps) {
  const [open, setOpen] = useState(false)
  const inMore = currentId !== undefined && more.some(g => g.items.some(i => i.id === currentId))
  const tab = (active: boolean) => cn('flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-caption', active ? 'text-fg' : 'text-fg-muted')
  return (
    <>
      <nav aria-label="Primary" className="flex border-t border-border-subtle bg-bg-elevated">
        {tabs.map(t => (
          <button key={t.id} type="button" aria-current={t.id === currentId ? 'page' : undefined} onClick={() => onSelect(t.id)} className={tab(t.id === currentId)}>
            {t.icon}{t.label}
          </button>
        ))}
        <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-current={inMore ? 'page' : undefined} onClick={() => setOpen(true)} className={tab(inMore)}>{moreLabel}</button>
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton={false}>
          <SheetHeader><SheetTitle>{moreLabel}</SheetTitle></SheetHeader>
          <div className="flex flex-col gap-2 px-4 pb-4">
            {more.map(g => (
              <section key={g.label} aria-label={g.label} className="flex flex-col">
                <h3 className="px-2 py-1 text-caption uppercase tracking-label text-fg-muted">{g.label}</h3>
                {g.items.map(i => (
                  <button key={i.id} type="button" aria-current={i.id === currentId ? 'page' : undefined} onClick={() => { setOpen(false); onSelect(i.id) }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-control text-fg">{i.icon}{i.label}</button>
                ))}
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
