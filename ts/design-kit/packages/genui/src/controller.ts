import { ContractError, freeze } from './decode'
import { CATALOG_ID, assertSerializable, draftErrors, parseCall, parseEnvelope, parseResponse, serializeCall, type ResponseObservation } from './contract'
import type { Call, Choice, Envelope, Input, Outcome } from './generated'

export interface RecoverRequest { surfaceId: string; actionId: string; functionCallId: string }
export interface Recovery {
  /** Canonical AgentFunctionResponse from a host read, correlated to this read's functionCallId. */
  response: string
  /** Optional original canonical Call retained by the host. Never reconstructed from an action ID. */
  request?: string
}
export interface ConfirmationRequest extends RecoverRequest {
  call: string
  challenge: Extract<Outcome, { status: 'needs_confirmation' }>['confirm']
}
export interface GenuiTransport {
  submit(call: string, signal: AbortSignal): Promise<string>
  recover(request: RecoverRequest, signal: AbortSignal): Promise<Recovery>
  /** Host performs the real confirmation workflow and returns its opaque proof; UI does not mint it. */
  confirm?(request: ConfirmationRequest, signal: AbortSignal): Promise<string>
}
export type Phase = 'ready' | 'busy' | 'pending' | 'confirmation' | 'unknown' | 'terminal' | 'stale'
export interface GenuiSnapshot {
  envelope: Envelope
  phase: Phase
  actionId?: string
  observation?: ResponseObservation
  message?: string
  canConfirm: boolean
}

function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ak = Object.keys(a), bk = Object.keys(b)
  return ak.length === bk.length && ak.every(key => Object.hasOwn(b, key) && equal((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
}
function offered(envelope: Envelope): Choice[] {
  const root = envelope.data.createSurface.components[0]
  return root.component === 'GenuiApproval' ? root.props.choices : root.component === 'GenuiForm' ? [root.props.submit] : []
}
function withoutProof(call: Call): Call {
  const clean = parseCall(serializeCall(call))
  const action = { ...clean.callAgentFunction.callFunction.args.genui_action }
  delete action.confirmation
  return { ...clean, callAgentFunction: { ...clean.callAgentFunction, callFunction: { ...clean.callAgentFunction.callFunction, args: { ...clean.callAgentFunction.callFunction.args, genui_action: action } } } }
}

// Canonical Go ChoiceDigest defaults the catalog and excludes the advisory risk hint.
// This matches a stored choice only; actual risk and authority remain host decisions.
function choiceAction(call: Call['callAgentFunction']['callFunction']) {
  const action = { ...call.args.genui_action }
  delete action.risk
  return action
}
function semanticCall(call: Call['callAgentFunction']['callFunction']) {
  return { ...call, catalogId: call.catalogId ?? CATALOG_ID, args: { ...call.args, genui_action: choiceAction(call) } }
}

/** One presentation's coordinator. The host owns registration, policy, durable state and idempotency. */
export class GenuiController {
  private state: GenuiSnapshot
  private listeners = new Set<() => void>()
  private operation?: AbortController
  private original?: Call
  private disposed = false
  private readonly transport: GenuiTransport
  private readonly invocationId: () => string
  constructor(raw: string | Uint8Array, transport: GenuiTransport, invocationId: () => string = () => crypto.randomUUID()) {
    this.transport = transport
    this.invocationId = invocationId
    this.state = freeze({ envelope: parseEnvelope(raw), phase: 'ready', canConfirm: false })
  }
  getSnapshot = (): GenuiSnapshot => this.state
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  private update(change: Partial<GenuiSnapshot>): void {
    this.state = freeze({ ...this.state, ...change })
    for (const listener of this.listeners) listener()
  }
  private begin(actionId: string): AbortController {
    this.operation?.abort()
    const op = new AbortController()
    this.operation = op
    this.update({ phase: 'busy', actionId, canConfirm: false, message: undefined })
    return op
  }
  private current(op: AbortController): boolean { return !this.disposed && this.operation === op && !op.signal.aborted }
  private receive(raw: string, id: string, op: AbortController): void {
    const observation = parseResponse(raw, id)
    if (!this.current(op)) return
    if (observation.kind !== 'known') {
      this.update({ phase: 'unknown', observation, canConfirm: false, message: 'The result is not yet understood. Check the host status before taking further action.' })
      return
    }
    const status = observation.outcome.status
    const phase: Phase = observation.terminal ? 'terminal' : status === 'needs_confirmation' ? 'confirmation' : status === 'stale' ? 'stale' : 'pending'
    this.update({ phase, observation, message: undefined, canConfirm: phase === 'confirmation' && this.original !== undefined && this.transport.confirm !== undefined })
  }
  private uncertain(op: AbortController): void {
    if (this.current(op)) this.update({ phase: 'unknown', canConfirm: false, message: 'The host result could not be verified. This action has not been retried.' })
  }
  async submit(choiceIndex: number, draft?: Input): Promise<void> {
    if (this.disposed || this.state.phase !== 'ready') return
    const root = this.state.envelope.data.createSurface.components[0]
    if (root.props.state !== 'ready') throw new ContractError('This surface is not ready for submission.')
    const choice = offered(this.state.envelope)[choiceIndex]
    if (!choice) throw new ContractError()
    let input = choice.callFunction.args.input
    if (root.component === 'GenuiForm') {
      if (draft === undefined || Object.keys(draftErrors(root.props.fields, draft)).length) throw new ContractError('Review the form values.')
      assertSerializable(draft)
      input = { ...input, draft }
    } else if (draft !== undefined) throw new ContractError()
    const functionCallId = this.invocationId()
    const call: Call = { version: '1.0', callAgentFunction: { surfaceId: this.state.envelope.data.createSurface.surfaceId, functionCallId, callFunction: { ...choice.callFunction, args: { ...choice.callFunction.args, input } } } }
    const raw = serializeCall(call)
    this.original = parseCall(raw)
    const op = this.begin(call.callAgentFunction.callFunction.args.genui_action.id)
    try { this.receive(await this.transport.submit(raw, op.signal), functionCallId, op) } catch { this.uncertain(op) }
  }
  private validateRecorded(raw: string, actionId: string): Call {
    const call = parseCall(raw)
    if (call.callAgentFunction.callFunction.args.genui_action.confirmation !== undefined) throw new ContractError()
    const invocation = call.callAgentFunction
    if (invocation.surfaceId !== this.state.envelope.data.createSurface.surfaceId || invocation.callFunction.args.genui_action.id !== actionId) throw new ContractError()
    const root = this.state.envelope.data.createSurface.components[0]
    const match = offered(this.state.envelope).some(choice => {
      const recorded = invocation.callFunction
      const base = choice.callFunction
      if (recorded['@call'] !== base['@call'] || (recorded.catalogId ?? CATALOG_ID) !== (base.catalogId ?? CATALOG_ID) || !equal(choiceAction(recorded), choiceAction(base))) return false
      if (root.component !== 'GenuiForm') return equal(recorded.args.input, base.args.input)
      const { draft, ...rest } = recorded.args.input
      return draft !== null && typeof draft === 'object' && !Array.isArray(draft) && !Object.keys(draftErrors(root.props.fields, draft)).length && equal(rest, base.args.input)
    })
    if (!match) throw new ContractError()
    if (this.original && !equal(semanticCall(withoutProof(this.original).callAgentFunction.callFunction), semanticCall(invocation.callFunction))) throw new ContractError()
    return freeze(call)
  }
  /** Read-only recovery. Never submits a choice, and never infers input from an action ID. */
  async recover(actionId = this.state.actionId): Promise<void> {
    if (this.disposed || this.state.phase === 'busy' || !actionId || (this.state.actionId !== undefined && this.state.actionId !== actionId) || !offered(this.state.envelope).some(choice => choice.callFunction.args.genui_action.id === actionId)) return
    const functionCallId = this.invocationId()
    const op = this.begin(actionId)
    try {
      const recovery = await this.transport.recover({ surfaceId: this.state.envelope.data.createSurface.surfaceId, actionId, functionCallId }, op.signal)
      if (!this.current(op)) return
      const recorded = recovery.request === undefined ? undefined : this.validateRecorded(recovery.request, actionId)
      const observation = parseResponse(recovery.response, functionCallId)
      if (recorded) this.original = recorded
      // Validate all evidence before adopting any newly recovered input.
      this.receive(recovery.response, observation.functionCallId, op)
    } catch { this.uncertain(op) }
  }
  async confirm(): Promise<void> {
    const observation = this.state.observation
    if (this.disposed || !this.state.canConfirm || observation?.kind !== 'known' || observation.outcome.status !== 'needs_confirmation' || !this.original || !this.transport.confirm) return
    const original = this.original
    const functionCallId = this.invocationId()
    const actionId = original.callAgentFunction.callFunction.args.genui_action.id
    const op = this.begin(actionId)
    try {
      const proof = await this.transport.confirm({ surfaceId: original.callAgentFunction.surfaceId, actionId, functionCallId, call: serializeCall(original), challenge: observation.outcome.confirm }, op.signal)
      if (!this.current(op)) return
      const call: Call = { ...original, callAgentFunction: { ...original.callAgentFunction, functionCallId, callFunction: { ...original.callAgentFunction.callFunction, args: { ...original.callAgentFunction.callFunction.args, genui_action: { ...original.callAgentFunction.callFunction.args.genui_action, confirmation: proof } } } } }
      const raw = serializeCall(call)
      this.receive(await this.transport.submit(raw, op.signal), functionCallId, op)
    } catch { this.uncertain(op) }
  }
  /** Stops this view's requests, not the host operation. Remount and recover to read durable status. */
  dispose(): void { this.disposed = true; this.operation?.abort(); this.listeners.clear() }
}
