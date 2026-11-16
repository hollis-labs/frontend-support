import { useId, useRef, useState, useSyncExternalStore } from 'react'
import { DiffView, ListRow, SplitPane } from '@hollis-labs/app-shell'
import { Button, Checkbox, Input, Textarea } from '@hollis-labs/design-components'
import { draftErrors } from './contract'
import type { GenuiController, GenuiSnapshot } from './controller'
import type { FormProps, Input as Draft, ListDetailProps, Outcome, ViewState } from './generated'

const viewKeys = new WeakMap<GenuiController, number>()
let nextViewKey = 0
function keyFor(controller: GenuiController): number {
  let key = viewKeys.get(controller)
  if (key === undefined) { key = ++nextViewKey; viewKeys.set(controller, key) }
  return key
}
const stateMessages: Record<Exclude<ViewState, 'ready'>, string> = {
  loading: 'Loading the current surface…', empty: 'There is nothing to show.', error: 'This surface could not be loaded.',
  stale: 'This surface is out of date. Request a fresh review.', conflict: 'This surface conflicts with a recorded change. Request a fresh review.', expired: 'This surface has expired. Request a fresh review.',
}
function SurfaceState({ state }: { state: ViewState }) {
  if (state === 'ready') return null
  return <p role={state === 'error' || state === 'conflict' ? 'alert' : 'status'} className="text-control text-fg-muted">{stateMessages[state]}</p>
}
function outcomeText(outcome: Outcome): string {
  switch (outcome.status) {
    case 'ok': return 'The host reports completion.'
    case 'accepted': return 'Accepted by the host. Completion is still pending.'
    case 'needs_confirmation': return 'The host requires confirmation before continuing.'
    case 'refused': return `The host refused this action: ${outcome.reason}.`
    case 'conflict': return 'This action conflicts with its recorded request. No new action was submitted.'
    case 'stale': return 'The reviewed basis is stale. Request a fresh review before acting.'
    case 'canceled': return 'The host reports cancellation.'
    case 'expired': return 'This action has expired.'
    case 'superseded': return 'This action has been superseded.'
    case 'failed': return 'The host reports that the action failed.'
  }
}
function ActionStatus({ controller, snapshot }: { controller: GenuiController; snapshot: GenuiSnapshot }) {
  const ref = useRef<HTMLDivElement>(null)
  const observation = snapshot.observation
  const confirmation = observation?.kind === 'known' && observation.outcome.status === 'needs_confirmation' ? observation.outcome.confirm : undefined
  return <div ref={ref} className="flex flex-col gap-3" aria-live="polite" aria-atomic="true">
    {snapshot.phase === 'busy' ? <p role="status">Waiting for the host…</p> : null}
    {snapshot.message ? <p role="alert">{snapshot.message}</p> : null}
    {snapshot.phase !== 'busy' && observation?.kind === 'known' ? <p role="status">{outcomeText(observation.outcome)}</p> : null}
    {snapshot.phase === 'confirmation' && confirmation ? <section aria-label="Confirmation required" className="rounded-md border border-border p-4">
      <h3 className="text-control font-medium">Confirmation required</h3>
      <p>{confirmation.what}</p><ul>{confirmation.scope.map((scope, index) => <li key={index}>{scope}</li>)}</ul>
      {confirmation.who ? <p>Requested for: {confirmation.who}</p> : null}
      <p className="text-caption text-fg-muted">The host checks the current scope and validity. Confirming here does not grant authority by itself.</p>
      {snapshot.canConfirm ? <Button type="button" onClick={() => { void controller.confirm() }}>Continue to host confirmation</Button> : <p role="note">The original request or confirmation service is unavailable. Check host status; do not reconstruct this action.</p>}
    </section> : null}
    {snapshot.actionId && ['pending', 'unknown', 'confirmation'].includes(snapshot.phase) ? <Button type="button" variant="outline" onClick={() => { void controller.recover() }}>Check host status</Button> : null}
  </div>
}
function FormPattern({ props, initial, controller, enabled }: { props: FormProps; initial: Draft; controller: GenuiController; enabled: boolean }) {
  const uid = useId()
  const form = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState<Record<string, string | boolean>>(() => Object.fromEntries(props.fields.map(field => {
    const value = Object.hasOwn(initial, field.key) ? initial[field.key] : undefined
    return [field.key, field.type === 'checkbox' ? value === true : value === undefined ? '' : String(value)]
  })))
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({})
  const convert = (): Draft => {
    const value: Draft = Object.create(null) as Draft
    for (const field of props.fields) {
      const raw = draft[field.key]
      if (field.type === 'integer') {
        if (raw === '') continue
        // Preserve invalid lexical input until validation; Number must never silently round it.
        value[field.key] = typeof raw === 'string' && /^-?(0|[1-9][0-9]*)$/.test(raw) && raw !== '-0' && Number.isSafeInteger(Number(raw)) ? Number(raw) : raw
      } else value[field.key] = raw
    }
    return value
  }
  return <form ref={form} noValidate className="flex flex-col gap-4" onSubmit={event => {
    event.preventDefault()
    if (!enabled) return
    const value = convert()
    const nextErrors = draftErrors(props.fields, value)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      const first = props.fields.find(field => nextErrors[field.key])
      if (first) document.getElementById(`${uid}-${first.key}`)?.focus()
      return
    }
    void controller.submit(0, value).catch(() => setErrors({ _form: 'This draft could not be submitted. Review its values.' }))
  }}>
    {props.fields.map(field => {
      const id = `${uid}-${field.key}`
      const error = Object.hasOwn(errors, field.key) ? errors[field.key] : undefined
      const described = [field.help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
      return <div key={field.key} className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-control font-medium">{field.label}{field.required ? ' (required)' : ''}</label>
        {field.type === 'checkbox' ? <Checkbox id={id} checked={draft[field.key] === true} disabled={!enabled} aria-required={field.required} aria-invalid={Boolean(error)} aria-describedby={described} onCheckedChange={checked => setDraft(previous => ({ ...previous, [field.key]: checked === true }))} /> : field.type === 'textarea' ?
          <Textarea id={id} value={String(draft[field.key])} disabled={!enabled} aria-required={field.required} aria-invalid={Boolean(error)} aria-describedby={described} onChange={event => setDraft(previous => ({ ...previous, [field.key]: event.target.value }))} /> :
          <Input id={id} type="text" inputMode={field.type === 'integer' ? 'numeric' : 'text'} value={String(draft[field.key])} disabled={!enabled} aria-required={field.required} aria-invalid={Boolean(error)} aria-describedby={described} onChange={event => setDraft(previous => ({ ...previous, [field.key]: event.target.value }))} />}
        {field.help ? <p id={`${id}-help`} className="text-caption text-fg-muted">{field.help}</p> : null}
        {error ? <p id={`${id}-error`} role="alert" className="text-caption text-danger">{error}</p> : null}
      </div>
    })}
    {errors._form ? <p role="alert">{errors._form}</p> : null}
    <Button type="submit" disabled={!enabled}>{props.submit.label}</Button>
    <p className="text-caption text-fg-muted">Submitting this draft requests a new review. It does not apply the proposed changes.</p>
  </form>
}
function ListDetailPattern({ props, onSelect, narrow }: { props: ListDetailProps; onSelect?: (id: string) => void; narrow: boolean }) {
  return <SplitPane narrow={narrow} detailOpen={props.selectedId !== undefined} onBack={() => onSelect?.('')} backLabel="Back to list"
    list={<section aria-label="Items">{props.items.length ? props.items.map(item => <ListRow key={item.id} id={item.id} title={item.title} subtitle={item.summary} current={item.id === props.selectedId} onOpen={onSelect} />) : <p role="status">There are no items.</p>}</section>}
    detail={props.detail ? <section aria-label="Selected item" className="flex flex-col gap-2 p-4"><h3 className="text-control font-medium">{props.detail.title}</h3><p className="whitespace-pre-wrap text-control">{props.detail.body}</p></section> : <p role="status" className="p-4">Select an item to view its detail.</p>} />
}
export interface GenuiSurfaceProps {
  controller: GenuiController
  /** Host fetches a newly validated surface; selection never invents detail or invokes an action. Empty means back. */
  onSelect?: (id: string) => void
  narrow?: boolean
}
/** Renders only the reviewed component catalog. Text stays text; no HTML, remote modules or arbitrary URLs. */
export function GenuiSurface({ controller, onSelect, narrow = false }: GenuiSurfaceProps) {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const root = snapshot.envelope.data.createSurface.components[0]
  const uid = useId()
  const enabled = snapshot.phase === 'ready' && root.props.state === 'ready'
  return <section aria-labelledby={`${uid}-title`} aria-busy={snapshot.phase === 'busy' || root.props.state === 'loading'} className="flex min-w-0 flex-col gap-4 text-fg">
    <h2 id={`${uid}-title`} className="text-lg font-semibold">{root.props.title}</h2>
    <SurfaceState state={root.props.state} />
    {root.component === 'GenuiApproval' ? <>
      {root.props.summary ? <p className="text-control">{root.props.summary}</p> : null}
      <div className="flex flex-col gap-3">{root.props.changes.map((change, index) => <DiffView key={index} changes={[{ field: change.label, before: change.before, after: change.after }]} />)}</div>
      <div role="group" aria-label="Review choices" className="flex flex-wrap gap-2">{root.props.choices.map((choice, index) => <Button key={index} type="button" disabled={!enabled} onClick={() => { void controller.submit(index) }}>{choice.label}</Button>)}</div>
    </> : root.component === 'GenuiForm' ? <FormPattern key={keyFor(controller)} props={root.props} initial={snapshot.envelope.data.createSurface.dataModel.draft ?? {}} controller={controller} enabled={enabled} /> : <ListDetailPattern props={root.props} onSelect={onSelect} narrow={narrow} />}
    <ActionStatus controller={controller} snapshot={snapshot} />
  </section>
}
