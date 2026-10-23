/**
 * `@hollis-labs/kit-cards/registry` — the renderer registry, as its own entry.
 *
 * A SEPARATE ENTRY ON PURPOSE. The registry imports `@hollis-labs/design-bindings` at
 * RUNTIME (its trust profiles), and that package publishes TypeScript source as its
 * `main`. Keeping this out of the root entry means a consumer that only draws cards —
 * every existing kit-chat adopter — never loads design-bindings at runtime, and a
 * Node-based test runner that cannot strip types under node_modules is not broken by
 * an import it did not ask for.
 */
export { createCardRegistry } from './registry'
export type {
  CardRegistration,
  CardRegistry,
  CardRegistryOptions,
  CardResolution,
  GrantRequest,
  Origin,
  RegisterOptions,
} from './registry'
export { CardSlot } from './card-slot'
export type { CardSlotProps } from './card-slot'
