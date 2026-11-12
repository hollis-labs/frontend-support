import type { CatalogRow, HostProfile, RendererCatalog } from '@hollis-labs/design-bindings'

/**
 * The wire kinds the SF-6 goldens draw (app-shell/goldens): the six page types, and the gap
 * components their frames use. Each is classified at version 1.
 */
export const GOLDEN_KINDS = [
  'page.list-detail', 'page.settings', 'page.form', 'page.auth-keys', 'page.action-menu', 'page.plugin-nav',
  'component.split-pane', 'component.bulk-action-bar', 'component.review-bar', 'component.outline-nav',
  'component.settings-group', 'component.secret-reveal', 'component.mobile-tab-bar',
] as const

const row = (kind: string): CatalogRow => ({
  kind,
  version: '1',
  rendererId: `kit.${kind}`,
  rendererClass: 'declarative',
  entry: `@hollis-labs/app-shell#${kind.replace(/[.-](\w)/g, (_m, c: string) => c.toUpperCase())}`,
  payload: { from: 'data' },
  requestedIsolation: 'host-primitive',
  fallback: { kind: 'none' },
})

export const catalog: RendererCatalog = { contractDigest: 'catalog-fixture', rows: GOLDEN_KINDS.map(row) }

/** A Hadron-shaped host: the main app only, declarative renderers in host-primitive, no agent content. */
export const hadron: HostProfile = {
  id: 'hadron',
  origins: ['host'],
  isolation: { declarative: 'host-primitive' },
  resolverConfig: { inlinePayloadLimitBytes: 65536 },
}
