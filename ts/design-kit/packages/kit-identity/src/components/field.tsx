import { useEffect, useId, useRef } from 'react'
import { Callout, Input } from '@hollis-labs/design-components'

export interface FieldProps {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly type?: 'text' | 'password'
  readonly autoComplete: string
  readonly hint?: string
  readonly required?: boolean
  readonly invalid?: boolean
}

/** Label + 13px control-token input. Hint is linked for assistive tech. */
export function Field({ label, value, onChange, type = 'text', autoComplete, hint, required = true, invalid = false }: FieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label text-fg-secondary">{label}</label>
      <Input id={id} type={type} value={value} required={required} autoComplete={autoComplete} aria-invalid={invalid || undefined}
        aria-describedby={hint ? `${id}-hint` : undefined} autoCapitalize="none" spellCheck={false}
        onChange={(event) => onChange(event.target.value)} className="text-control md:text-control text-fg" />
      {hint ? <p id={`${id}-hint`} className="text-caption text-fg-muted">{hint}</p> : null}
    </div>
  )
}

export interface FormMessageProps {
  readonly tone: 'error' | 'notice' | 'success'
  /** Move keyboard focus to the message when it appears, so a failed submit lands the person on the reason. */
  readonly focus?: boolean
  readonly children: React.ReactNode
}

export function FormMessage({ tone, focus = false, children }: FormMessageProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Focus the role="alert" node itself (the Callout takes no ref), so `getByRole('alert')` is the focused element.
    const alert = focus ? ref.current?.querySelector<HTMLElement>('[role="alert"]') : null
    if (!alert) return
    alert.tabIndex = -1
    alert.focus()
  }, [focus])
  // Errors use the danger Callout: danger token, icon, border and role="alert".
  if (tone === 'error') {
    const callout = <Callout tone="danger" className={focus ? 'outline-none focus-visible:ring-2 focus-visible:ring-ring' : undefined}>{children}</Callout>
    return focus ? <div ref={ref} className="contents">{callout}</div> : callout
  }
  return (
    <div role="status" className={tone === 'success' ? 'text-control text-success' : 'text-control text-fg-secondary'}>
      {children}
    </div>
  )
}
