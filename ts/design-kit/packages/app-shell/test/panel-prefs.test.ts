import { describe, expect, it } from 'vitest'
import type { HostDiagnostic, LayoutStorage } from '@hollis-labs/plugin-host-ui'
import { createPanelPrefs, type PanelDef, type PanelOpenSource, type PanelState } from '../src'

const memory = (): LayoutStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, read: k => data.get(k) ?? null, write: (k, v) => { data.set(k, v) }, remove: k => { data.delete(k) } }
}
const panels: PanelDef[] = [
  { id: 'files', source: 'builtin', order: 10 },
  { id: 'notes', source: 'builtin', order: 20 },
  { id: 'graph', source: 'plugin', pluginId: 'p1' },
]
const make = (storage = memory(), diagnostics: HostDiagnostic[] = []) =>
  createPanelPrefs({ storage, panels, diagnostic: e => diagnostics.push(e) })

type Step = ['open', PanelOpenSource] | ['dismiss'] | ['close'] | ['clear']
const run = (steps: Step[]) => {
  const p = make()
  const opened: boolean[] = []
  for (const s of steps) {
    if (s[0] === 'open') opened.push(p.open('files', s[1]))
    else if (s[0] === 'dismiss') p.dismiss('files')
    else if (s[0] === 'close') p.close('files')
    else p.clearDismissed('files')
  }
  return { state: p.stateOf('files'), opened }
}

describe('dismiss machine', () => {
  const table: [string, Step[], PanelState, boolean[]][] = [
    ['starts closed', [], 'closed', []],
    ['agent open', [['open', 'agent']], 'agent_opened', [true]],
    ['user open', [['open', 'user']], 'user_opened', [true]],
    ['user open takes over from agent', [['open', 'agent'], ['open', 'user']], 'user_opened', [true, true]],
    ['agent open over a user open attributes to the agent', [['open', 'user'], ['open', 'agent']], 'agent_opened', [true, true]],
    ['dismiss from agent_opened', [['open', 'agent'], ['dismiss']], 'user_dismissed', [true]],
    ['dismiss from user_opened', [['open', 'user'], ['dismiss']], 'user_dismissed', [true]],
    ['dismiss from closed', [['dismiss']], 'user_dismissed', []],
    ['agent open ignored when dismissed', [['dismiss'], ['open', 'agent']], 'user_dismissed', [false]],
    ['agent open ignored repeatedly', [['open', 'agent'], ['dismiss'], ['open', 'agent'], ['open', 'agent']], 'user_dismissed', [true, false, false]],
    ['user open wins over a dismissal', [['dismiss'], ['open', 'user']], 'user_opened', [true]],
    ['agent may reopen after the user reopened and closed', [['dismiss'], ['open', 'user'], ['close'], ['open', 'agent']], 'agent_opened', [true, true]],
    ['close does not dismiss', [['open', 'agent'], ['close']], 'closed', [true]],
    ['clearDismissed lets the agent in', [['dismiss'], ['clear'], ['open', 'agent']], 'agent_opened', [true]],
    ['clearDismissed alone returns to closed', [['dismiss'], ['clear']], 'closed', []],
  ]
  it.each(table)('%s', (_name, steps, state, opened) => {
    expect(run(steps)).toEqual({ state, opened })
  })

  it('unknown ids are ignored', () => {
    const p = make()
    expect(p.open('nope', 'user')).toBe(false)
    p.dismiss('nope')
    p.setEnabled('nope', true)
    p.setDefault('nope')
    expect(p.state.openSource).toEqual({})
    expect(p.state.dismissed).toEqual({})
    expect(p.state.defaultPanel).toBeUndefined()
  })

  it('clearDismissed() with no id forgets every dismissal', () => {
    const p = make()
    p.dismiss('files'); p.dismiss('notes')
    p.clearDismissed()
    expect(p.stateOf('files')).toBe('closed')
    expect(p.stateOf('notes')).toBe('closed')
  })
})

describe('registration', () => {
  it('a plugin panel cannot displace a built-in id', () => {
    const diagnostics: HostDiagnostic[] = []
    const p = make(memory(), diagnostics)
    expect(p.register({ id: 'files', source: 'plugin', pluginId: 'evil' })).toBe(false)
    p.dismiss('files')
    expect(p.stateOf('files')).toBe('user_dismissed')
    expect(diagnostics).toEqual([{ stage: 'panels', reason: 'panel-id-conflict:files' }])
  })

  it("a plugin panel cannot displace another plugin's id", () => {
    const p = make()
    expect(p.register({ id: 'graph', source: 'plugin', pluginId: 'p2', order: 1 })).toBe(false)
    expect(p.orderedIds()).toEqual(['files', 'notes', 'graph'])
  })

  it('also refused at creation', () => {
    const p = createPanelPrefs({ storage: memory(), panels: [...panels, { id: 'files', source: 'plugin', pluginId: 'p9' }, { id: 'graph', source: 'plugin', pluginId: 'p9' }] })
    expect(p.orderedIds()).toEqual(['files', 'notes', 'graph'])
  })

  it('a plugin may update its own panel; a plugin panel needs a pluginId', () => {
    const p = make()
    expect(p.register({ id: 'graph', source: 'plugin', pluginId: 'p1', order: 1 })).toBe(true)
    expect(p.orderedIds()[0]).toBe('graph')
    expect(p.register({ id: 'x', source: 'plugin' })).toBe(false)
  })

  it('defaults: built-ins enabled, plugins disabled, until the user chooses', () => {
    const p = make()
    expect([p.isEnabled('files'), p.isEnabled('graph')]).toEqual([true, false])
    p.setEnabled('graph', true); p.setEnabled('files', false)
    expect([p.isEnabled('files'), p.isEnabled('graph')]).toEqual([false, true])
  })

  it('user order wins, then sort hints; stale ids are skipped', () => {
    const p = make()
    p.setOrder(['graph', 'gone', 'notes'])
    expect(p.orderedIds()).toEqual(['graph', 'notes', 'files'])
  })
})

describe('persistence', () => {
  it('survives a reload with a schemaVersion', () => {
    const storage = memory()
    const a = make(storage)
    a.setOrder(['notes', 'files']); a.setEnabled('graph', true); a.setDefault('notes')
    a.open('files', 'agent'); a.dismiss('notes')
    const saved = JSON.parse([...storage.data.values()][0]!)
    expect(saved.schemaVersion).toBe(1)
    const b = make(storage)
    expect(b.state).toEqual(a.state)
    expect(b.stateOf('files')).toBe('agent_opened')
    expect(b.open('notes', 'agent')).toBe(false)
    expect(b.state.defaultPanel).toBe('notes')
  })

  it.each([
    ['not json', '{'],
    ['wrong schemaVersion', JSON.stringify({ schemaVersion: 2, order: [], enabled: {}, dismissed: {}, openSource: {} })],
    ['bad dismissed value', JSON.stringify({ schemaVersion: 1, order: [], enabled: {}, dismissed: { files: false }, openSource: {} })],
    ['bad open source', JSON.stringify({ schemaVersion: 1, order: [], enabled: {}, dismissed: {}, openSource: { files: 'system' } })],
  ])('falls back to empty on %s, with a diagnostic', (_n, raw) => {
    const storage = memory()
    const probe = make(storage); probe.setEnabled('files', true)
    const key = [...storage.data.keys()][0]!
    storage.data.set(key, raw)
    const diagnostics: HostDiagnostic[] = []
    const p = make(storage, diagnostics)
    expect(p.state.order).toEqual([])
    expect(p.state.dismissed).toEqual({})
    expect(diagnostics).toHaveLength(1)
  })

  it('keeps working when storage throws', () => {
    const bad: LayoutStorage = { read: () => { throw new Error('x') }, write: () => { throw new Error('x') }, remove: () => {} }
    const diagnostics: HostDiagnostic[] = []
    const p = createPanelPrefs({ storage: bad, panels, diagnostic: e => diagnostics.push(e) })
    p.open('files', 'user')
    expect(p.stateOf('files')).toBe('user_opened')
    expect(diagnostics.map(d => d.reason)).toEqual(['panel-prefs-read-failed', 'panel-prefs-write-failed'])
  })

  it('notifies subscribers on change only', () => {
    const p = make()
    let n = 0
    const off = p.subscribe(() => { n++ })
    p.open('files', 'user'); p.open('files', 'agent'); p.clearDismissed(); p.clearDismissed('files')
    expect(n).toBe(2)
    off(); p.close('files')
    expect(n).toBe(2)
  })
})
