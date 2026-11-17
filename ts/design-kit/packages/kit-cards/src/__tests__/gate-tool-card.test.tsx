import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import fixtures from '../../fixtures/shared-resultenv/fixtures.json'
import { GateToolCard } from '../cards/gate-tool-card'
import type { ResultenvEnvelope } from '../cards/resultenv.generated'

const common = { toolName: 'fixture-tool', envelope: fixtures[0].envelope as ResultenvEnvelope }

describe('GateToolCard', () => {
  it('keeps the existing result card when the integration is off', () => {
    const { container } = render(<GateToolCard {...common} />)
    expect(container.querySelector('[data-slot="tool-card"]')).toBeTruthy()
    expect(container.querySelector('[data-slot="gate-tool-card"]')).toBeNull()
  })

  it('shows separate operation, decision, delivery and execution refs', () => {
    render(<GateToolCard {...common} gate={{
      preparedOperationRef: 'sha256:local-invocation-v2:operation-1',
      decisionRef: 'decision-1',
      deliveryReceiptRef: 'delivery-1',
      executionReceiptRef: 'execution-1',
    }} />)
    const refs = screen.getByRole('complementary', { name: 'Gatecrasher references' })
    expect(refs.textContent).toContain('sha256:local-invocation-v2:operation-1')
    expect(refs.textContent).toContain('Decision: decision-1')
    expect(refs.textContent).toContain('Delivery receipt: delivery-1')
    expect(refs.textContent).toContain('Execution receipt: execution-1')
  })
})
