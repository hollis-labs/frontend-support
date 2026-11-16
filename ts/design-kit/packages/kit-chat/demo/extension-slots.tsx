import { useLayoutEffect, useRef, useState } from 'react'
import {
  ChatComposer, ChatContextChips, ChatDrawerToggles, ChatNotice,
  ChatSharedItemsStrip, ChatSlotPicker, ChatStepsFold, ChatStream,
  type ChatComposerEditorProps, type ChatItem,
} from '@hollis-labs/kit-chat'

/** Tiny contenteditable adapter: the host decides how rich markup flattens to text. */
function RichEditor({ value, onValueChange, onSubmit, placeholder, disabled, busy, 'aria-label': ariaLabel }: ChatComposerEditorProps) {
  const editor = useRef<HTMLDivElement>(null)
  const composing = useRef(false)
  useLayoutEffect(() => {
    if (editor.current && editor.current.textContent !== value) editor.current.textContent = value
  }, [value])
  return <div className="rounded-control border border-border p-2">
    <div
      ref={editor}
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline="true"
      contentEditable={!disabled}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={(event) => onValueChange(event.currentTarget.textContent ?? '')}
      onCompositionStart={() => { composing.current = true }}
      onCompositionEnd={() => { composing.current = false }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey && !composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229) {
          event.preventDefault()
          onSubmit()
        }
      }}
    />
    <button type="button" disabled={disabled || busy || !value.trim()} onClick={onSubmit}>Send rich text</button>
  </div>
}

const initial: ChatItem[] = [
  { kind: 'message', id: 'm1', role: 'assistant', content: 'A normal message keeps the kit renderer.' },
  { kind: 'marker', id: 'notice', variant: 'compaction', label: 'Context compacted' },
  { kind: 'card', id: 'steps', wireKind: 'app.steps', content: <ChatStepsFold steps={[{ id: 's1', content: 'Loaded workspace' }, { id: 's2', content: 'Checked files' }]} /> },
]

/** Host fixture: local state only, no transport or app adoption. */
export function ExtensionSlotsDemo() {
  const [items, setItems] = useState(initial)
  const [slot, setSlot] = useState('work')
  const [drawer, setDrawer] = useState(false)
  const [rich, setRich] = useState(false)
  return <main className="mx-auto max-w-3xl space-y-4 p-4">
    <ChatStream items={items} renderers={{ marker: (item) => <ChatNotice>{item.label}</ChatNotice> }} />
    <button type="button" onClick={() => setRich((value) => !value)}>Use {rich ? 'plain' : 'rich'} editor</button>
    <ChatComposer
      key={rich ? 'rich' : 'plain'}
      onSubmit={(text) => { setItems((previous) => [...previous, { kind: 'message', id: `m${previous.length}`, role: 'user', content: text }]) }}
      above={<div className="space-y-2"><ChatContextChips chips={[{ id: 'window', label: 'Focused window', removeLabel: 'Remove focused window' }]} /><ChatSharedItemsStrip items={[{ id: 'doc', label: 'Shared document', removeLabel: 'Remove shared document' }]} /></div>}
      toolbarStart={<ChatDrawerToggles drawers={[{ id: 'workspace', label: 'Workspace', open: drawer, onToggle: (_, open) => setDrawer(open) }]} />}
      footer={<ChatSlotPicker options={[{ id: 'work', label: 'Work' }, { id: 'personal', label: 'Personal' }]} value={slot} onChange={setSlot} />}
      renderEditor={rich ? (props) => <RichEditor {...props} /> : undefined}
    />
  </main>
}
