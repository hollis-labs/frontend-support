import { getAttachmentLabel, getMediaCategory } from '../lib/attachment'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { Attachment, AttachmentEmpty, AttachmentInfo, AttachmentPreview, AttachmentRemove, Attachments } from '../components/attachments'
import { AttachmentDropzone, PromptInputActionAddAttachments } from '../components/attachment-dropzone'

afterEach(cleanup)

describe('host-owned attachment presentation', () => {
  it('renders file previews and metadata without owning removal or URL lifetime', () => {
    const onRemove = vi.fn(), parentClick = vi.fn()
    const { rerender } = render(<Attachments variant="list" onClick={parentClick}>
      <Attachment data={{ id: 'image', type: 'file', filename: 'photo.png', mediaType: 'image/png', url: 'blob:host-preview' }} onRemove={onRemove}>
        <AttachmentPreview /><AttachmentInfo showMediaType /><AttachmentRemove label="Remove photo" />
      </Attachment>
    </Attachments>)
    expect(screen.getByRole('img', { name: 'photo.png' }).getAttribute('src')).toBe('blob:host-preview')
    expect(screen.getByText('image/png')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }))
    expect(onRemove).toHaveBeenCalledOnce(); expect(parentClick).not.toHaveBeenCalled()
    expect(screen.getByRole('img')).toBeTruthy()
    rerender(<Attachments><AttachmentEmpty /></Attachments>)
    expect(screen.queryByRole('img')).toBeNull()
  })
  it('shows source labels, fallbacks and no remove action when host supplies none', () => {
    const data = { id: 'source', type: 'source-document' as const, title: 'Release notes' }
    render(<Attachments variant="inline"><Attachment data={data}>
      <AttachmentPreview fallbackIcon={<span>Document</span>} /><AttachmentInfo /><AttachmentRemove />
    </Attachment></Attachments>)
    expect(getMediaCategory(data)).toBe('source')
    expect(screen.getByRole('group', { name: 'Release notes' })).toBeTruthy()
    expect(screen.getByText('Release notes')).toBeTruthy()
    expect(screen.getByText('Document')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(getMediaCategory({ id: 'a', type: 'file', mediaType: 'audio/wav' })).toBe('audio')
    expect(getMediaCategory({ id: 'x', type: 'file' })).toBe('unknown')
    expect(getAttachmentLabel({ id: 'x', type: 'file' })).toBe('Attachment')
  })
  it('honors remove cancellation and disabled actions', () => {
    const remove = vi.fn()
    const { rerender } = render(<Attachment data={{ id: 'x', type: 'file' }} onRemove={remove}>
      <AttachmentRemove onClick={event => event.preventDefault()} />
    </Attachment>)
    fireEvent.click(screen.getByRole('button')); expect(remove).not.toHaveBeenCalled()
    rerender(<Attachment data={{ id: 'x', type: 'file' }} onRemove={remove}><AttachmentRemove disabled /></Attachment>)
    fireEvent.click(screen.getByRole('button')); expect(remove).not.toHaveBeenCalled()
  })
})

describe('local picker and drop target', () => {
  const file = (name: string, type = 'text/plain', size = 1) => new File(['x'.repeat(size)], name, { type })
  it('emits accepted browser files and each rejected reason, with no internal list', () => {
    const select = vi.fn(), reject = vi.fn()
    render(<AttachmentDropzone onFilesSelect={select} onFilesReject={reject} accept=".txt,image/*"
      maxFiles={2} attachmentCount={1} maxFileSize={3}>
      <PromptInputActionAddAttachments />
    </AttachmentDropzone>)
    const good = file('GOOD.TXT'), wrong = file('video.webm', 'video/webm'), large = file('large.txt', 'text/plain', 4), excess = file('next.png', 'image/png')
    const input = screen.getByLabelText('Choose attachments')
    fireEvent.change(input, { target: { files: [good, wrong, large, excess] } })
    expect(select).toHaveBeenCalledWith([good])
    expect(reject).toHaveBeenCalledWith([{ file: wrong, code: 'accept' }, { file: large, code: 'max_file_size' }, { file: excess, code: 'max_files' }])
    expect((input as HTMLInputElement).value).toBe('')
    expect(screen.queryByText('GOOD.TXT')).toBeNull()
  })
  it('opens native picker; cancelled chooser and text drops leave the host alone', () => {
    const select = vi.fn()
    render(<AttachmentDropzone data-testid="zone" onFilesSelect={select}><PromptInputActionAddAttachments /></AttachmentDropzone>)
    const input = screen.getByLabelText('Choose attachments'), click = vi.spyOn(input, 'click')
    fireEvent.click(screen.getByRole('button', { name: 'Add photos or files' }))
    expect(click).toHaveBeenCalledOnce()
    fireEvent.change(input, { target: { files: [] } })
    fireEvent.drop(screen.getByTestId('zone'), { dataTransfer: { files: [], types: ['text/plain'] } })
    expect(select).not.toHaveBeenCalled()
  })
  it('handles file dragging/drop locally and respects host cancellation', () => {
    const select = vi.fn(), onDrop = vi.fn(event => event.preventDefault())
    const { rerender } = render(<AttachmentDropzone data-testid="zone" onFilesSelect={select} />)
    const zone = screen.getByTestId('zone'), item = file('note.txt'), transfer = { files: [item], types: ['Files'] }
    fireEvent.dragOver(zone, { dataTransfer: transfer })
    expect(zone.hasAttribute('data-dragging')).toBe(true)
    fireEvent.drop(zone, { dataTransfer: transfer })
    expect(select).toHaveBeenCalledWith([item]); expect(zone.hasAttribute('data-dragging')).toBe(false)
    select.mockClear()
    rerender(<AttachmentDropzone data-testid="zone" onFilesSelect={select} onDrop={onDrop} />)
    fireEvent.drop(zone, { dataTransfer: transfer }); expect(select).not.toHaveBeenCalled()
  })
  it('disabled target and zero capacity reject intake; single picker reports extras', () => {
    const select = vi.fn(), reject = vi.fn(), incoming = [file('a.txt'), file('b.txt')]
    const { rerender } = render(<AttachmentDropzone data-testid="zone" onFilesSelect={select} disabled><PromptInputActionAddAttachments /></AttachmentDropzone>)
    const drop = createEvent.drop(screen.getByTestId('zone'), { dataTransfer: { files: incoming } })
    fireEvent(screen.getByTestId('zone'), drop)
    expect(drop.defaultPrevented).toBe(true)
    expect(select).not.toHaveBeenCalled(); expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
    rerender(<AttachmentDropzone onFilesSelect={select} onFilesReject={reject} maxFiles={0} />)
    fireEvent.change(screen.getByLabelText('Choose attachments'), { target: { files: incoming } })
    expect(select).not.toHaveBeenCalled(); expect(reject.mock.calls[0][0].map((r: { code: string }) => r.code)).toEqual(['max_files', 'max_files'])
    rerender(<AttachmentDropzone onFilesSelect={select} onFilesReject={reject} multiple={false} />)
    fireEvent.change(screen.getByLabelText('Choose attachments'), { target: { files: incoming } })
    expect(select).toHaveBeenCalledWith([incoming[0]])
  })
})
