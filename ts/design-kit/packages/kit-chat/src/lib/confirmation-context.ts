import { createContext, useContext } from 'react'
import type { PriorResponseState } from './response'

/** Internal only: ConfirmationCard remains the sole response/lock owner. */
export const ConfirmationCardContext = createContext<{ state: PriorResponseState; priorActionId?: string | null } | null>(null)
export function useConfirmationCard() {
  const context = useContext(ConfirmationCardContext)
  if (!context) throw new Error('Confirmation components must be used within ConfirmationCard')
  return context
}
