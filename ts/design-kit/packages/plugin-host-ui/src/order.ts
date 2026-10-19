import { contributionId } from './host.js'
import type { ContributionView } from './host.js'
export interface OrderingPolicy {
  manifestOnly?: boolean
  direction?: 'ascending' | 'descending'
  defaultPriority?: number
}
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
/** Provided items; saved preferences first, then stable manifest order and identity. */
export function orderContributions<T extends ContributionView>(views: readonly T[], userOrder: readonly string[] = [], policy: OrderingPolicy = {}): T[] {
  const byId = new Map<string, T>()
  for (const view of views) { const id = contributionId(view.ref); if (!byId.has(id)) byId.set(id, view) }
  const selected: T[] = []
  for (const id of userOrder) { const view = byId.get(id); if (view) { selected.push(view); byId.delete(id) } }
  const finite = (n: number | undefined, fallback: number) => n !== undefined && Number.isFinite(n) ? n : fallback
  const sign = policy.direction === 'descending' ? -1 : 1
  return [...selected, ...[...byId.values()].sort((a, b) =>
    (policy.manifestOnly ? 0 : sign * (finite(a.priority, policy.defaultPriority ?? 10) - finite(b.priority, policy.defaultPriority ?? 10))) ||
    finite(a.manifestOrder, 0) - finite(b.manifestOrder, 0) ||
    compare(a.ref.owner, b.ref.owner) || compare(a.ref.key, b.ref.key) || compare(a.ref.kind, b.ref.kind) || compare(a.ref.generation, b.ref.generation))]
}
