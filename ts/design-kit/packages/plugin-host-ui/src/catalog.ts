import { parsePluginAction } from './actions-contract.js'
import type { ContributionRef, RegistryEntry, ViewProjection } from './host.js'
import type { OrderingPolicy } from './order.js'
export type PluginActionTag = 'command' | 'navigate' | 'modal'
export interface RegionActionPolicy { cardinality: 'required' | 'optional' | 'none'; allowedTags: readonly PluginActionTag[] }
export type ContributionRepresentation = 'component' | 'declarative' | 'handler'
export interface SlotKindDefinition {
  kind: string
  schemaVersion: number
  representations: readonly ContributionRepresentation[]
  regions: readonly string[]
  role: 'contribution' | 'widget'
  /** Host-owned validation/projection, not an inline-slot wire schema. */
  validate(entry: RegistryEntry): boolean
  project(entry: RegistryEntry): ViewProjection
  /** Optional declared-placement reader, e.g. validated metadata.slot. */
  declaredRegion?(entry: RegistryEntry): string | undefined
}
export interface SlotRegionDefinition {
  name: string
  representation: ContributionRepresentation
  kinds: readonly string[]
  widgetKinds: readonly string[]
  ordering: 'priority-ascending' | 'priority-descending' | 'manifest'
  /** Absent means no actions are admitted. */
  actions?: RegionActionPolicy
  /** Explicit host modal destination; absent/false is not a modal region. */
  modal?: boolean
}
export interface SlotCatalogDefinitions {
  kinds: readonly SlotKindDefinition[]
  regions: readonly SlotRegionDefinition[]
  reserved(ref: ContributionRef): boolean
}
export type CatalogRefusalReason = 'unsupported-kind' | 'unsupported-schema' | 'unsupported-representation' | 'unsupported-region' | 'unsupported-widget' | 'reserved' | 'invalid-metadata' | 'projection-failed' | 'unsupported-action'
export interface CatalogRefusal { ref: ContributionRef; required: boolean; reason: CatalogRefusalReason }
export type CatalogProjection = { accepted: true; projection: ViewProjection; representation: ContributionRepresentation; widget: boolean }
  | { accepted: false; refusal: CatalogRefusal; projection: ViewProjection }
export interface SlotCatalog {
  kinds: readonly SlotKindDefinition[]
  regions: readonly SlotRegionDefinition[]
  inspect(entry: RegistryEntry, ref: ContributionRef): CatalogProjection
  ordering(region: string): OrderingPolicy | undefined
  actionPolicy(region: string): RegionActionPolicy | undefined
}
const catalogs = new WeakSet<object>()
export function isSlotCatalog(value: unknown): value is SlotCatalog { return typeof value === 'object' && value !== null && catalogs.has(value) }
const name = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const representations = new Set(['component', 'declarative', 'handler'])
function names(values: readonly string[]): boolean { return Array.isArray(values) && values.every(name) && new Set(values).size === values.length }
function invalid(): never { throw new Error('Invalid host slot catalog') }
/** Copy JSON projections; reject executable, cyclic, nonfinite or prototype-bearing data. */
function frozenData(value: unknown, ancestors = new Set<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value))) return value
  if (typeof value !== 'object' || value === null || ancestors.has(value)) throw new Error('Invalid projection data')
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error('Invalid projection data')
  ancestors.add(value)
  try {
    if (Array.isArray(value)) return Object.freeze(value.map(item => frozenData(item, ancestors)))
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, frozenData(item, ancestors)])))
  } finally { ancestors.delete(value) }
}
function normalize(value: ViewProjection): ViewProjection {
  if (!value || !name(value.label) || !name(value.region) ||
      (value.description !== undefined && typeof value.description !== 'string') ||
      (value.icon !== undefined && typeof value.icon !== 'string') ||
      (value.priority !== undefined && (!Number.isSafeInteger(value.priority) || value.priority < -2147483648 || value.priority > 2147483647)) ||
      (value.manifestOrder !== undefined && !Number.isSafeInteger(value.manifestOrder))) throw new Error('Invalid projection')
  const props = value.props === undefined ? Object.freeze({}) : frozenData(value.props)
  if (!props || Array.isArray(props) || typeof props !== 'object') throw new Error('Invalid projection props')
  return Object.freeze({ label: value.label, region: value.region, description: value.description, icon: value.icon,
    priority: value.priority, manifestOrder: value.manifestOrder, props: props as Readonly<Record<string, unknown>>,
    data: value.data === undefined ? undefined : frozenData(value.data), action: value.action })
}
/** No preset kinds or regions: construction snapshots and validates all host policy. */
export function createSlotCatalog(definitions: SlotCatalogDefinitions): SlotCatalog {
  if (!definitions || !Array.isArray(definitions.kinds) || !Array.isArray(definitions.regions) || typeof definitions.reserved !== 'function') invalid()
  const reserved = definitions.reserved
  const kinds = new Map<string, SlotKindDefinition>(), regions = new Map<string, SlotRegionDefinition>()
  for (const kind of definitions.kinds) {
    if (!kind || !name(kind.kind) || kinds.has(kind.kind) || !Number.isSafeInteger(kind.schemaVersion) || kind.schemaVersion < 1 ||
        !names(kind.representations) || !kind.representations.length || kind.representations.some((rep: ContributionRepresentation) => !representations.has(rep)) ||
        !names(kind.regions) || !['contribution', 'widget'].includes(kind.role) || typeof kind.validate !== 'function' || typeof kind.project !== 'function' || (kind.declaredRegion !== undefined && typeof kind.declaredRegion !== 'function') ||
        (kind.kind === 'slot' && kind.representations.some((rep: ContributionRepresentation) => rep !== 'declarative')) ||
        (kind.role === 'widget' && kind.representations.some((rep: ContributionRepresentation) => rep !== 'component'))) invalid()
    kinds.set(kind.kind, Object.freeze({ ...kind, representations: Object.freeze([...kind.representations]), regions: Object.freeze([...kind.regions]) }))
  }
  for (const region of definitions.regions) {
    if (!region || !name(region.name) || regions.has(region.name) || !representations.has(region.representation) || !names(region.kinds) || !names(region.widgetKinds) ||
        !['priority-ascending', 'priority-descending', 'manifest'].includes(region.ordering)) invalid()
    if (region.actions !== undefined && (!region.actions || !['required', 'optional', 'none'].includes(region.actions.cardinality) || !names(region.actions.allowedTags) ||
      region.actions.allowedTags.some((tag: string) => !['command', 'navigate', 'modal'].includes(tag)) ||
      (region.actions.cardinality === 'none' ? region.actions.allowedTags.length !== 0 : region.actions.allowedTags.length === 0))) invalid()
    if (region.modal !== undefined && (typeof region.modal !== 'boolean' || (region.modal && (region.representation !== 'component' || !region.widgetKinds.length)))) invalid()
    for (const kind of region.kinds) {
      const descriptor = kinds.get(kind)
      if (!descriptor || !descriptor.regions.includes(region.name) || !descriptor.representations.includes(region.representation)) invalid()
    }
    for (const widget of region.widgetKinds) if (!region.kinds.includes(widget) || kinds.get(widget)?.role !== 'widget' || region.representation !== 'component') invalid()
    regions.set(region.name, Object.freeze({ ...region, kinds: Object.freeze([...region.kinds]), widgetKinds: Object.freeze([...region.widgetKinds]), actions: region.actions ? Object.freeze({ cardinality: region.actions.cardinality, allowedTags: Object.freeze([...region.actions.allowedTags]) }) : undefined }))
  }
  for (const kind of kinds.values()) for (const region of kind.regions) if (!regions.get(region)?.kinds.includes(kind.kind)) invalid()
  const policies = new Map([...regions].map(([key, region]) => [key, Object.freeze(region.ordering === 'manifest' ? { manifestOnly: true } : { direction: region.ordering === 'priority-descending' ? 'descending' as const : 'ascending' as const, defaultPriority: 10 })]))
  const catalog: SlotCatalog = Object.freeze({
    kinds: Object.freeze([...kinds.values()]), regions: Object.freeze([...regions.values()]),
    ordering: (region: string) => policies.get(region),
    actionPolicy: (region: string) => regions.get(region)?.actions,
    inspect(entry: RegistryEntry, ref: ContributionRef): CatalogProjection {
      // Refused metadata never leaks labels/props/data from an unvalidated declaration.
      const refuse = (reason: CatalogRefusalReason): CatalogProjection => Object.freeze({ accepted: false, refusal: Object.freeze({ ref, required: entry.required === true, reason }),
        projection: Object.freeze({ label: 'Plugin contribution unavailable.', region: entry.component && regions.has(entry.component.region) ? entry.component.region : '', props: Object.freeze({}) }) })
      const kind = kinds.get(entry.kind)
      try {
        if (entry.owner_id === 'core' || reserved(ref)) return refuse('reserved')
      } catch { return refuse('reserved') }
      if (!kind) return refuse('unsupported-kind')
      if (entry.schema_version !== kind.schemaVersion) return refuse('unsupported-schema')
      if (!kind.representations.includes(entry.representation as ContributionRepresentation)) return refuse('unsupported-representation')
      try { if (kind.validate(entry) !== true) return refuse('invalid-metadata') } catch { return refuse('invalid-metadata') }
      let projection: ViewProjection
      try { projection = normalize(kind.project(entry)) } catch { return refuse('projection-failed') }
      const region = regions.get(projection.region)
      if (!region || !kind.regions.includes(region.name) || !region.kinds.includes(entry.kind) || region.representation !== entry.representation ||
          (entry.representation === 'component' && entry.component?.region !== region.name)) return refuse('unsupported-region')
      try { if (kind.declaredRegion && kind.declaredRegion(entry) !== projection.region) return refuse('unsupported-region') } catch { return refuse('unsupported-region') }
      if (kind.role === 'widget' && !region.widgetKinds.includes(kind.kind)) return refuse('unsupported-widget')
      if (projection.action !== undefined) {
        const parsed = parsePluginAction(projection.action)
        if (!parsed.accepted) return refuse(parsed.reason)
        if (!region.actions || region.actions.cardinality === 'none' || !region.actions.allowedTags.includes(parsed.intent.type)) return refuse('unsupported-action')
        projection = Object.freeze({ ...projection, action: parsed.intent })
      } else if (region.actions?.cardinality === 'required') return refuse('invalid-metadata')
      return Object.freeze({ accepted: true, projection, representation: entry.representation as ContributionRepresentation, widget: kind.role === 'widget' })
    },
  })
  catalogs.add(catalog)
  return catalog
}
