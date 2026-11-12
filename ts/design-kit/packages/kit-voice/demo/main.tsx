import { createRoot } from 'react-dom/client'
import { setMode, setTheme } from '@hollis-labs/design-tokens'
import { App } from './App'
import './demo.css'

// ?theme=sysop-p4-white&mode=light selects a theme for review; no query keeps index.html's.
const query = new URLSearchParams(location.search)
const theme = query.get('theme')
const mode = query.get('mode')
if (theme) setTheme(theme)
if (mode === 'light' || mode === 'dark') setMode(mode)

createRoot(document.getElementById('root')!).render(<App />)
