import { useId } from 'react'
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

export function FormMessage({ tone, children }: { readonly tone: 'error' | 'notice' | 'success'; readonly children: React.ReactNode }) {
  // Errors use the danger Callout: danger token, icon, border and role="alert".
  if (tone === 'error') return <Callout tone="danger">{children}</Callout>
  return (
    <div role="status" className={tone === 'success' ? 'text-control text-success' : 'text-control text-fg-secondary'}>
      {children}
    </div>
  )
}
