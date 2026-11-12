import { useState } from 'react'
import { Button } from '@hollis-labs/design-components'
import { CpuIcon, CloudIcon } from 'lucide-react'
import { ModelSelector, ModelSelectorContent, ModelSelectorDialog, ModelSelectorEmpty, ModelSelectorGroup, ModelSelectorInput, ModelSelectorItem, ModelSelectorList, ModelSelectorLogo, ModelSelectorLogoGroup, ModelSelectorName, ModelSelectorShortcut, ModelSelectorTrigger } from '../src/components/model-selector'

/** Host catalog and selection, generic consumer-owned icons; no brand assets. */
export function ModelSelectorDemo() {
  const [open, setOpen] = useState(false), [quickOpen, setQuickOpen] = useState(false), [selected, setSelected] = useState('Local small')
  const list = (close: () => void) => <><ModelSelectorInput aria-label="Search models" placeholder="Search models..." />
    <ModelSelectorList><ModelSelectorEmpty>No matching models</ModelSelectorEmpty>
      <ModelSelectorGroup heading="Local"><ModelSelectorItem value="Local small" keywords={['fast']} onSelect={value => { setSelected(value); close() }}>
        <ModelSelectorLogo provider="local"><CpuIcon /></ModelSelectorLogo><ModelSelectorName>Local small</ModelSelectorName><ModelSelectorShortcut>Fast</ModelSelectorShortcut>
      </ModelSelectorItem></ModelSelectorGroup>
      <ModelSelectorGroup heading="Hosted"><ModelSelectorItem value="Hosted large" keywords={['reasoning']} onSelect={value => { setSelected(value); close() }}>
        <ModelSelectorLogo provider="hosted"><CloudIcon /></ModelSelectorLogo><ModelSelectorName>Hosted large</ModelSelectorName><ModelSelectorShortcut>Reasoning</ModelSelectorShortcut>
      </ModelSelectorItem><ModelSelectorItem value="Unavailable" disabled><ModelSelectorName>Unavailable</ModelSelectorName></ModelSelectorItem></ModelSelectorGroup>
    </ModelSelectorList></>
  return <section className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
    <h1 className="text-heading font-semibold">Model selector</h1><p className="text-body text-muted-foreground">The host owns the catalog, selected model and logo nodes.</p>
    <p role="status">Selected: {selected}</p>
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger render={<Button variant="outline" />}><ModelSelectorLogoGroup><ModelSelectorLogo><CpuIcon /></ModelSelectorLogo><ModelSelectorLogo><CloudIcon /></ModelSelectorLogo></ModelSelectorLogoGroup>Choose model</ModelSelectorTrigger>
      <ModelSelectorContent title="Choose a model" description="Filter the host catalog and select a model." showCloseButton={false}>{list(() => setOpen(false))}</ModelSelectorContent>
    </ModelSelector>
    <Button variant="secondary" onClick={() => setQuickOpen(true)}>Open quick selector</Button>
    <ModelSelectorDialog open={quickOpen} onOpenChange={setQuickOpen} title="Quick model selector">{list(() => setQuickOpen(false))}</ModelSelectorDialog>
  </section>
}
