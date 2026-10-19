import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmationCard } from '../cards/confirmation-card'
import { ConfirmationAccepted, ConfirmationRejected, ConfirmationRequest, ConfirmationTitle } from '../components/confirmation'
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput, type ToolState } from '../components/tool'
import { Queue, QueueItem, QueueItemAction, QueueItemActions, QueueItemContent, QueueItemDescription, QueueItemFile, QueueItemImage, QueueItemIndicator, QueueList, QueueSection, QueueSectionContent, QueueSectionLabel, QueueSectionTrigger } from '../components/queue'

afterEach(cleanup)
describe('tool presentation', () => {
  it.each<[ToolState, string]>([['pending','Pending'],['running','Running'],['awaiting-confirmation','Awaiting confirmation'],['confirmed','Confirmed'],['completed','Completed'],['denied','Denied'],['error','Error']])('presents host-mapped %s without SDK wire vocabulary', (state, label) => {
    render(<Tool><ToolHeader toolName="file-search" state={state} /></Tool>)
    expect(screen.getByRole('button').textContent).toContain('file-search')
    expect(screen.getByRole('button').textContent).toContain(label)
  })
  it('connects a controlled disclosure without executing tools', async () => {
    const changed=vi.fn()
    const fixture=(open:boolean)=><Tool open={open} onOpenChange={changed}><ToolHeader state="completed" toolName="Lookup" /><ToolContent><ToolInput input={{query:'needle'}} /><ToolOutput output={<em>Host result</em>} /></ToolContent></Tool>
    const view=render(fixture(false));fireEvent.click(screen.getByRole('button'))
    expect(changed).toHaveBeenCalled();expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
    view.rerender(fixture(true));await waitFor(()=>expect(screen.getByText('Host result').tagName).toBe('EM'))
    expect(screen.getByText('"needle"')).toBeTruthy()
  })
  it.each([false,0,'',null])('retains falsy output %s', output => {
    const view=render(<ToolOutput output={output} />)
    expect(screen.getByText('Result')).toBeTruthy()
    expect(view.container.querySelector('code')!.textContent).toBe(JSON.stringify(output))
  })
  it('shows errors and handles unknown/circular input through JsonViewer', () => {
    const input: Record<string,unknown>={};input.self=input
    render(<><ToolInput input={input} /><ToolOutput errorText="Host supplied error" /></>)
    expect(screen.getByText('[object Object]')).toBeTruthy();expect(screen.getByText('Host supplied error')).toBeTruthy()
  })
})
describe('subordinate ConfirmationCard slots', () => {
  const actions=[{id:'opaque-17',label:'Proceed'},{id:'opaque-42',label:'Hold'}]
  const slots=<><ConfirmationTitle>Details</ConfirmationTitle><ConfirmationRequest>Decision requested</ConfirmationRequest><ConfirmationAccepted actionId="opaque-17">Host accepted message</ConfirmationAccepted><ConfirmationRejected actionId="opaque-42">Host rejected message</ConfirmationRejected></>
  it('leaves the sole envelope/actions/responder with the existing card', async () => {
    let finish!:()=>void;const responder=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve}))
    render(<ConfirmationCard title="Proposal" actions={actions} onRespond={responder}>{slots}</ConfirmationCard>)
    expect(screen.getByText('Decision requested')).toBeTruthy();expect(screen.queryByText('Host accepted message')).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:'Proceed'}))
    expect(responder).toHaveBeenCalledWith({status:'submitted',decisions:[{itemId:'opaque-17',action:'opaque-17'}]})
    expect((screen.getByRole('button',{name:'Hold'}) as HTMLButtonElement).disabled).toBe(true)
    finish();await waitFor(()=>expect((screen.getByRole('button',{name:'Hold'}) as HTMLButtonElement).disabled).toBe(false))
  })
  it('matches opaque IDs only after persisted submission; host owns both messages', () => {
    const fixture=(status:string,id:string)=><ConfirmationCard title="Proposal" actions={actions} onRespond={()=>{}} priorStatus={status} priorActionId={id}>{slots}</ConfirmationCard>
    const view=render(fixture('submitted','opaque-17'));expect(screen.getByText('Host accepted message')).toBeTruthy();expect(screen.queryByText('Host rejected message')).toBeNull();expect(screen.queryAllByRole('button')).toHaveLength(0)
    view.rerender(fixture('submitted','opaque-42'));expect(screen.getByText('Host rejected message')).toBeTruthy();expect(screen.queryByText('Host accepted message')).toBeNull()
    for(const status of ['handling','failed','future-state','canceled']){view.rerender(fixture(status,'opaque-17'));expect(screen.queryByText('Decision requested')).toBeNull();expect(screen.queryByText('Host accepted message')).toBeNull();expect(screen.queryByText('Host rejected message')).toBeNull()}
  })
  it.each([<ConfirmationTitle />,<ConfirmationRequest />,<ConfirmationAccepted actionId="x" />,<ConfirmationRejected actionId="y" />])('fails loudly without ConfirmationCard', slot => {
    const error=vi.spyOn(console,'error').mockImplementation(()=>{})
    try {expect(()=>render(slot)).toThrow('Confirmation components must be used within ConfirmationCard')} finally {error.mockRestore()}
  })
})
describe('queue presentation',()=>{
  it('renders a native bounded list with host actions, completion and attachments',async()=>{
    const action=vi.fn()
    render(<Queue><QueueSection><QueueSectionTrigger><QueueSectionLabel count={1} label="items" /></QueueSectionTrigger><QueueSectionContent><QueueList aria-label="Work queue"><QueueItem><QueueItemIndicator completed /><QueueItemContent completed>Review report</QueueItemContent><QueueItemDescription completed>Already completed</QueueItemDescription><QueueItemFile>report.md</QueueItemFile><QueueItemImage alt="Report preview" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" /><QueueItemActions><QueueItemAction aria-label="Remove item" onClick={action}>×</QueueItemAction></QueueItemActions></QueueItem></QueueList></QueueSectionContent></QueueSection></Queue>)
    expect(screen.getByRole('list',{name:'Work queue'}).tagName).toBe('UL');expect(screen.getByRole('listitem')).toBeTruthy();expect(screen.getByRole('img',{name:'Report preview'})).toBeTruthy()
    fireEvent.click(screen.getByRole('button',{name:'Remove item'}));expect(action).toHaveBeenCalledOnce()
    const trigger=screen.getByRole('button',{name:'1 items'});fireEvent.click(trigger);await waitFor(()=>expect(trigger.getAttribute('aria-expanded')).toBe('false'))
  })
})
