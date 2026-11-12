import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { TimestampSampleChart } from '../charts'

const points = [
  { t: '2026-10-01T00:00:00Z', value: 2 },
  { t: '2026-10-01T01:00:00Z', value: null },
  { t: '2026-10-01T02:00:00Z', value: 0 },
  { t: '2026-10-01T03:00:00Z', value: 4 },
]

describe('TimestampSampleChart text alternative', () => {
  it('keeps every exact timestamp, null gap and zero in a named table', () => {
    const view = render(<TimestampSampleChart points={points} label="Duration" unit="milliseconds" kind="gauge" />)
    expect(view.getByRole('figure', { name: 'Duration — milliseconds, gauge' })).toBeTruthy()
    const rows = view.getAllByRole('row').slice(1)
    expect(rows.map(row => row.textContent)).toEqual(points.map(point => point.t + (point.value === null ? 'No sample' : point.value)))
    expect(view.getByRole('table', { name: 'Duration samples in UTC; values in milliseconds' })).toBeTruthy()
  })
  it('does not derive rates or hide a counter reset', () => {
    const view = render(<TimestampSampleChart points={points} label="Executions" unit="count" kind="counter" />)
    expect(view.getByText('Executions — count, cumulative counter')).toBeTruthy()
    expect(view.getAllByRole('row')[3].textContent).toContain('0')
  })
  it('distinguishes no samples from known missing samples', () => {
    const view = render(<TimestampSampleChart points={[]} label="Duration" unit="seconds" kind="gauge" />)
    expect(view.getByText('No samples')).toBeTruthy()
    expect(view.queryByText('No sample')).toBeNull()
    view.rerender(<TimestampSampleChart points={[points[1]]} label="Duration" unit="seconds" kind="gauge" />)
    expect(view.queryByText('No samples')).toBeNull()
    expect(view.getByText('No sample')).toBeTruthy()
  })
})
