import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setMode } from '@hollis-labs/design-tokens'
import './demo.css'
import { CASES } from '../fixtures/cases'
import { Gallery } from './gallery'

const params = new URLSearchParams(window.location.search)
setMode(params.get('mode') === 'light' ? 'light' : 'dark')

/* The Playwright matrix reads the case list from the page so it cannot drift from the fixtures. */
;(window as unknown as { __CASE_IDS__: string[] }).__CASE_IDS__ = CASES.map((c) => c.id)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gallery caseId={params.get('case')} />
  </StrictMode>,
)
