import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ApprovalCard, ChoiceCard, FormCard, type CardOutcome } from '..'

const SAMPLE = ['sample', 'value'].join('-')

async function click(el: Element) {
  await act(async () => {
    fireEvent.click(el)
  })
}

describe('held decisions (CW-20261115-0031)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('ApprovalCard holds for undoMs, then responds once', async () => {
    const onRespond = vi.fn()
    render(<ApprovalCard title="t" risk="low" id="a1" undoMs={8000} onRespond={onRespond} />)
    await click(screen.getByRole('button', { name: 'Approve' }))
    expect(onRespond).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toBe('Approve will be sent. Undo to cancel.')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Undo' }))
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    // The live region's text is constant, so it is announced once, not every second.
    expect(screen.getByRole('status').textContent).toBe('Approve will be sent. Undo to cancel.')
    await act(async () => {
      vi.advanceTimersByTime(5999)
    })
    expect(onRespond).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(onRespond).toHaveBeenCalledTimes(1)
  })

  it('typing y or n in the note field does not decide', async () => {
    const onRespond = vi.fn()
    render(<ApprovalCard title="t" risk="low" shortcuts note onRespond={onRespond} />)
    const note = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.keyDown(note, { key: 'y' })
      fireEvent.keyDown(note, { key: 'n' })
    })
    expect(onRespond).not.toHaveBeenCalled()
  })

  it('adds no key handling when shortcuts is off', () => {
    const { container } = render(<ApprovalCard title="t" risk="low" onRespond={() => {}} />)
    expect(container.firstElementChild?.getAttribute('data-slot')).toBe('envelope')
  })

  it('Undo cancels the hold and restores the actions', async () => {
    const onRespond = vi.fn()
    render(<ApprovalCard title="t" risk="low" undoMs={8000} onRespond={onRespond} />)
    await click(screen.getByRole('button', { name: 'Approve' }))
    await click(screen.getByRole('button', { name: 'Undo' }))
    await act(async () => {
      vi.advanceTimersByTime(9000)
    })
    expect(onRespond).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy()
  })

  it('unmounting during the hold sends nothing', async () => {
    const onRespond = vi.fn()
    const { unmount } = render(<ApprovalCard title="t" risk="low" undoMs={5000} onRespond={onRespond} />)
    await click(screen.getByRole('button', { name: 'Approve' }))
    unmount()
    await act(async () => {
      vi.advanceTimersByTime(6000)
    })
    expect(onRespond).not.toHaveBeenCalled()
  })

  it('Y and N decide, Ctrl+Z undoes; keys are ignored without shortcuts', async () => {
    const onRespond = vi.fn()
    const { rerender } = render(<ApprovalCard title="t" risk="low" id="a1" onRespond={onRespond} />)
    const approve = screen.getByRole('button', { name: 'Approve' })
    await act(async () => {
      fireEvent.keyDown(approve, { key: 'y' })
    })
    expect(onRespond).not.toHaveBeenCalled()
    rerender(<ApprovalCard title="t" risk="low" id="a1" shortcuts undoMs={3000} onRespond={onRespond} />)
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('button', { name: 'Approve' }), { key: 'n' })
    })
    expect(screen.getByRole('status').textContent).toMatch(/Deny will be sent/)
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('button', { name: 'Undo' }), { key: 'z', ctrlKey: true })
    })
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    expect(onRespond).not.toHaveBeenCalled()
  })

  it('mediumRiskConfirm={false} makes medium one click', async () => {
    const onRespond = vi.fn()
    render(<ApprovalCard title="t" risk="medium" mediumRiskConfirm={false} onRespond={onRespond} />)
    await click(screen.getByRole('button', { name: 'Approve' }))
    expect(onRespond).toHaveBeenCalledTimes(1)
  })

  it('note, remember and recommended ride the outcome; a required note blocks', async () => {
    // Base UI's checkbox dispatches a PointerEvent, which jsdom lacks.
    vi.stubGlobal('PointerEvent', MouseEvent)
    const outcomes: CardOutcome[] = []
    render(
      <ApprovalCard
        title="t"
        risk="low"
        id="a1"
        note={{ required: true }}
        rememberChoice
        recommended="approve"
        fallbackHref="/approvals/a1"
        onRespond={(o) => {
          outcomes.push(o)
        }}
      />,
    )
    expect(screen.getByText('Recommended')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open in Approvals' }).getAttribute('href')).toBe('/approvals/a1')
    const approve = screen.getByRole('button', { name: /Approve/ }) as HTMLButtonElement
    expect(approve.disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' ok ' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Always in this chat' }))
    await click(approve)
    expect(outcomes).toEqual([
      { status: 'submitted', decisions: [{ itemId: 'a1', action: 'approve', note: 'ok' }], data: { remember: true } },
    ])
  })

  it('ChoiceCard: number keys pick, undoMs holds the answer', async () => {
    const options = [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }]
    const onValueChange = vi.fn()
    const onRespond = vi.fn()
    const { rerender } = render(
      <ChoiceCard questionId="q" title="Pick" options={options} shortcuts recommended="b" value={[]} onValueChange={onValueChange} onRespond={onRespond} />,
    )
    expect(screen.getByText('Recommended')).toBeTruthy()
    await act(async () => {
      fireEvent.keyDown(screen.getAllByRole('radio')[0], { key: '2' })
    })
    expect(onValueChange).toHaveBeenCalledWith(['b'])
    rerender(<ChoiceCard questionId="q" title="Pick" options={options} undoMs={2000} value={['b']} onValueChange={onValueChange} onRespond={onRespond} />)
    await click(screen.getByRole('button', { name: 'Submit' }))
    expect(onRespond).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(onRespond).toHaveBeenCalledTimes(1)
  })
})

describe('FormCard secret options (CW-20261115-0031)', () => {
  afterEach(cleanup)
  const schema = { type: 'object', required: ['token'], properties: { token: { type: 'string', title: 'Token', format: 'secret' } } }

  it('passes the idempotency key to storeSecret', async () => {
    const storeSecret = vi.fn(async () => 'ref-1')
    const onRespond = vi.fn()
    render(<FormCard title="t" schema={schema} storeSecret={storeSecret} idempotencyKey="k-1" onRespond={onRespond} />)
    fireEvent.change(screen.getByLabelText(/Token/), { target: { value: SAMPLE } })
    await click(screen.getByRole('button', { name: 'Submit' }))
    expect(storeSecret).toHaveBeenCalledWith('token', SAMPLE, { idempotencyKey: 'k-1' })
    expect(onRespond).toHaveBeenCalledWith({ status: 'submitted', data: { token: { ref: 'ref-1' } } })
  })

  it('shows a fingerprint with Replace, submits nothing for it, and never the value', async () => {
    const storeSecret = vi.fn(async () => 'ref-2')
    const onReplace = vi.fn()
    const onRespond = vi.fn()
    render(<FormCard title="t" schema={schema} storeSecret={storeSecret} secrets={{ token: { fingerprint: 'sha256:ab12', onReplace } }} onRespond={onRespond} />)
    expect(screen.getByText('sha256:ab12')).toBeTruthy()
    await click(screen.getByRole('button', { name: 'Submit' }))
    expect(storeSecret).not.toHaveBeenCalled()
    expect(onRespond).toHaveBeenCalledWith({ status: 'submitted', data: {} })
    await click(screen.getByRole('button', { name: 'Replace Token' }))
    expect(onReplace).toHaveBeenCalled()
    expect(screen.getByLabelText(/Token/)).toBeTruthy()
  })

  it('does not put a multiline or uploaded secret in the DOM, only its size', async () => {
    const storeSecret = vi.fn(async () => 'r')
    const { container } = render(<FormCard title="t" schema={schema} storeSecret={storeSecret} secrets={{ token: { multiline: true, allowFile: true } }} onRespond={() => {}} />)
    const box = screen.getByPlaceholderText('Paste the value')
    fireEvent.change(box, { target: { value: SAMPLE } })
    expect(screen.getByText(`${SAMPLE.length} bytes entered`)).toBeTruthy()
    expect(container.innerHTML).not.toContain(SAMPLE)
    await click(screen.getByRole('button', { name: 'Submit' }))
    expect(storeSecret).toHaveBeenCalledWith('token', SAMPLE, undefined)
  })

  it('does not reflect a typed single-line secret as a value attribute', () => {
    const { container } = render(<FormCard title="t" schema={schema} storeSecret={async () => 'r'} onRespond={() => {}} />)
    fireEvent.change(screen.getByLabelText(/Token/), { target: { value: SAMPLE } })
    expect(container.innerHTML).not.toContain(SAMPLE)
  })

  it('names Replace after its field', () => {
    render(<FormCard title="t" schema={schema} storeSecret={async () => 'r'} secrets={{ token: { fingerprint: 'sha256:ab12' } }} onRespond={() => {}} />)
    expect(screen.getByRole('button', { name: 'Replace Token' })).toBeTruthy()
  })

  it('says so when a file cannot be read, instead of rejecting unhandled', async () => {
    const read = vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) {
      queueMicrotask(() => this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>))
    })
    render(<FormCard title="t" schema={schema} storeSecret={async () => 'r'} secrets={{ token: { allowFile: true } }} onRespond={() => {}} />)
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Token: upload file'), { target: { files: [new File(['x'], 'a.pem')] } })
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(screen.getAllByText(/could not be read/).length).toBeGreaterThan(0)
    read.mockRestore()
  })

  it('rejects an over-limit typed value with a clear message', async () => {
    const storeSecret = vi.fn(async () => 'r')
    render(<FormCard title="t" schema={schema} storeSecret={storeSecret} secrets={{ token: { maxBytes: 4 } }} onRespond={() => {}} />)
    fireEvent.change(screen.getByLabelText(/Token/), { target: { value: 'abcdef' } })
    await click(screen.getByRole('button', { name: 'Submit' }))
    expect(storeSecret).not.toHaveBeenCalled()
    expect(screen.getAllByText(/4-byte limit/).length).toBeGreaterThan(0)
  })

  it('reads a file into the field and refuses one over the limit', async () => {
    const storeSecret = vi.fn(async () => 'r')
    render(<FormCard title="t" schema={schema} storeSecret={storeSecret} secrets={{ token: { allowFile: true, maxBytes: 10 } }} onRespond={() => {}} />)
    const input = screen.getByLabelText('Token: upload file') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['x'.repeat(50)], 'big.pem')] } })
    })
    expect(screen.getAllByText(/10-byte limit/).length).toBeGreaterThan(0)
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['small'], 'ok.pem')] } })
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    await click(screen.getByRole('button', { name: 'Submit' }))
    expect(storeSecret).toHaveBeenCalledWith('token', 'small', undefined)
  })
})
