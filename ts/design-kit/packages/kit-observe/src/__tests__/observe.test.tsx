import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { DiagnosticPanel, HealthSummary, ObservationStatus, StatCollection, type ObservationState } from '../index'
import { SampleSeriesView } from '../charts'

// Exercise the wrapper contract without requiring layout in jsdom. Actual chart
// geometry is checked in the browser and in its dashboard owner prerequisite.
const chart = vi.hoisted(() => vi.fn())
vi.mock('@hollis-labs/kit-dashboard/charts', () => ({ TimestampSampleChart: (props: unknown) => { chart(props); return <div>Shared chart</div> } }))
afterEach(() => { cleanup(); chart.mockClear() })
const observation: ObservationState = { phase: 'ready', observedAt: '2026-10-02T00:00:00Z', nowMs: Date.parse('2026-10-02T00:00:30Z'), staleAfterMs: 45000 }

describe('ObservationStatus', () => {
  it('hides values on initial load, then retains the same value through refresh and failure', () => {
    const view = render(<ObservationStatus label="Health" observation={{ ...observation, phase: 'loading', observedAt: undefined }}><span>Retained value</span></ObservationStatus>)
    expect(view.queryByText('Retained value')).toBeNull()
    expect(view.getByRole('status').textContent).toContain('Loading')
    view.rerender(<ObservationStatus label="Health" observation={observation}><span>Retained value</span></ObservationStatus>)
    const value = view.getByText('Retained value')
    view.rerender(<ObservationStatus label="Health" observation={{ ...observation, phase: 'loading' }}><span>Retained value</span></ObservationStatus>)
    expect(value.isConnected).toBe(true)
    expect(view.getByRole('status').textContent).toContain('Refreshing')
    view.rerender(<ObservationStatus label="Health" observation={{ ...observation, phase: 'error', error: 'Timed out' }}><span>Retained value</span></ObservationStatus>)
    expect(value.isConnected).toBe(true)
    expect(view.getByRole('alert').textContent).toContain('Timed out')
    expect(view.getByRole('region').textContent).toContain(observation.observedAt)
    expect(view.getByRole('status').textContent).not.toContain(observation.observedAt)
  })
  it('first failure is unavailable, never a successful empty value, and retry is host-owned', () => {
    const onRetry = vi.fn()
    const view = render(<ObservationStatus label="Stats" observation={{ ...observation, phase: 'error', observedAt: undefined, error: 'Unavailable', onRetry }}>0</ObservationStatus>)
    expect(view.queryByText('0')).toBeNull()
    expect(view.getByRole('alert').textContent).toContain('Observation unavailable')
    fireEvent.click(view.getByRole('button', { name: 'Retry Stats' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
  it('uses the last successful observation for age and preserves it across failed refreshes', () => {
    const view = render(<ObservationStatus label="Stats" observation={{ ...observation, nowMs: observation.nowMs + 60000, phase: 'error', error: 'Failed refresh' }}>12</ObservationStatus>)
    expect(view.getByRole('status').textContent).toContain('Stale')
    expect(view.getByRole('region').textContent).toContain('90s ago')
    expect(view.getByRole('status').textContent).not.toContain('90s ago')
    expect(view.getByText('12')).toBeTruthy()
  })
  it.each(['not-a-time', '2026-10-03T00:00:00Z'])('does not call an invalid/future observation fresh: %s', observedAt => {
    const view = render(<ObservationStatus label="Clock" observation={{ ...observation, observedAt }}>Retained data</ObservationStatus>)
    expect(view.getByRole('status').textContent).toContain('Observation time unavailable')
    expect(view.getByText('Retained data')).toBeTruthy()
  })
  it('unsupported resources suppress supplied values and retry actions', () => {
    const view = render(<ObservationStatus label="Series" observation={{ ...observation, supported: false, onRetry: vi.fn() }}>Fabricated history</ObservationStatus>)
    expect(view.queryByText('Fabricated history')).toBeNull()
    expect(view.getByRole('status').textContent).toContain('Unsupported')
    expect(view.queryByRole('button')).toBeNull()
  })
  it('labels paused evidence', () => {
    const view = render(<ObservationStatus label="Health" observation={{ ...observation, paused: true }}>data</ObservationStatus>)
    expect(view.getByRole('status').textContent).toContain('Paused')
  })
})

describe('HealthSummary', () => {
  it('unknown never falls back to healthy', () => {
    const view = render(<HealthSummary label="Health" status="unknown" checks={[{ id: 'workload', label: 'Workload', status: 'unknown' }]} observation={observation} />)
    expect(view.getAllByText('unknown')).toHaveLength(2)
    expect(view.queryByText('healthy')).toBeNull()
  })
  it('unfamiliar runtime status remains unknown', () => {
    const view = render(<HealthSummary label="Health" status={'future-state' as 'unknown'} checks={[]} observation={observation} />)
    expect(view.getByText('unknown')).toBeTruthy()
    expect(view.queryByText('healthy')).toBeNull()
  })
  it('returned unhealthy is evidence; a failed first fetch has no health result', () => {
    const view = render(<HealthSummary label="Health" status="unhealthy" checks={[]} observation={observation} />)
    expect(view.getByText('unhealthy')).toBeTruthy()
    expect(view.queryByRole('alert')).toBeNull()
    view.rerender(<HealthSummary label="Health" status="healthy" checks={[]} observation={{ ...observation, phase: 'error', observedAt: undefined }} />)
    expect(view.queryByText('healthy')).toBeNull()
    expect(view.getByRole('alert')).toBeTruthy()
  })
})

describe('StatCollection', () => {
  it('separates real zero, known missing and pending while preserving per-resource state', () => {
    const view = render(<StatCollection label="Stats" rows={[
      { id: 'zero', label: 'Zero', value: 0, unit: 'count', kind: 'counter', observation },
      { id: 'missing', label: 'Missing', value: null, unit: 'ratio', kind: 'gauge', observation },
      { id: 'pending', label: 'Pending', value: 0, unit: 'percent', kind: 'gauge', observation: { ...observation, phase: 'loading', observedAt: undefined } },
    ]} />)
    expect(within(view.getByRole('region', { name: 'Zero' })).getByText('0')).toBeTruthy()
    expect(within(view.getByRole('region', { name: 'Zero' })).getByText('count · cumulative counter')).toBeTruthy()
    expect(within(view.getByRole('region', { name: 'Missing' })).getByText('Missing sample')).toBeTruthy()
    expect(within(view.getByRole('region', { name: 'Pending' })).queryByText('0')).toBeNull()
  })
})

describe('DiagnosticPanel', () => {
  it('renders nested bounded values as text, names its region and keeps inline schema inspectable', () => {
    const view = render(<DiagnosticPanel label="Diagnostic" data={{ rows: ['<b>plain</b>', null] }} schema={{ type: 'object' }} validation={{ state: 'valid' }} observation={observation} />)
    expect(view.getByRole('region', { name: 'Diagnostic data' }).textContent).toContain('<b>plain</b>')
    expect(view.container.querySelector('b')).toBeNull()
    expect(view.getByRole('button', { name: 'Copy Diagnostic data' })).toBeTruthy()
    expect(view.getByText('Diagnostic inline schema')).toBeTruthy()
  })
  it.each(['invalid', 'unsupported'] as const)('shows host %s validation and withholds unchecked data', state => {
    const view = render(<DiagnosticPanel label="Diagnostic" data={{ secret: 'Do not show' }} schema={{ $ref: 'https://example.invalid/schema' }} validation={{ state, messages: ['Host explanation'] }} observation={observation} />)
    expect(view.getByRole('alert').textContent).toContain('Host explanation')
    expect(view.queryByRole('region', { name: 'Diagnostic data' })).toBeNull()
    expect(view.queryByText('Do not show')).toBeNull()
  })
})

describe('SampleSeriesView', () => {
  const props = { label: 'Series', unit: 'count' as const, kind: 'counter' as const,
    requested: { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z', limit: 4 },
    bounds: { maxPoints: 240, maxWindowSeconds: 86400 }, observation }
  it('only adapts field names for the shared chart, preserving null/zero/counter values', () => {
    const points = [{ at: '2026-10-01T00:00:00Z', value: 0 }, { at: '2026-10-01T01:00:00Z', value: null }]
    const view = render(<SampleSeriesView {...props} points={points} truncated />)
    expect(chart.mock.calls.at(-1)?.[0]).toMatchObject({ points: points.map(point => ({ t: point.at, value: point.value })), unit: 'count', kind: 'counter' })
    expect(view.getByRole('alert').textContent).toContain('truncated')
    expect(view.getByText(/received 2 samples/)).toBeTruthy()
  })
  it('successful empty range is distinct from first request failure', () => {
    const view = render(<SampleSeriesView {...props} points={[]} truncated={false} />)
    expect(view.getByText('No samples in requested range')).toBeTruthy()
    view.rerender(<SampleSeriesView {...props} points={[]} truncated={false} observation={{ ...observation, phase: 'error', observedAt: undefined }} />)
    expect(view.queryByText('No samples in requested range')).toBeNull()
    expect(view.queryByText('Shared chart')).toBeNull()
  })
})
