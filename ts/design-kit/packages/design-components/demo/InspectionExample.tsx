import { useRef, useState } from 'react'
import { Button, Dialog, DialogContent, DialogTitle, InspectionDialog } from '@hollis-labs/design-components'
import './demo.css'

export function InspectionExample() {
  const [open, setOpen] = useState(false)
  const [child, setChild] = useState(false)
  const [mode, setMode] = useState('long')
  const [keys, setKeys] = useState('Ready')
  const title = useRef<HTMLHeadingElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  return <main className="min-h-screen bg-bg p-4 font-sans text-fg">
    <h1 className="mb-4 text-lg font-semibold">Arbitrary content inspection</h1>
    <label>Content <select aria-label="Content" value={mode} onChange={e => setMode(e.target.value)} className="border border-border bg-surface p-2">
      <option>long</option><option>short</option><option>empty</option><option>edit</option>
    </select></label>
    <Button ref={opener} onClick={() => setOpen(true)}>Inspect content</Button>
    <InspectionDialog open={open} onOpenChange={setOpen} title="Content inspection" titleProps={{ ref: title, tabIndex: -1 }}
      initialFocus={mode === 'edit' ? input : title} finalFocus={opener}
      meta={<p>Local authored content · no fixture model</p>}
      navigation={<><Button onClick={() => setMode('short')}>Short content</Button><span>Host slots</span><Button onClick={() => setMode('long')}>Long content</Button></>}
      navigationLabel="Content choices"
      bodyProps={{ 'aria-label': 'Content scroll', tabIndex: 0 }}
      footer={<><span role="status">{keys}</span><Button onClick={() => setOpen(false)}>Finish inspection</Button></>}
      onKeyDown={e => setKeys(`Key ${e.key}`)} onCompositionStartCapture={() => setKeys('Composition started')} onCompositionEndCapture={() => setKeys('Composition ended')}>
      <div className="p-4">
        {mode === 'edit' ? <label>Local text <input ref={input} aria-label="Local text" className="border border-border bg-surface p-2" /></label> : null}
        {mode === 'empty' ? <p>No content available.</p> : mode === 'long' ? Array.from({ length: 80 }, (_, i) => <p className="mb-3" key={i}>Paragraph {i + 1}: arbitrary long-form prose with a readable end.</p>) : <p>Short arbitrary content.</p>}
        <Button onClick={() => setChild(true)}>Open child overlay</Button>
        <Dialog open={child} onOpenChange={setChild}><DialogContent><DialogTitle>Child overlay</DialogTitle><Button onClick={() => setChild(false)}>Finish child</Button></DialogContent></Dialog>
      </div>
    </InspectionDialog>
  </main>
}
