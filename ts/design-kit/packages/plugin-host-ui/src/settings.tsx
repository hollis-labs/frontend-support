import { useEffect, useSyncExternalStore } from 'react'
import { Button } from '@hollis-labs/design-components'
import { SettingsGroupForm, SettingsProvenanceRenderer } from '@hollis-labs/kit-settings'
import type { PluginSettingsController } from './settings-controller.js'
export { projectPluginSettings, projectAppIsolationSettings } from './settings-model.js'
export type { PluginSettingsProjection, PluginSettingsCapabilities } from './settings-model.js'
export { createPluginSettingsController } from './settings-controller.js'
export type { PluginSettingsController, PluginSettingsState } from './settings-controller.js'
export type * from './settings-contract.js'
function useSettings(controller: PluginSettingsController) {
  useEffect(() => controller.retain(), [controller])
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot)
}
function SettingsFooter({ controller, busy, conflict }: { controller: PluginSettingsController; busy?: boolean; conflict?: object }) {
  return busy ? <Button type="button" variant="outline" onClick={() => controller.cancel()}>Cancel operation</Button>
    : conflict ? <Button type="button" variant="outline" onClick={() => { controller.cancel(); void controller.refresh() }}>Discard and reload</Button> : null
}
export function PluginConfigForm({ controller }: { controller: PluginSettingsController }) {
  const state = useSettings(controller)
  const projection = controller.projection
  if (projection.status !== 'supported' || projection.origin !== 'plugin' || state.phase === 'unavailable' || state.phase === 'disposed') return <p role="alert" className="text-caption text-danger">{state.error ?? 'Plugin settings unavailable.'}</p>
  if (state.phase === 'loading') return <p role="status" className="text-caption text-fg-muted">Loading plugin settings…</p>
  return <SettingsGroupForm group={projection.group} {...state} busy={state.busy || !!state.conflict}
    onDraftChange={draft => { if (!Object.keys(draft).length) controller.cancel(); else controller.setDraft(draft) }}
    onValidate={() => { void controller.validate() }} onSave={() => { void controller.save() }} onReset={() => { void controller.reset() }}
    footer={<SettingsFooter controller={controller} busy={state.busy} conflict={state.conflict} />} />
}
/** Host-owned app setting only; never merged with a plugin's group or draft. */
export function AppIsolationConfigForm({ controller, onApply }: { controller: PluginSettingsController; onApply?: (targets: readonly string[]) => void }) {
  const state = useSettings(controller), projection = controller.projection
  if (projection.status !== 'supported' || projection.origin !== 'app-isolation' || controller.target.kind !== 'app' || state.phase === 'unavailable' || state.phase === 'disposed') return <p role="alert" className="text-caption text-danger">{state.error ?? 'App isolation settings unavailable.'}</p>
  if (state.phase === 'loading') return <p role="status" className="text-caption text-fg-muted">Loading app isolation setting…</p>
  return <SettingsProvenanceRenderer contractVersion={1} groups={[projection.group]} states={{ [projection.group.id]: { ...state, busy: state.busy || !!state.conflict } }}
    groupFooter={() => <SettingsFooter controller={controller} busy={state.busy} conflict={state.conflict} />}
    onDraftChange={(_, draft) => { if (!Object.keys(draft).length) controller.cancel(); else controller.setDraft(draft) }}
    onValidate={() => { void controller.validate() }} onSave={() => { void controller.save() }} onReset={() => { void controller.reset() }}
    onApply={onApply ? (_, targets) => onApply(targets) : undefined} />
}
