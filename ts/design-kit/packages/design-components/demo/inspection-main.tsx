import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { InspectionExample } from './InspectionExample'

createRoot(document.getElementById('root')!).render(<StrictMode><InspectionExample /></StrictMode>)
