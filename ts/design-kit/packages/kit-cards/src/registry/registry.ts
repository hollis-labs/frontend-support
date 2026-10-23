import type { ComponentType } from 'react'
import {
  trustClassPermits,
  trustProfileFor,
  type MissCode,
  type RendererClass,
  type TrustClass,
} from '@hollis-labs/design-bindings'

/**
 * The renderer registry: `register(kind, version, component, schema)`.
 *
 * WHERE IT LIVES, AND WHY NOT IN design-bindings. The Designer's brief put this in
 * design-bindings. That package's header forbids it by design: "There is no global
 * registry to install into and no `register()` to call", it has zero runtime
 * dependencies and no React, and a binding "names components in one host's module
 * tree, so the table is host-local by construction". A `register()` there would let a
 * kit assert its own binding, which is exactly what the BindingRequest/Binding split
 * exists to prevent. So the registry is an INSTANCE a host creates (no module-level
 * state), owned by kit-cards, and it consumes design-bindings' vocabulary — MissCode,
 * RendererClass, TrustClass and the trust profiles — rather than redefining it.
 * See CHANGELOG for the escalation.
 *
 * TRUST IS REQUESTED BY THE REGISTRATION AND GRANTED BY THE HOST. `register` carries
 * `requestedTrust`; the host's `grantTrust` decides. A refused claim is QUARANTINED —
 * the entry resolves to a `quarantined` miss and is never silently downgraded to a
 * lower class. Agent-originated content may only use an entry whose granted trust has
 * no ambient host authority.
 *
 * UNKNOWN KINDS DEGRADE, NEVER BLANK: `resolve` always returns something drawable —
 * a component or a miss the slot draws as `CardMiss`.
 */

export type Origin = 'host' | 'agent'

export interface RegisterOptions {
  readonly rendererClass?: RendererClass
  readonly requestedTrust?: TrustClass
}

export interface CardRegistration<P = never> {
  readonly kind: string
  readonly version: string
  readonly component: ComponentType<P>
  /** JSON Schema for the payload. Kept for hosts and conformance suites; not enforced here. */
  readonly schema: unknown
  readonly rendererClass: RendererClass
  readonly requestedTrust: TrustClass
  /** `null` until granted; `null` after a refusal too — see `granted`. */
  readonly grantedTrust: TrustClass | null
}

export interface GrantRequest {
  readonly kind: string
  readonly version: string
  readonly rendererClass: RendererClass
  readonly requestedTrust: TrustClass
}

export interface CardRegistryOptions {
  /** The host's decision. Return the class to grant, or `null` to refuse. Default: refuse all. */
  readonly grantTrust?: (request: GrantRequest) => TrustClass | null
}

export type CardResolution =
  | { readonly ok: true; readonly entry: CardRegistration }
  | { readonly ok: false; readonly code: MissCode; readonly wireKind: string; readonly reason: string }

export interface CardRegistry {
  register<P>(
    kind: string,
    version: string,
    component: ComponentType<P>,
    schema: unknown,
    options?: RegisterOptions,
  ): void
  resolve(query: { kind: string; version: string; origin?: Origin }): CardResolution
  /** Every registration, for conformance suites and operator views. */
  list(): readonly CardRegistration[]
}

export function createCardRegistry(options: CardRegistryOptions = {}): CardRegistry {
  const grant = options.grantTrust ?? (() => null)
  const entries = new Map<string, CardRegistration>()
  const keyOf = (kind: string, version: string) => `${kind}@${version}`

  return {
    register(kind, version, component, schema, opts = {}) {
      const key = keyOf(kind, version)
      if (entries.has(key)) {
        // Two registrations for one (kind, version) is a build mistake. Taking the first
        // would be a binding chosen by call order — the drift this design refuses.
        throw new Error(`Card renderer already registered for ${key}.`)
      }
      const rendererClass = opts.rendererClass ?? 'react-component'
      const requestedTrust = opts.requestedTrust ?? 'portfolio-trusted'
      const decided = grant({ kind, version, rendererClass, requestedTrust })
      // A grant must still permit the renderer class; otherwise it is a refusal.
      const grantedTrust = decided != null && trustClassPermits(decided, rendererClass) ? decided : null
      entries.set(key, {
        kind,
        version,
        component: component as ComponentType<never>,
        schema,
        rendererClass,
        requestedTrust,
        grantedTrust,
      })
    },

    resolve({ kind, version, origin = 'host' }) {
      const entry = entries.get(keyOf(kind, version))
      if (!entry) {
        const known = [...entries.values()].filter((e) => e.kind === kind).map((e) => e.version)
        return known.length
          ? { ok: false, code: 'unavailable', wireKind: kind, reason: `Version ${version} is not available; this build has ${known.join(', ')}.` }
          : { ok: false, code: 'unclassified', wireKind: kind, reason: `No renderer is registered for ${kind}.` }
      }
      if (entry.grantedTrust == null) {
        return { ok: false, code: 'quarantined', wireKind: kind, reason: `The host refused the ${entry.requestedTrust} trust claim for ${kind}@${version}.` }
      }
      if (origin === 'agent' && trustProfileFor(entry.grantedTrust).ambientHostAuthority) {
        return { ok: false, code: 'quarantined', wireKind: kind, reason: `Agent-originated content may not use a renderer with ambient host authority (${entry.grantedTrust}).` }
      }
      return { ok: true, entry }
    },

    list: () => [...entries.values()],
  }
}
