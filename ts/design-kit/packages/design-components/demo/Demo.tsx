import { useEffect, useState } from 'react'
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from '@hollis-labs/design-tokens'
import { Button, ButtonGroup, ButtonGroupText, ButtonGroupSeparator, Collapsible, CollapsibleTrigger, CollapsibleContent, HoverCard, HoverCardTrigger, HoverCardContent } from '../src/components/ui'
import { Callout } from '../src/components/callout'
import './demo.css'

const query = new URLSearchParams(window.location.search)
const initialTheme = query.get('theme') ?? DEFAULT_THEME_ID
const initialMode = query.get('mode') === 'light' ? 'light' : 'dark'

export function Demo() {
  const [theme, setTheme] = useState(initialTheme)
  const [mode, setMode] = useState(initialMode)
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState('Ready')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.mode = mode
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }, [theme, mode])

  return <main className="min-h-screen bg-bg p-8 font-sans text-fg">
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Design components primitives</h1>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="theme">Theme</label>
        <select id="theme" value={theme} onChange={(event) => setTheme(event.target.value)} className="rounded-control border border-border bg-surface px-3 py-2 text-sm">
          {BUILTIN_THEMES.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
        </select>
        <Button variant="outline" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>{mode}</Button>
      </div>
      <section className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-5">
        <h2 className="text-lg font-medium">ButtonGroup</h2>
        <ButtonGroup aria-label="Playback">
          <ButtonGroupText>Audio</ButtonGroupText>
          <Button variant="outline" onClick={() => setAction('Playing')}>Play</Button>
          <ButtonGroupSeparator />
          <Button variant="outline" onClick={() => setAction('Stopped')}>Stop</Button>
          <Button variant="outline" disabled>Unavailable</Button>
        </ButtonGroup>
        <ButtonGroup orientation="vertical" aria-label="History">
          <Button variant="outline">Latest</Button><Button variant="outline">Previous</Button>
        </ButtonGroup>
        <p aria-live="polite" className="text-sm text-fg-secondary">{action}</p>
      </section>
      <section className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-5">
        <h2 className="text-lg font-medium">Collapsible</h2>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger render={<Button variant="outline" />}>Toggle details</CollapsibleTrigger>
          <CollapsibleContent className="pt-3 text-sm">Host-controlled details. <a className="text-primary underline" href="#destination">Read the full details</a></CollapsibleContent>
        </Collapsible>
        <Collapsible disabled><CollapsibleTrigger render={<Button variant="outline" />}>Disabled details</CollapsibleTrigger><CollapsibleContent>Unavailable</CollapsibleContent></Collapsible>
      </section>
      <section className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-5">
        <h2 className="text-lg font-medium">HoverCard</h2>
        <HoverCard>
          <HoverCardTrigger href="#destination" delay={100} closeDelay={100} className="w-fit text-primary underline">Preview destination</HoverCardTrigger>
          <HoverCardContent align="start">Supplementary destination preview. The same information is available below.</HoverCardContent>
        </HoverCard>
        <HoverCard>
          <HoverCardTrigger href="#destination" delay={100} closeDelay={100} className="w-fit text-primary underline">Preview gallery</HoverCardTrigger>
          <HoverCardContent aria-hidden={false} align="start">
            <p className="mb-3">Accessible preview controls</p>
            <ButtonGroup aria-label="Preview pages"><Button variant="outline">Previous preview</Button><Button variant="outline">Next preview</Button></ButtonGroup>
          </HoverCardContent>
        </HoverCard>
      </section>
      <section id="destination" className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Destination and existing Callout</h2>
        <p className="text-sm">Supplementary destination preview. The same information is available below.</p>
        <Callout tone="neutral" title="Notice">Callout supplies the existing generic alert surface.</Callout>
        <Callout tone="danger" title="Action needed">The danger tone covers destructive notices.</Callout>
      </section>
    </div>
  </main>
}
