/**
 * The action gateway: the host's single policy point for the S0.3 action schema (tesseract
 * 01M6ME3AF9JJ39JZTCZVWAP94H). It receives A2UI `callAgentFunction` requests, applies risk /
 * confirmation / staleness / idempotency policy, calls the backend and answers with exactly one
 * terminal outcome per action id. No DOM and no React here; `actions-ui.tsx` renders the state.
 */

export const OUTCOME_STATUSES = ['ok', 'accepted', 'needs_confirmation', 'refused', 'conflict', 'stale', 'canceled', 'expired', 'superseded', 'failed'] as const
export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number]
export const REFUSED_REASONS = ['unsupported-action', 'invalid-arguments', 'denied', 'unregistered-route', 'unresolved-target', 'stale-owner', 'absent-scope', 'cancelled'] as const
export type RefusedReason = (typeof REFUSED_REASONS)[number]
export type Risk = 'low' | 'medium' | 'high'
const RISK_ORDER: Readonly<Record<Risk, number>> = { low: 0, medium: 1, high: 2 }

/** The local, renderer-side catalog functions. Anything else is an agent function or is refused. */
export const CATALOG_FUNCTIONS = ['navigate', 'openOverlay', 'closeOverlay', 'openRegion', 'closeRegion', 'toast', 'focus', 'setData'] as const
export type CatalogFunction = (typeof CATALOG_FUNCTIONS)[number]

export interface Subject { kind: string; id: string }
export interface Basis { revision: string; projectionRevision?: string }
export interface Confirm { what: string; scope: readonly string[]; ttlMs: number; who?: string }
export interface HollisAction { id: string; subject?: Subject; risk?: Risk; basis?: Basis; confirmation?: string }

export type Outcome =
  | { status: 'ok'; result?: unknown; receipt?: string }
  | { status: 'accepted'; handle: string; poll?: boolean }
  | { status: 'needs_confirmation'; confirm: Confirm }
  | { status: 'refused'; reason: RefusedReason }
  | { status: 'conflict'; recorded: Outcome }
  | { status: 'stale'; current: { revision: string } }
  | { status: 'canceled'; cause?: string }
  | { status: 'expired' }
  | { status: 'superseded'; by?: string }
  | { status: 'failed'; code: string; message: string; detail?: unknown }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const optStr = (v: unknown) => v === undefined || isStr(v)

function parseConfirm(v: unknown): Confirm | null {
  if (!isRecord(v) || !isStr(v.what) || !Array.isArray(v.scope) || !v.scope.length || !v.scope.every(isStr)) return null
  if (typeof v.ttlMs !== 'number' || !Number.isInteger(v.ttlMs) || v.ttlMs < 1 || !optStr(v.who)) return null
  return { what: v.what, scope: v.scope as string[], ttlMs: v.ttlMs, ...(v.who !== undefined ? { who: v.who as string } : {}) }
}

/**
 * Reads a backend value as an Outcome, keeping only the schema's fields for the status.
 * Null for anything else (unknown status, or a known status with the wrong shape): the
 * gateway never reads that as success.
 */
export function parseOutcome(raw: unknown, depth = 0): Outcome | null {
  if (!isRecord(raw) || !isStr(raw.status)) return null
  switch (raw.status) {
    case 'ok': return optStr(raw.receipt) ? { status: 'ok', ...('result' in raw ? { result: raw.result } : {}), ...(raw.receipt !== undefined ? { receipt: raw.receipt as string } : {}) } : null
    case 'accepted': return isStr(raw.handle) ? { status: 'accepted', handle: raw.handle, ...(typeof raw.poll === 'boolean' ? { poll: raw.poll } : {}) } : null
    case 'needs_confirmation': { const confirm = parseConfirm(raw.confirm); return confirm ? { status: 'needs_confirmation', confirm } : null }
    case 'refused': return (REFUSED_REASONS as readonly unknown[]).includes(raw.reason) ? { status: 'refused', reason: raw.reason as RefusedReason } : null
    case 'conflict': { const recorded = depth < 2 ? parseOutcome(raw.recorded, depth + 1) : null; return recorded ? { status: 'conflict', recorded } : null }
    case 'stale': return isRecord(raw.current) && isStr(raw.current.revision) ? { status: 'stale', current: { revision: raw.current.revision } } : null
    case 'canceled': return optStr(raw.cause) ? { status: 'canceled', ...(raw.cause !== undefined ? { cause: raw.cause as string } : {}) } : null
    case 'expired': return { status: 'expired' }
    case 'superseded': return optStr(raw.by) ? { status: 'superseded', ...(raw.by !== undefined ? { by: raw.by as string } : {}) } : null
    case 'failed': return isStr(raw.code) && isStr(raw.message) ? { status: 'failed', code: raw.code, message: raw.message, ...('detail' in raw ? { detail: raw.detail } : {}) } : null
    default: return null
  }
}

/** Parses the `hollis_action` block. Returns the problem as text when it is not valid. */
export function parseHollisAction(raw: unknown): HollisAction | string {
  if (!isRecord(raw)) return 'hollis_action must be an object'
  const extra = Object.keys(raw).find(k => !['id', 'subject', 'risk', 'basis', 'confirmation'].includes(k))
  if (extra) return `hollis_action.${extra} is not part of the schema`
  if (!isStr(raw.id) || raw.id.length < 8) return 'hollis_action.id must be a string of at least 8 characters'
  const action: HollisAction = { id: raw.id }
  if (raw.risk !== undefined) {
    if (raw.risk !== 'low' && raw.risk !== 'medium' && raw.risk !== 'high') return 'hollis_action.risk must be low, medium or high'
    action.risk = raw.risk
  }
  if (raw.subject !== undefined) {
    const s = raw.subject
    if (!isRecord(s) || !isStr(s.kind) || !s.kind || !isStr(s.id) || !s.id || Object.keys(s).length !== 2) return 'hollis_action.subject must be {kind, id}'
    action.subject = { kind: s.kind, id: s.id }
  }
  if (raw.basis !== undefined) {
    const b = raw.basis
    if (!isRecord(b) || !isStr(b.revision) || !optStr(b.projectionRevision) || Object.keys(b).some(k => k !== 'revision' && k !== 'projectionRevision')) return 'hollis_action.basis must be {revision, projectionRevision?}'
    action.basis = { revision: b.revision, ...(b.projectionRevision !== undefined ? { projectionRevision: b.projectionRevision as string } : {}) }
  }
  if (raw.confirmation !== undefined) {
    if (!isStr(raw.confirmation)) return 'hollis_action.confirmation must be a string'
    action.confirmation = raw.confirmation
  }
  return action
}

const REFUSED_TEXT: Readonly<Record<RefusedReason, string>> = {
  'unsupported-action': 'This action is not supported here.',
  'invalid-arguments': 'The action was malformed and was not sent.',
  denied: 'You are not allowed to do this.',
  'unregistered-route': 'That destination is not registered.',
  'unresolved-target': 'The item this action targets could not be found.',
  'stale-owner': 'The surface that asked for this is no longer current.',
  'absent-scope': 'The permission needed for this is missing.',
  cancelled: 'The request was cancelled.',
}

export type NoticeKind = 'success' | 'info' | 'warning' | 'error'
export interface OutcomeMessage { kind: NoticeKind; title: string; detail?: string }

/** The visible message for an outcome. refused, conflict and failed each read differently and carry the backend's reason. */
export function outcomeMessage(o: Outcome): OutcomeMessage {
  switch (o.status) {
    case 'ok': return { kind: 'success', title: 'Done', ...(o.receipt ? { detail: `Receipt ${o.receipt}` } : {}) }
    case 'accepted': return { kind: 'info', title: 'Accepted', detail: `Working on it (${o.handle}).` }
    case 'needs_confirmation': return { kind: 'warning', title: 'Confirmation needed', detail: o.confirm.what }
    case 'refused': return { kind: 'error', title: 'Refused', detail: `${REFUSED_TEXT[o.reason]} (${o.reason})` }
    case 'conflict': return { kind: 'error', title: 'Already submitted', detail: `This action was already handled: ${outcomeMessage(o.recorded).title.toLowerCase()}.` }
    case 'stale': return { kind: 'warning', title: 'Changed since you looked', detail: `The item is now at revision ${o.current.revision}. Review the changes before trying again.` }
    case 'canceled': return { kind: 'info', title: 'Canceled', ...(o.cause ? { detail: o.cause } : {}) }
    case 'expired': return { kind: 'warning', title: 'Expired', detail: 'The confirmation window passed. Nothing was changed.' }
    case 'superseded': return { kind: 'warning', title: 'Superseded', detail: o.by ? `Replaced by ${o.by}.` : 'Replaced by a newer action.' }
    case 'failed': return { kind: 'error', title: 'Failed', detail: o.message }
  }
}

const failed = (code: string, message: string): Outcome => ({ status: 'failed', code, message })
const refused = (reason: RefusedReason): Outcome => ({ status: 'refused', reason })

function deepFreeze<T>(v: T): T {
  if (typeof v === 'object' && v !== null && !Object.isFrozen(v)) {
    Object.freeze(v)
    for (const k of Object.keys(v)) deepFreeze((v as Record<string, unknown>)[k])
  }
  return v
}
const plainCopy = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T))

/** What the gateway sends the backend. `action.confirmation` is present only on the step-up retry. */
export interface BackendRequest { function: string; input?: unknown; action: HollisAction }
export interface ActionBackend { execute(req: BackendRequest): Promise<unknown> }

/** One audit entry per reply. Ids, subject, risk, status and time only: never input, grants or results. */
export interface AuditEntry { id: string; function: string; subject?: Subject; risk: Risk; outcome: OutcomeStatus; at: string; surfaceId: string; replay?: true }

export interface CatalogHandlerContext { surfaceId: string }
export type CatalogHandlers = Partial<Record<CatalogFunction, (args: Record<string, unknown>, ctx: CatalogHandlerContext) => void | Promise<void>>>

export interface FrozenAction { function: string; input: unknown; action: Readonly<HollisAction> & { risk: Risk } }
export interface PendingConfirmation { id: string; action: FrozenAction; confirm: Readonly<Confirm>; granting: boolean }

export interface Notice {
  seq: number
  id: string
  outcome: Outcome
  message: OutcomeMessage
  subject?: Subject
  /** Set for stale: the host's re-review step (the review-changes step of the flow) is offered. */
  review?: { id: string; subject?: Subject; current: { revision: string } }
  /** Set for a medium-risk success when the host can undo it. */
  undo?: () => Promise<void>
}

export interface GatewaySnapshot { confirmation: PendingConfirmation | null; notice: Notice | null }

export interface ActionGatewayOptions {
  backend: ActionBackend
  /** Backend function names the gateway will route (e.g. `tasks.transition`). A name in neither this nor the catalog is refused. */
  agentFunctions: readonly string[]
  /** Local catalog functions. A catalog function without a handler is refused (`unsupported-action`). */
  catalog?: CatalogHandlers
  /** Hadron wires this. Receives every reply, replays included. A sink that throws never breaks the action. */
  audit: (entry: AuditEntry) => void
  /** Mints the opaque step-up grant once the user confirms. Auth specifics belong to the host. */
  issueGrant: (action: FrozenAction, confirm: Confirm) => Promise<string>
  /** Host risk policy; the effective risk is the higher of this and what the surface declared. No declaration and no policy means high. */
  risk?: (fn: string, subject: Subject | undefined) => Risk | undefined
  /** The revision now current for a subject; a differing `basis` returns stale without executing. */
  currentBasis?: (subject: Subject) => Basis | undefined | Promise<Basis | undefined>
  /** Describes a high-risk action for the confirmation overlay. Default: the function name, scoped to the subject. */
  describe?: (action: FrozenAction) => Confirm
  /** An undo for a medium-risk success where the backend offers one. */
  undo?: (info: { function: string; subject?: Subject; outcome: Outcome }) => (() => Promise<void>) | undefined
  /** Opens/closes the confirmation overlay (stack depth 2, on top). `open` false means no room. */
  confirmationHost?: { open(id: string): boolean; close(id: string): void }
  /** Fires after an agent action reaches a terminal outcome, so the host can return focus to the trigger. */
  onTerminal?: (info: { id: string; outcome: Outcome; trigger: unknown }) => void
  now?: () => number
}

export interface CallRequest { surfaceId: string; functionCallId: string; callFunction: unknown }
/** agentFunctionResponse: domain outcomes are in `value`; protocol failures use `error`. */
export type CallResponse = { functionCallId: string; value: Outcome } | { functionCallId: string; error: { code: string; message: string } }

export interface ActionGateway {
  handleCall(req: CallRequest, meta?: { trigger?: unknown }): Promise<CallResponse>
  /** Resolves the open confirmation. Cancel yields `canceled`. */
  resolveConfirmation(id: string, decision: 'confirm' | 'cancel'): void
  /** Cancels the action under confirmation (an edit, a dismissed overlay). No effect on any other id. */
  cancel(id: string, cause: string): void
  dismissNotice(): void
  subscribe(listener: () => void): () => void
  getSnapshot(): GatewaySnapshot
}

type Settle = (o: Outcome | { grant: string }) => void
interface Pending { view: PendingConfirmation; shownAt: number; trigger: unknown; settle: Settle; timer: ReturnType<typeof setTimeout> }
type Ledger = { state: 'inflight'; promise: Promise<Outcome> } | { state: 'recorded'; outcome: Outcome }

export function createActionGateway(opts: ActionGatewayOptions): ActionGateway {
  const clash = opts.agentFunctions.find(f => (CATALOG_FUNCTIONS as readonly string[]).includes(f))
  if (clash) throw new Error(`"${clash}" is a catalog function and cannot also be an agent function`)
  const agentFns = new Set(opts.agentFunctions)
  const now = opts.now ?? Date.now
  const ledger = new Map<string, Ledger>()
  let pending: Pending | null = null
  let snap: GatewaySnapshot = { confirmation: null, notice: null }
  let noticeSeq = 0
  const listeners = new Set<() => void>()
  const publish = (next: Partial<GatewaySnapshot>) => { snap = { ...snap, ...next }; listeners.forEach(l => l()) }

  const audit = (entry: AuditEntry) => { try { opts.audit(entry) } catch { /* the sink's failure must not change an action's outcome */ } }

  function notify(id: string, outcome: Outcome, subject: Subject | undefined, extra: Pick<Notice, 'undo'> = {}) {
    const review = outcome.status === 'stale' ? { id, ...(subject ? { subject } : {}), current: outcome.current } : undefined
    publish({ notice: { seq: ++noticeSeq, id, outcome, message: outcomeMessage(outcome), ...(subject ? { subject } : {}), ...(review ? { review } : {}), ...extra } })
  }

  function effectiveRisk(fn: string, a: HollisAction): Risk {
    const given = [a.risk, opts.risk?.(fn, a.subject)].filter((r): r is Risk => r !== undefined)
    if (!given.length) return 'high'
    return given.reduce((hi, r) => (RISK_ORDER[r] > RISK_ORDER[hi] ? r : hi))
  }

  async function callBackend(fn: string, input: unknown, action: HollisAction): Promise<Outcome> {
    let raw: unknown
    try { raw = await opts.backend.execute({ function: fn, input, action }) } catch { return failed('backend-error', 'The action could not be completed.') }
    const parsed = parseOutcome(raw)
    if (parsed) return parsed
    // Not success and not a partial: the id is spent as a failure that names the unrecognised status.
    const status = isRecord(raw) && isStr(raw.status) ? raw.status.slice(0, 40) : undefined
    return failed('unknown-status', status ? `The server returned an unrecognised result ("${status}").` : 'The server returned an unreadable result.')
  }

  async function staleCheck(a: HollisAction): Promise<Outcome | null> {
    if (!a.basis || !a.subject || !opts.currentBasis) return null
    let cur: Basis | undefined
    try { cur = await opts.currentBasis(a.subject) } catch { return failed('basis-unavailable', 'The current state could not be checked.') }
    if (!cur) return null
    const changed = cur.revision !== a.basis.revision || (a.basis.projectionRevision !== undefined && cur.projectionRevision !== undefined && cur.projectionRevision !== a.basis.projectionRevision)
    return changed ? { status: 'stale', current: { revision: cur.revision } } : null
  }

  function endPending(p: Pending) {
    clearTimeout(p.timer)
    if (pending === p) pending = null
    opts.confirmationHost?.close(p.view.id)
    publish({ confirmation: null })
  }

  /** Shows the frozen decision surface and waits for the user. Resolves to a grant or a terminal outcome. */
  function askUser(frozen: FrozenAction, confirm: Confirm, trigger: unknown): Promise<{ grant: string } | Outcome> {
    if (pending) return Promise.resolve({ status: 'canceled', cause: 'confirmation-in-progress' })
    if (opts.confirmationHost && !opts.confirmationHost.open(frozen.action.id)) return Promise.resolve(failed('confirmation-unavailable', 'There is no room to ask for confirmation.'))
    return new Promise(resolve => {
      const view: PendingConfirmation = deepFreeze({ id: frozen.action.id, action: frozen, confirm: plainCopy(confirm), granting: false })
      const p: Pending = {
        view, shownAt: now(), trigger,
        settle: r => { endPending(p); resolve(r) },
        timer: setTimeout(() => { if (pending === p) p.settle({ status: 'expired' }) }, confirm.ttlMs),
      }
      pending = p
      publish({ confirmation: view })
    })
  }

  async function runAction(fn: string, input: unknown, action: HollisAction, risk: Risk, trigger: unknown): Promise<Outcome> {
    const frozen: FrozenAction = deepFreeze({ function: fn, input: plainCopy(input), action: { ...plainCopy(action), risk } })
    const stale = await staleCheck(action)
    if (stale) return stale
    // High risk is the gateway's call, not the backend's: nothing executes before a grant.
    let outcome: Outcome = risk === 'high'
      ? { status: 'needs_confirmation', confirm: opts.describe?.(frozen) ?? { what: `Run ${fn}`, scope: [action.subject ? `${action.subject.kind}:${action.subject.id}` : fn], ttlMs: 60_000 } }
      : await callBackend(fn, frozen.input, frozen.action)
    let stepped = false
    while (outcome.status === 'needs_confirmation') {
      if (stepped) return failed('confirmation-repeated', 'The server asked for confirmation again after it was given.')
      const decision = await askUser(frozen, outcome.confirm, trigger)
      if (!('grant' in decision)) return decision
      const again = await staleCheck(action)
      if (again) return again
      stepped = true
      outcome = await callBackend(fn, frozen.input, { ...frozen.action, confirmation: decision.grant })
    }
    return outcome
  }

  /** A refusal made before any id is accepted: shown, handed back for focus, and not recorded in the ledger. */
  function refuseNow(fn: string, reason: RefusedReason, trigger: unknown): Outcome {
    const out = refused(reason)
    notify(`refused:${fn}`, out, undefined)
    opts.onTerminal?.({ id: `refused:${fn}`, outcome: out, trigger })
    return out
  }

  async function agentCall(fn: string, args: Record<string, unknown>, req: CallRequest, trigger: unknown): Promise<Outcome> {
    const bad = Object.keys(args).find(k => k !== 'hollis_action' && k !== 'input')
    const parsed = bad ? `argument ${bad} is not part of the schema` : parseHollisAction(args.hollis_action)
    // A surface never supplies the step-up grant; only the gateway's own retry carries one.
    if (typeof parsed === 'string' || parsed.confirmation !== undefined) return refuseNow(fn, 'invalid-arguments', trigger)
    const risk = effectiveRisk(fn, parsed)
    const entry = (outcome: Outcome, replay?: true): AuditEntry => ({
      id: parsed.id, function: fn, ...(parsed.subject ? { subject: parsed.subject } : {}), risk, outcome: outcome.status,
      at: new Date(now()).toISOString(), surfaceId: req.surfaceId, ...(replay ? { replay } : {}),
    })
    const seen = ledger.get(parsed.id)
    if (seen?.state === 'inflight') return seen.promise
    if (seen?.state === 'recorded') {
      const outcome: Outcome = { status: 'conflict', recorded: seen.outcome }
      audit(entry(outcome, true)); notify(parsed.id, outcome, parsed.subject)
      return outcome
    }
    const promise = runAction(fn, args.input, parsed, risk, trigger)
    ledger.set(parsed.id, { state: 'inflight', promise })
    const outcome = await promise
    ledger.set(parsed.id, { state: 'recorded', outcome })
    audit(entry(outcome))
    const undo = risk === 'medium' && outcome.status === 'ok' ? opts.undo?.({ function: fn, ...(parsed.subject ? { subject: parsed.subject } : {}), outcome }) : undefined
    notify(parsed.id, outcome, parsed.subject, undo ? { undo } : {})
    opts.onTerminal?.({ id: parsed.id, outcome, trigger })
    return outcome
  }

  async function catalogCall(fn: CatalogFunction, args: Record<string, unknown>, surfaceId: string, trigger: unknown): Promise<Outcome> {
    const handler = opts.catalog?.[fn]
    if (!handler) return refuseNow(fn, 'unsupported-action', trigger)
    try { await handler(args, { surfaceId }) } catch {
      const out = failed('catalog-error', `${fn} could not be completed.`)
      notify(`local:${fn}`, out, undefined); opts.onTerminal?.({ id: `local:${fn}`, outcome: out, trigger })
      return out
    }
    return { status: 'ok' }
  }

  return {
    async handleCall(req, meta) {
      const fcid = isRecord(req) && isStr(req.functionCallId) ? req.functionCallId : ''
      const call = isRecord(req) ? req.callFunction : undefined
      if (!fcid || !isStr(req.surfaceId) || !req.surfaceId || !isRecord(call) || !isStr(call['@call']) || !call['@call']) {
        return { functionCallId: fcid, error: { code: 'invalid_request', message: 'callAgentFunction needs surfaceId, functionCallId and callFunction with "@call".' } }
      }
      const { '@call': name, ...args } = call
      const trigger = meta?.trigger ?? null
      let value: Outcome
      if ((CATALOG_FUNCTIONS as readonly string[]).includes(name)) value = await catalogCall(name as CatalogFunction, args, req.surfaceId, trigger)
      else if (agentFns.has(name)) value = await agentCall(name, args, req, trigger)
      else value = refuseNow(name, 'unsupported-action', trigger)
      return { functionCallId: fcid, value }
    },
    resolveConfirmation(id, decision) {
      const p = pending
      if (!p || p.view.id !== id || p.view.granting) return
      if (decision === 'cancel') { p.settle({ status: 'canceled', cause: 'user' }); return }
      if (now() - p.shownAt > p.view.confirm.ttlMs) { p.settle({ status: 'expired' }); return }
      p.view = { ...p.view, granting: true }
      publish({ confirmation: p.view })
      opts.issueGrant(p.view.action, p.view.confirm as Confirm).then(
        grant => { if (pending === p) p.settle({ grant }) },
        () => { if (pending === p) p.settle(failed('grant-failed', 'The confirmation could not be completed.')) },
      )
    },
    cancel(id, cause) { if (pending?.view.id === id) pending.settle({ status: 'canceled', cause }) },
    dismissNotice() { if (snap.notice) publish({ notice: null }) },
    subscribe(l) { listeners.add(l); return () => { listeners.delete(l) } },
    getSnapshot: () => snap,
  }
}
