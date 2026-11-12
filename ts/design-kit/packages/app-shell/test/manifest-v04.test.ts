import { describe, expect, it } from 'vitest'
import { generateBindingTable } from '@hollis-labs/design-bindings'
import { buildShellModel, parseFrontendManifest, type FrontendManifest } from '../src'
import { admin } from './fixtures'

/**
 * Copied in shape from what `substrate frontend` writes at hollis-labs/substrate 76666fd: regions are
 * `{name, docked, anchor?, ...dock attributes}` (snake_case), items are snake_case except the action
 * keys, `bindings` is sorted, unique and carries no origin.
 */
const generated = {
  manifest_version: 0,
  app: 'hadron',
  modules: ['console'],
  bindings: [{ kind: 'envelope.note', version: '1' }, { kind: 'table.rows', version: '1' }],
  regions: [
    { name: 'shell.header', docked: false },
    { name: 'menu:plugin', docked: false },
    {
      name: 'shell.right', docked: true, anchor: 'shell.header', open_state: 'open', exclusive: true,
      sizes: { options: ['sm', 'md', 'lg'], default: 'md' }, dismiss_key: 'Esc', mobile: 'bottom-sheet', edge: 'bottom',
      height_px: { min: 120, default: 240, max: 640 },
    },
  ],
  items: [
    { module: 'console', kind: 'menu.item', key: 'open-plugins', label: 'Plugins', region: 'menu:plugin', order: 10, risk: 'low', when: 'plugin', shortcut: 'g p', action: { navigate: '/plugins' } },
    { module: 'console', kind: 'command', key: 'show-log', label: 'Show log', keywords: ['logs', 'tail'], group: 'View', action: { openRegion: 'shell.right', tab: 'logs' } },
    { module: 'console', kind: 'command', key: 'restart', label: 'Restart', risk: 'high', action: { call: 'plugins.restart', input: { force: true } } },
  ],
}

describe('the substrate 76666fd manifest', () => {
  it('parses, and reads dock attributes natively with edge as the side/bottom choice', () => {
    const r = parseFrontendManifest(generated)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const m = buildShellModel(r.manifest, { admin })
    expect(m.docks.map(d => d.region.name)).toEqual(['shell.right'])
    expect(m.docks[0]!.region.anchor).toBe('shell.header')
    expect(m.docks[0]!.attributes).toEqual({
      openState: 'open', exclusive: true, sizes: { options: ['sm', 'md', 'lg'], default: 'md' }, dismissKey: 'Esc', mobile: 'bottom-sheet', anchor: 'bottom',
      heightPx: { min: 120, default: 240, max: 640 },
    })
    expect(m.diagnostics.filter(d => d.code !== 'unknown-kind')).toEqual([])
  })

  it('keeps the new item fields and feeds originless bindings to the generator input', () => {
    const r = parseFrontendManifest(generated)
    if (!r.ok) throw new Error('parse')
    const cmd = r.manifest.items[1]!
    expect([cmd.action, cmd.keywords, cmd.group]).toEqual([{ openRegion: 'shell.right', tab: 'logs' }, ['logs', 'tail'], 'View'])
    expect(r.manifest.items[0]).toMatchObject({ order: 10, risk: 'low', when: 'plugin', shortcut: 'g p' })
    expect(r.manifest.bindings.every(b => b.origin === undefined)).toBe(true)
    expect(typeof generateBindingTable).toBe('function')
  })

  it('requires bindings (an empty list is fine)', () => {
    const { bindings: _, ...without } = generated
    void _
    expect(parseFrontendManifest(without).ok).toBe(false)
    expect(parseFrontendManifest({ ...generated, bindings: [] }).ok).toBe(true)
    expect(parseFrontendManifest({ ...generated, bindings: [{ kind: 'x' }] }).ok).toBe(false)
  })

  it('lists unknown fields and malformed actions as diagnostics without crashing', () => {
    const odd = {
      ...generated, future: 1,
      regions: [...generated.regions.slice(0, 2), { ...generated.regions[2]!, glow: true }],
      items: [
        { ...generated.items[0]!, sparkle: 1, action: { navigate: '/p', call: 'x' } },
        { ...generated.items[1]!, risk: 'extreme', action: { openRegion: 'a', zap: 1 } },
      ],
    } as unknown as FrontendManifest
    const m = buildShellModel(odd, { admin })
    const by = (c: string) => m.diagnostics.filter(d => d.code === c)
    expect(by('unknown-field').map(d => d.message)).toEqual([
      expect.stringContaining('future'), expect.stringContaining('glow'), expect.stringContaining('sparkle'), expect.stringContaining('zap'),
    ])
    expect(by('invalid-action')).toHaveLength(2)
  })
})
