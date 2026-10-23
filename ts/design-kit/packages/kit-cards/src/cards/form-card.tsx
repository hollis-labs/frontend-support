import { useId, useRef, useState, type ReactNode } from 'react'
import { ClipboardList } from 'lucide-react'
import { Button, Checkbox, Input, Textarea, useControllableState } from '@hollis-labs/design-components'
import { AnswerableNotices, CardNotice, ResolvedFooter } from '../answerable'
import { useAnswerable, type AnswerableStateProps } from '../answerable-state'
import {
  coerceValue,
  compileFormSchema,
  validateField,
  validateForm,
  type FormErrors,
  type FormField,
  type FormValues,
} from '../form/schema'
import { fieldDescribedBy } from '../field-ids'
import { ActionBar, Field, Stack } from '../layout'
import type { CardResponder } from '../response'
import { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader } from './envelope'

/**
 * A form built from a JSON-Schema subset (see `form/schema.ts`), answered once.
 *
 * REUSE CHECK. `design-components` Input / Textarea / Checkbox / Label are the
 * controls; `Field` (this package) is the label-hint-error frame. `kit-settings`'
 * field layer was examined and is NOT wrapped (private, flat, dirty/save-coupled) —
 * see the note in `form/schema.ts`. `FormDialog` is a modal scaffold; a form card
 * lives inline in a transcript or tray, so it composes the chassis instead.
 *
 * ERRORS ARE INLINE PER FIELD AND SUMMARISED. On a failed submit the summary takes
 * focus and links each error to its control, so a keyboard or screen-reader user
 * lands on what to fix rather than on a silent button.
 *
 * SECRETS NEVER ECHO. A secret field is `type="password"`, uncomplete-able by the
 * browser, never put in a receipt, and never placed in the outcome. The host supplies
 * `storeSecret`, which keeps the value wherever the host keeps secrets and returns a
 * REFERENCE; the outcome carries `{ ref }` only. With no handler the field is
 * disabled and says so — a form that quietly sent the value onward would be the bug.
 */

export interface FormCardProps extends AnswerableStateProps {
  readonly title: ReactNode
  readonly description?: ReactNode
  /** The JSON-Schema subset. Compiled each render; pass a stable object. */
  readonly schema: unknown
  /** Controlled draft (host-owned). Omit for local state seeded from `defaultValues`. */
  readonly values?: FormValues
  readonly defaultValues?: FormValues
  readonly onValuesChange?: (values: FormValues) => void
  readonly onRespond: CardResponder
  /** Keep a secret out of the outcome: store it and return a reference. */
  readonly storeSecret?: (key: string, value: string) => Promise<string>
  readonly submitLabel?: ReactNode
  readonly className?: string
}

const CONTROL = 'text-control'

function initialValues(fields: readonly FormField[], given: FormValues | undefined): FormValues {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (given && f.key in given) out[f.key] = given[f.key]
    else if (f.default !== undefined) out[f.key] = f.default
  }
  return out
}

export function FormCard({
  title,
  description,
  schema,
  values: controlled,
  defaultValues,
  onValuesChange,
  onRespond,
  storeSecret,
  submitLabel = 'Submit',
  priorStatus,
  busy,
  stale,
  onReload,
  elevation,
  receipt,
  supersededBy,
  className,
}: FormCardProps) {
  const compiled = compileFormSchema(schema)
  const [values, setValues] = useControllableState<FormValues>({
    value: controlled,
    defaultValue: initialValues(compiled.fields, defaultValues),
    onChange: onValuesChange,
  })
  const a = useAnswerable({ priorStatus, busy, stale, elevation })
  const base = useId()
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const blocked = compiled.issues.length > 0

  function set(key: string, value: unknown) {
    setValues({ ...values, [key]: value })
    if (errors[key]) {
      const field = compiled.fields.find((f) => f.key === key)
      const e = field ? validateField(field, value) : null
      setErrors((prev) => {
        const next = { ...prev }
        if (e) next[key] = e
        else delete next[key]
        return next
      })
    }
  }

  async function submit() {
    const found = validateForm(compiled.fields, values)
    setErrors(found)
    setSubmitError(null)
    if (Object.keys(found).length > 0) {
      // Move focus to the summary: it is a landmark of what to fix, with links.
      queueMicrotask(() => summaryRef.current?.focus())
      return
    }
    try {
      await a.run(async () => {
        const data: Record<string, unknown> = {}
        for (const f of compiled.fields) {
          const v = coerceValue(f, values[f.key])
          if (v === undefined) continue
          // Defence in depth: a sensitive field is NEVER sent as ordinary data.
          if (f.sensitive && f.kind !== 'secret') throw new Error(`Field "${f.key}" is secret and cannot be submitted as data.`)
          if (f.kind === 'secret') {
            if (!storeSecret) throw new Error('This form has a secret field but no secret handler.')
            data[f.key] = { ref: await storeSecret(f.key, String(v)) }
          } else {
            data[f.key] = v
          }
        }
        await onRespond({ status: 'submitted', data })
        // Drop secret text from local state once it has been handed off.
        const cleared: Record<string, unknown> = { ...values }
        for (const f of compiled.fields) if (f.kind === 'secret') delete cleared[f.key]
        setValues(cleared)
      })
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Could not submit. Your answers are kept; try again.')
    }
  }

  const errorEntries = Object.entries(errors)

  return (
    <Envelope accent={a.live ? 'info' : undefined} muted={!a.live} className={className}>
      <EnvelopeHeader icon={ClipboardList} tone="info" label="Form" />
      <EnvelopeBody title={title} description={description}>
        {a.live ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <Stack>
            {blocked ? (
              <CardNotice tone="danger" role="alert">
                {compiled.issues.map((issue) => (
                  <p key={issue}>{issue}</p>
                ))}
                This form cannot be submitted.
              </CardNotice>
            ) : null}
            {errorEntries.length > 0 ? (
              <div
                ref={summaryRef}
                tabIndex={-1}
                role="alert"
                data-slot="form-error-summary"
                className="rounded-control border border-danger/40 bg-danger-muted px-3 py-2 text-control text-danger outline-none"
              >
                <p className="font-medium">Fix {errorEntries.length === 1 ? '1 field' : `${errorEntries.length} fields`} to continue:</p>
                <ul className="mt-1 list-disc pl-5">
                  {errorEntries.map(([key, message]) => (
                    <li key={key}>
                      <a
                        className="underline"
                        href={`#${base}-${key}`}
                        onClick={(event) => {
                          // A bare hash link scrolls but does not move focus; put it on the control.
                          event.preventDefault()
                          const target = document.getElementById(`${base}-${key}`)
                          // A labelled group (multi-select) is not focusable; focus its first control.
                          const control = target?.matches('input, select, textarea, button')
                            ? target
                            : target?.querySelector<HTMLElement>('input, select, textarea, button, [role="checkbox"]')
                          control?.focus()
                        }}
                      >
                        {message}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {compiled.fields.map((field) => (
              <FieldControl
                key={field.key}
                field={field}
                id={`${base}-${field.key}`}
                value={values[field.key]}
                error={errors[field.key]}
                disabled={a.disabled || field.readOnly || blocked}
                hasSecretHandler={storeSecret != null}
                onChange={(v) => set(field.key, v)}
              />
            ))}
            <AnswerableNotices stale={stale} onReload={onReload} elevation={elevation} />
            {submitError ? (
              <p role="alert" className="text-control text-danger">{submitError}</p>
            ) : null}
          </Stack>
        </form>
        ) : (
          // A finished form is a read-only summary, not a populated field list above its receipt.
          <FormReceipt fields={compiled.fields} values={values} />
        )}
      </EnvelopeBody>
      {a.live && !elevation ? (
        <EnvelopeFooter>
          {a.busy ? <span role="status" className="text-caption text-fg-muted">Submitting…</span> : null}
          <ActionBar>
            <Button type="button" variant="ghost" size="sm" disabled={a.disabled} className="max-sm:min-h-11" onClick={() => void a.run(() => onRespond({ status: 'canceled' }))}>
              Dismiss
            </Button>
            <Button type="button" size="sm" disabled={a.disabled || blocked} className="max-sm:min-h-11" onClick={() => void submit()}>
              {submitLabel}
            </Button>
          </ActionBar>
        </EnvelopeFooter>
      ) : a.live ? null : (
        <ResolvedFooter
          state={a.state}
          receipt={receipt}
          supersededBy={supersededBy}
          focusOnMount={a.transitioned}
        />
      )}
    </Envelope>
  )
}

/** The answers, read-only, for every terminal state. Sensitive fields are named and never shown. */
function FormReceipt({ fields, values }: { fields: readonly FormField[]; values: FormValues }) {
  const shown = fields.filter((f) => !isBlank(values[f.key]) || f.sensitive)
  if (shown.length === 0) return null
  return (
    <ul data-slot="form-summary" className="space-y-0.5 text-control">
      {shown.map((f) => (
        <li key={f.key}>
          <span className="text-fg-muted">{f.title}: </span>
          {f.sensitive ? <span>Provided by reference</span> : <span>{display(values[f.key])}</span>}
        </li>
      ))}
    </ul>
  )
}
const isBlank = (v: unknown) => v === undefined || v === null || v === ''
const display = (v: unknown) => (Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v))

interface FieldControlProps {
  readonly field: FormField
  readonly id: string
  readonly value: unknown
  readonly error?: string
  readonly disabled: boolean
  readonly hasSecretHandler: boolean
  readonly onChange: (value: unknown) => void
}

function FieldControl({ field, id, value, error, disabled, hasSecretHandler, onChange }: FieldControlProps) {
  const describedBy = fieldDescribedBy(id, { hint: field.description != null || field.kind === 'fallback' || field.kind === 'secret', error: error != null })
  const common = { id, disabled, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy } as const
  const text = value == null ? '' : String(value)

  let hint: ReactNode = field.description
  if (field.kind === 'fallback') {
    hint = (
      <>
        {field.description ? <>{field.description} </> : null}
        This field's schema uses{' '}
        <code className="font-mono">{field.unsupported.join(', ') || 'an unsupported shape'}</code>, which this form does
        not support. Enter the answer as text or JSON.
      </>
    )
  } else if (field.kind === 'secret') {
    hint = (
      <>
        {field.description ? <>{field.description} </> : null}
        {hasSecretHandler ? 'Stored by the host; only a reference is sent with your answer.' : 'No secret handler is configured, so this field is disabled.'}
      </>
    )
  }

  if (field.kind === 'boolean') {
    return (
      <Field id={id} label={field.title} hint={hint} error={error} required={false}>
        <label className="flex min-h-11 items-center gap-3 sm:min-h-8">
          <Checkbox
            id={id}
            checked={value === true}
            disabled={disabled}
            aria-describedby={describedBy}
            onCheckedChange={(next) => onChange(next === true)}
          />
          <span className="text-control text-fg-secondary">{value === true ? 'Yes' : 'No'}</span>
        </label>
      </Field>
    )
  }

  let control: ReactNode
  switch (field.kind) {
    case 'textarea':
    case 'fallback':
      control = <Textarea {...common} value={text} onChange={(e) => onChange(e.target.value)} className={CONTROL} />
      break
    case 'enum':
      control = (
        <select
          {...common}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full min-w-0 rounded-control border border-border bg-bg px-2.5 text-control text-fg max-sm:min-h-11"
        >
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={String(o)} value={String(o)}>{String(o)}</option>
          ))}
        </select>
      )
      break
    case 'multi': {
      const list = Array.isArray(value) ? (value as unknown[]).map(String) : []
      control = (
        <fieldset id={id} {...{ disabled }} aria-describedby={describedBy} className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
          <legend className="sr-only">{field.title}</legend>
          {field.options?.map((o) => {
            const key = String(o)
            return (
              <label key={key} className="flex min-h-11 items-center gap-3 text-control text-fg sm:min-h-8">
                <Checkbox
                  checked={list.includes(key)}
                  disabled={disabled}
                  onCheckedChange={(next) => onChange(next === true ? [...list, key] : list.filter((v) => v !== key))}
                />
                {key}
              </label>
            )
          })}
        </fieldset>
      )
      break
    }
    case 'secret':
      control = (
        <Input
          {...common}
          disabled={disabled || !hasSecretHandler}
          type="password"
          autoComplete="off"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={`${CONTROL} max-sm:min-h-11`}
        />
      )
      break
    case 'number':
    case 'integer':
      control = (
        <Input
          {...common}
          type="number"
          inputMode={field.kind === 'integer' ? 'numeric' : 'decimal'}
          step={field.kind === 'integer' ? 1 : 'any'}
          min={field.minimum}
          max={field.maximum}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={`${CONTROL} max-sm:min-h-11`}
        />
      )
      break
    case 'date':
      control = <Input {...common} type="date" value={text} onChange={(e) => onChange(e.target.value)} className={`${CONTROL} max-sm:min-h-11`} />
      break
    default:
      control = <Input {...common} type="text" value={text} onChange={(e) => onChange(e.target.value)} className={`${CONTROL} max-sm:min-h-11`} />
  }

  return (
    <Field id={id} label={field.title} required={field.required} hint={hint} error={error}>
      {control}
    </Field>
  )
}
