import { createRoot } from 'react-dom/client'
import { AdminShell } from '@hollis-labs/kit-admin'
import { fixtureSettings, nowMs, tachyon } from './fixtures'
import './demo.css'
// Separate root-only consumer: no /charts import or observation renderer.
createRoot(document.getElementById('root')!).render(<AdminShell contextKey="settings-only" discovery={{ phase: 'ready', contextKey: 'settings-only', manifest: tachyon }} selection={{ page: 'settings', groupId: tachyon.settings[0].id }} destination={target => ({ href: `?page=${target.page}` })} settings={fixtureSettings(tachyon)} nowMs={nowMs} />)
