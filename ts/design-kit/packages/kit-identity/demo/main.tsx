import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { IdentityProvider } from '../src/client'
import { IdentityGate } from '../src'
import { Shell } from './shell'
import './demo.css'

// ?theme=light switches the token set's light mode.
document.documentElement.classList.toggle('light', new URLSearchParams(location.search).get('theme') === 'light')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IdentityProvider>
      <IdentityGate story={<span className="text-control font-semibold text-fg">Demo app</span>}><Shell /></IdentityGate>
    </IdentityProvider>
  </StrictMode>,
)
