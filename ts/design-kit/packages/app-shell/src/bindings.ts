/**
 * Renderer selection. The host composes a binding table with design-bindings
 * (kind@version, origin, isolation-only trust) and hands it to the shell; the shell
 * resolves through it and never decides trust itself.
 */
import { resolve, type BindingTable, type Origin, type Resolution } from '@hollis-labs/design-bindings'

export type RendererSelector = (kind: string, version: string, origin: Origin) => Resolution

/** Without a table every kind is a miss — there is no built-in guess. */
export function createRendererSelector(table: BindingTable | undefined): RendererSelector {
  return (kind, version, origin) => {
    if (!table) {
      return { ok: false, code: 'unclassified', kind, reason: 'No binding table was provided to the shell.', fallbackRendererId: null }
    }
    return resolve(table, kind, { version, origin })
  }
}
