import type { BindingRequest } from '@hollis-labs/design-bindings'

/** Inert declaration only. The host must compose it through design-bindings and grant isolation. */
export const genuiBinding: BindingRequest = Object.freeze({
  kind: 'genui.declarative-surface',
  version: '1.0.0',
  rendererId: 'genui.surface',
  rendererClass: 'declarative',
  entry: '@hollis-labs/genui#GenuiSurface',
  payload: { from: 'whole' },
  requestedIsolation: 'host-primitive',
  fallback: { kind: 'none' },
} satisfies BindingRequest)
