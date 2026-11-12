import { actionFingerprint, parsePluginAction, type ActionContext, type ActionRefusalReason, type ActionResult, type PluginActionsAdapter } from './actions-contract.js'
import type { SlotCatalog } from './catalog.js'
import type { ContributionRef, HostScope, PluginHostReader, PluginRegistryInstance, RegistryEntry } from './host.js'
interface ActionPin { ref: ContributionRef; signature: string; value: unknown }
interface DispatcherOptions<Input> {
  registry: PluginRegistryInstance<Input>
  catalog: SlotCatalog
  scope: HostScope
  adapter?: PluginActionsAdapter
  report(reason: ActionRefusalReason, ref: ContributionRef): void
}
const refusal = (reason: ActionRefusalReason): ActionResult => ({ status: 'refused', reason })
const codes = new Set<ActionRefusalReason>(['unsupported-action', 'invalid-metadata', 'stale-owner', 'absent-scope', 'unresolved-command-target', 'unresolved-modal-target', 'denied', 'invalid-arguments', 'unregistered-route', 'cancelled', 'host-failed'])
function result(value: ActionResult): ActionResult {
  if (value?.status === 'success') return { status: 'success' }
  return value?.status === 'refused' && codes.has(value.reason) ? refusal(value.reason) : refusal('host-failed')
}
function sameScope(a: HostScope | undefined, b: HostScope): boolean {
  return !!a && [a.appId, a.environmentId, a.clientId].every(value => typeof value === 'string' && value.trim().length > 0) &&
    a.appId === b.appId && a.environmentId === b.environmentId && a.projectId === b.projectId && a.clientId === b.clientId
}
const signature = (entry: RegistryEntry) => actionFingerprint(entry)
/** Internal invocation controller. No globals, transport, routing or browser exports. */
export function createPluginActionDispatcher<Input>(options: DispatcherOptions<Input>) {
  let disposed = false
  const pending = new Set<AbortController>()
  function pin(ref: ContributionRef): { pin: ActionPin; entry: RegistryEntry } | undefined {
    const snapshot = options.registry.snapshot()
    if (snapshot.registryVersion !== 2 || snapshot.hostInstance !== ref.hostInstance) return
    const entry = snapshot.contributions.find(entry => entry.owner_id === ref.owner && entry.owner_generation === ref.generation && entry.kind === ref.kind && entry.local_key === ref.key)
    if (!entry || entry.status !== 'accepted' || !options.catalog.inspect(entry, ref).accepted) return
    const adopted = options.registry.get(ref.kind, `${ref.owner}/${ref.key}`)
    if (!adopted || adopted.hostInstance !== ref.hostInstance || adopted.owner_id !== ref.owner || adopted.owner_generation !== ref.generation || adopted.local_key !== ref.key || adopted.kind !== ref.kind || adopted.representation !== entry.representation || adopted.status !== 'accepted' || !adopted.isActive()) return
    return { entry, pin: { ref: Object.freeze({ ...ref }), signature: signature(entry), value: adopted.value } }
  }
  function live(value: ActionPin): boolean {
    const current = pin(value.ref)
    return !!current && current.pin.signature === value.signature && current.pin.value === value.value
  }
  return {
    dispose() { disposed = true; for (const controller of pending) controller.abort('cancelled'); pending.clear() },
    async dispatch(value: unknown, contribution: ContributionRef, parent?: AbortSignal, binding?: string, onExecutionStart?: () => boolean): Promise<ActionResult> {
      const fail = (reason: ActionRefusalReason) => { try { options.report(reason, contribution) } catch { /* reporting does not grant authority */ } return refusal(reason) }
      if (disposed || parent?.aborted) return fail('cancelled')
      const parsed = parsePluginAction(value)
      if (!parsed.accepted) return fail(parsed.reason)
      const intent = parsed.intent
      const adapter = options.adapter
      if (!adapter) return fail('unsupported-action')
      const releases: (() => void)[] = []
      const controller = new AbortController()
      pending.add(controller)
      try {
        if (!sameScope(adapter.scope.getSnapshot(), options.scope)) return fail('absent-scope')
        const source = pin(contribution)
        if (!source) return fail('stale-owner')
        const projection = options.catalog.inspect(source.entry, source.pin.ref)
        if (!projection.accepted) return fail('invalid-metadata')
        const resolve = () => {
          if (binding !== undefined) {
            if (source.entry.representation !== 'component' || !binding || !adapter.bindings) return undefined
            const resolved = parsePluginAction(adapter.bindings.resolve(source.pin.ref, binding, intent))
            return resolved.accepted ? resolved.intent : undefined
          }
          return projection.projection.action
        }
        const declared = resolve()
        if (!declared) return fail(binding !== undefined ? 'unsupported-action' : 'invalid-metadata')
        if (actionFingerprint(declared) !== actionFingerprint(intent)) return fail('invalid-metadata')
        const policy = options.catalog.actionPolicy(projection.projection.region)
        if (!policy || policy.cardinality === 'none' || !policy.allowedTags.includes(intent.type)) return fail('unsupported-action')
        let target: ActionPin | undefined
        if (intent.type !== 'navigate') {
          const [owner, key] = intent.type === 'command' ? intent.command.split('/') : [intent.entry.owner_id, intent.entry.local_key]
          const snapshot = options.registry.snapshot()
          const entry = snapshot.contributions.find(entry => entry.owner_id === owner && entry.local_key === key && entry.kind === (intent.type === 'command' ? 'command' : 'widget'))
          const unresolved = intent.type === 'command' ? 'unresolved-command-target' : 'unresolved-modal-target'
          if (!entry) return fail(unresolved)
          const compiled = pin({ hostInstance: snapshot.hostInstance, owner: entry.owner_id, generation: entry.owner_generation, kind: entry.kind, key: entry.local_key })
          if (!compiled) return fail(unresolved)
          if (intent.type === 'command' && (compiled.entry.representation !== 'handler' || !compiled.entry.handler?.id)) return fail(unresolved)
          if (intent.type === 'modal') {
            const region = options.catalog.regions.find(region => region.name === intent.region)
            const projected = options.catalog.inspect(compiled.entry, compiled.pin.ref)
            if (!region?.modal || region.representation !== 'component' || !region.widgetKinds.includes('widget') || compiled.entry.component?.region !== intent.region || !projected.accepted || !projected.widget || projected.projection.region !== intent.region) return fail(unresolved)
          }
          target = compiled.pin
        }
        const invocation = adapter.invocation.getSnapshot()
        const context: ActionContext = Object.freeze({ contribution: source.pin.ref, scope: Object.freeze({ ...options.scope }), invocation: Object.freeze({ ...invocation }), target: target?.ref })
        function check(): ActionRefusalReason | undefined {
          if (disposed) return 'cancelled'
          if (!sameScope(adapter!.scope.getSnapshot(), options.scope)) return 'absent-scope'
          if (adapter!.invocation.getSnapshot() !== invocation) return 'cancelled'
          if (!live(source!.pin) || (target && !live(target))) return 'stale-owner'
          const currentBinding = resolve()
          if (!currentBinding || actionFingerprint(currentBinding) !== actionFingerprint(intent)) return 'unsupported-action'
          return undefined
        }
        const changed = () => { try { const reason = check(); if (reason) controller.abort(reason) } catch { controller.abort('stale-owner') } }
        const cancel = () => controller.abort('cancelled')
        // Subscribe first, then check again so an admission await cannot miss a revoke.
        releases.push(options.registry.subscribe(changed))
        releases.push(adapter.scope.subscribe(changed))
        releases.push(adapter.invocation.subscribe(changed))
        parent?.addEventListener('abort', cancel, { once: true }); releases.push(() => parent?.removeEventListener('abort', cancel))
        if (parent?.aborted) cancel()
        changed()
        const aborted = new Promise<ActionResult>(resolve => {
          const onAbort = () => resolve(refusal(codes.has(controller.signal.reason) ? controller.signal.reason as ActionRefusalReason : 'cancelled'))
          if (controller.signal.aborted) onAbort()
          else { controller.signal.addEventListener('abort', onAbort, { once: true }); releases.push(() => controller.signal.removeEventListener('abort', onAbort)) }
        })
        const execute = async (): Promise<ActionResult> => {
          if (controller.signal.aborted) return refusal(codes.has(controller.signal.reason) ? controller.signal.reason as ActionRefusalReason : 'cancelled')
          const validated = result(await adapter.validate(intent, context, controller.signal))
          if (controller.signal.aborted) return refusal(codes.has(controller.signal.reason) ? controller.signal.reason as ActionRefusalReason : 'cancelled')
          const invalid = check(); if (invalid) return refusal(invalid)
          if (validated.status === 'refused') return validated
          // A host receipt observer can fence a deadline before any effect starts.
          if (onExecutionStart && !onExecutionStart()) return refusal('cancelled')
          if (controller.signal.aborted) return refusal('cancelled')
          const fenced = check(); if (fenced) return refusal(fenced)
          let response: ActionResult
          switch (intent.type) {
            case 'command': response = await adapter.command(intent, context, controller.signal); break
            case 'navigate': response = await adapter.navigate(intent, context, controller.signal); break
            case 'modal': response = await adapter.modal(intent, context, controller.signal); break
          }
          const stale = check(); return stale ? refusal(stale) : result(response)
        }
        const outcome = await Promise.race([execute().catch(() => refusal('host-failed')), aborted])
        return outcome.status === 'refused' ? fail(outcome.reason) : outcome
      } catch { return fail('host-failed') }
      finally { for (const release of releases.reverse()) { try { release() } catch { /* continue independent cleanup */ } } pending.delete(controller) }
    },
  }
}
export interface ActionDispatchContext { host: PluginHostReader; contribution: ContributionRef }
export function dispatchPluginAction(intent: unknown, context: ActionDispatchContext, signal?: AbortSignal): Promise<ActionResult> {
  return context.host.dispatchAction(intent, context.contribution, signal)
}
export type { ActionContext, ActionResult, ActionRefusalReason, PluginActionIntent, PluginActionsAdapter } from './actions-contract.js'
