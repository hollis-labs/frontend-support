import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ArtifactCard } from '../cards/artifact-card'
import { DocumentCard } from '../cards/document-card'
import { PromptCard, type PromptCardProps } from '../cards/prompt-card'

function Prompt(props: Partial<PromptCardProps>) {
  const [value, setValue] = useState('')
  return <PromptCard questionId="answer" title="Which workspace?" value={value} onValueChange={setValue} onRespond={() => {}} {...props} />
}

describe('extracted card compositions', () => {
  it('uses a host download URL and dismissal without inventing app lifecycle', () => {
    const onDismiss = vi.fn(), onClick = vi.fn((event) => event.preventDefault())
    render(<ArtifactCard name="report.txt" meta="text/plain · 2 KB" download={{ href: '/test-download', filename: 'report.txt', onClick }} onDismiss={onDismiss} />)
    const link = screen.getByRole('link', { name: 'Download artifact' }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/test-download')
    expect(link.download).toBe('report.txt')
    fireEvent.click(link)
    expect(onClick).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('renders supplied document content and delegates navigation/actions', () => {
    const navigate = vi.fn(), download = vi.fn()
    render(<DocumentCard title="Notes" navigation={<button onClick={navigate}>Section one</button>} actions={<button onClick={download}>Download notes</button>}><p>Rendered by the host</p></DocumentCard>)
    expect(screen.getByText('Rendered by the host')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Section one' }))
    fireEvent.click(screen.getByRole('button', { name: 'Download notes' }))
    expect(navigate).toHaveBeenCalledOnce()
    expect(download).toHaveBeenCalledOnce()
  })

  it('submits one trimmed answer, guards IME, and does not invent a persisted state', async () => {
    const onRespond = vi.fn()
    render(<Prompt onRespond={onRespond} />)
    const input = screen.getByRole('textbox', { name: 'Response' })
    expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(input, { target: { value: '  project-a  ' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
    expect(onRespond).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRespond).toHaveBeenCalledWith({ status: 'submitted', answers: [{ questionId: 'answer', value: 'project-a' }] })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(false))
    expect(screen.queryByText('Submitted')).toBeNull()
  })

  it('locks while submitting, keeps the draft on failure, and allows retry', async () => {
    let reject!: (cause: Error) => void
    const onRespond = vi.fn(() => new Promise<void>((_, fail) => { reject = fail }))
    render(<Prompt onRespond={onRespond} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'project-a' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(input.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
    expect(onRespond).toHaveBeenCalledOnce()
    reject(new Error('Please retry'))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Please retry')
    expect(input.value).toBe('project-a')
    expect(input.disabled).toBe(false)
  })

  it('hydrates terminal state from props and locks unrecognized recorded statuses', () => {
    const { rerender } = render(<Prompt priorStatus="submitted" value="saved answer" />)
    expect(screen.getByText('Submitted')).toBeTruthy()
    expect(screen.getByText('saved answer')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull()
    rerender(<Prompt priorStatus="future-status" value="saved answer" />)
    expect(screen.getByText(/future-status/)).toBeTruthy()
    expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('reports decline as the existing canceled outcome', async () => {
    const onRespond = vi.fn()
    render(<Prompt onRespond={onRespond} />)
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
    expect(onRespond).toHaveBeenCalledWith({ status: 'canceled' })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Decline' }) as HTMLButtonElement).disabled).toBe(false))
  })
})
