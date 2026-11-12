import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChainOfThought, ChainOfThoughtContent, ChainOfThoughtHeader, ChainOfThoughtSearchResult, ChainOfThoughtSearchResults, ChainOfThoughtStep } from '../components/chain-of-thought'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '../components/reasoning'
import { Source, Sources, SourcesContent, SourcesTrigger } from '../components/sources'
import { Plan, PlanAction, PlanContent, PlanDescription, PlanFooter, PlanHeader, PlanTitle, PlanTrigger } from '../components/plan'

afterEach(() => { cleanup(); vi.useRealTimers() })
describe('chat disclosures', () => {
  it('connects chain header and panel with controlled host selection', async () => {
    const changed = vi.fn()
    const fixture = (open: boolean) => <ChainOfThought open={open} onOpenChange={changed}><ChainOfThoughtHeader /><ChainOfThoughtContent><ChainOfThoughtStep label="Search complete" status="complete"><ChainOfThoughtSearchResults><ChainOfThoughtSearchResult>Guide</ChainOfThoughtSearchResult></ChainOfThoughtSearchResults></ChainOfThoughtStep></ChainOfThoughtContent></ChainOfThought>
    const view = render(fixture(false))
    const trigger = screen.getByRole('button', { name: 'Chain of Thought' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger)
    expect(changed).toHaveBeenCalledWith(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    view.rerender(fixture(true))
    await waitFor(() => expect(screen.getByText('Search complete')).toBeTruthy())
    expect(trigger.getAttribute('aria-controls')).toBeTruthy()
    expect(document.getElementById(trigger.getAttribute('aria-controls')!)!.contains(screen.getByText('Search complete'))).toBe(true)
  })
  it('opens streaming reasoning, honors explicit collapse, closes once and renders supplied content', async () => {
    vi.useFakeTimers()
    const fixture = (streaming: boolean, defaultOpen?: boolean) => <Reasoning isStreaming={streaming} defaultOpen={defaultOpen} duration={3}><ReasoningTrigger /><ReasoningContent><em>Host-rendered reasoning</em></ReasoningContent></Reasoning>
    const view = render(fixture(true))
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Host-rendered reasoning').tagName).toBe('EM')
    view.rerender(fixture(false))
    expect(screen.getByRole('button').textContent).toContain('3 seconds')
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(screen.getByRole('button'))
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
    view.unmount()
    render(fixture(true, false))
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })
  it('user collapse during streaming stays collapsed', async () => {
    vi.useFakeTimers()
    const fixture = (streaming: boolean) => <Reasoning isStreaming={streaming}><ReasoningTrigger /><ReasoningContent>Streaming details</ReasoningContent></Reasoning>
    const view = render(fixture(true))
    const trigger = screen.getByRole('button')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    view.rerender(fixture(false))
    view.rerender(fixture(true))
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })
  it('keeps controlled reasoning closed until the host accepts automatic opening', () => {
    const changed = vi.fn()
    render(<Reasoning isStreaming open={false} onOpenChange={changed}><ReasoningTrigger /><ReasoningContent>Details</ReasoningContent></Reasoning>)
    expect(changed).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })
  it('requests automatic opening once per streaming run when a controlled host declines', () => {
    const changed = vi.fn()
    const fixture = (streaming: boolean, defaultOpen?: boolean) => <Reasoning isStreaming={streaming} open={false} defaultOpen={defaultOpen} onOpenChange={changed}><ReasoningTrigger /><ReasoningContent>Details</ReasoningContent></Reasoning>
    const view = render(fixture(true))
    expect(changed).toHaveBeenCalledTimes(1)
    view.rerender(fixture(true, true))
    expect(changed).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
    view.rerender(fixture(false, true))
    view.rerender(fixture(true, true))
    expect(changed).toHaveBeenCalledTimes(2)
  })
  it('allows linked and non-linked provenance without inventing destinations', () => {
    render(<Sources defaultOpen><SourcesTrigger count={2} /><SourcesContent><Source href="https://example.com/guide" title="Guide" /><Source data-testid="tool-source"><span>Tool call evidence</span></Source></SourcesContent></Sources>)
    expect(screen.getByRole('link', { name: 'Guide' }).getAttribute('target')).toBe('_blank')
    expect(screen.getByTestId('tool-source').tagName).toBe('SPAN')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Used 2 sources' })).toBeTruthy()
  })
  it('renders a plan through Base UI Card/Panel/Button render slots and leaves footer actions to the host', async () => {
    const action = vi.fn()
    render(<Plan defaultOpen isStreaming><PlanHeader><PlanTitle>Release plan</PlanTitle><PlanDescription>Draft details</PlanDescription><PlanAction><PlanTrigger /></PlanAction></PlanHeader><PlanContent>Steps</PlanContent><PlanFooter><button onClick={action}>Run later</button></PlanFooter></Plan>)
    const toggle = screen.getByRole('button', { name: 'Toggle plan' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Draft details').tagName).toBe('SPAN')
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('false'))
    fireEvent.click(screen.getByRole('button', { name: 'Run later' }))
    expect(action).toHaveBeenCalledOnce()
  })
})
