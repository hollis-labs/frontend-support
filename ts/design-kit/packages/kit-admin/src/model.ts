import type { AdminManifest, AdminPage } from './types'

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const sections = { settings: 'settings', health: 'status', stats: 'status', series: 'diagnostics', diagnostics: 'diagnostics' } as const

/** Presentation fence, not a wire validator. Never relocate a contradictory resource. */
export function adminManifestProblem(value: unknown): string | undefined {
  if (!record(value)) return 'Malformed admin manifest.'
  if (value.contract_version !== 1) return 'Unsupported admin contract version.'
  if (!record(value.app) || !text(value.app.id) || !text(value.app.label) || !text(value.revision)) return 'Malformed admin identity or declaration revision.'
  for (const [kind, section] of Object.entries(sections)) {
    const resources = value[kind]
    if (!Array.isArray(resources)) return `Malformed admin manifest: missing ${kind} array.`
    const ids = new Set<string>()
    for (const resource of resources) {
      if (!record(resource) || !text(resource.id) || !text(resource.label) || ids.has(resource.id)) return `Malformed ${kind} resource identity.`
      ids.add(resource.id)
      if (resource.section !== section) return `Contradictory ${kind} section: resources must declare ${section}.`
      if (kind !== 'settings' && (typeof resource.stale_after_ms !== 'number' || !Number.isFinite(resource.stale_after_ms) || resource.stale_after_ms <= 0)) return `Unsupported ${kind} observation age declaration.`
    }
  }
}
export function adminPages(manifest: AdminManifest): readonly AdminPage[] {
  return ['dashboard', ...(manifest.settings.length ? ['settings' as const] : []), ...(manifest.health.length || manifest.stats.length ? ['status' as const] : []), ...(manifest.series.length || manifest.diagnostics.length ? ['diagnostics' as const] : [])]
}
