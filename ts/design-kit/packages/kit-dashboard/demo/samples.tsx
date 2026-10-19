import { createRoot } from 'react-dom/client'
import { TimestampSampleChart, TimeSeriesChart } from '../src/charts'
import './demo.css'

const points = [
  { t: '2026-10-01T00:00:00Z', value: 2 },
  { t: '2026-10-01T01:00:00Z', value: 4 },
  { t: '2026-10-01T02:00:00Z', value: null },
  { t: '2026-10-01T03:00:00Z', value: 0 },
  { t: '2026-10-01T04:00:00Z', value: 3 },
]
const events = [{ at: '2026-10-01T00:00:00Z', value: 2 }, { at: '2026-10-01T01:00:00Z', value: 4 }]
const series = [{ key: 'events', label: 'Events', color: 'var(--color-primary)', value: (item: typeof events[number]) => item.value }]
createRoot(document.getElementById('root')!).render(
  <main className="h-full overflow-auto bg-surface p-4 text-fg">
    <h1 className="mb-4 text-control font-semibold">Timestamp samples — controlled fixture</h1>
    <section data-testid="samples" className="mb-4 rounded border border-border-subtle bg-surface p-4">
      <TimestampSampleChart label="Execution duration" points={points} unit="milliseconds" kind="gauge" />
    </section>
    <section data-testid="counter" className="mb-4 rounded border border-border-subtle bg-surface p-4">
      <TimestampSampleChart label="Executions" points={points} unit="count" kind="counter" />
    </section>
    <section data-testid="legacy-bar" className="mb-4">
      <TimeSeriesChart title="Existing day sums" items={events} date={item => item.at} series={series} days={3} />
    </section>
    <section data-testid="legacy-area">
      <TimeSeriesChart title="Existing day sums" kind="area" items={events} date={item => item.at} series={series} days={3} />
    </section>
  </main>,
)
