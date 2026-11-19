import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { GenuiController, type GenuiTransport } from '../src/controller'
import { GenuiSurface } from '../src/surface'
import { SurfaceFrame } from '../src/presentation'
import { parseCall } from '../src/contract'
import { fixture, response } from './helpers'
function host(): GenuiTransport {
  return {submit:vi.fn(async raw=>response(raw,{status:'accepted',handle:'work-handle'})), recover:vi.fn(async q=>({response:JSON.stringify({version:'1.0',agentFunctionResponse:{functionCallId:q.functionCallId,value:{status:'ok'}}})}))}
}
function create(name='approval', transport=host()) { return {transport,controller:new GenuiController(fixture(name),transport)} }
describe('reviewed pattern rendering',()=>{
  it.each(['constructor', 'toString', '__proto__'])('renders absent %s as empty and submits only authored text',async key=>{
    const envelope=JSON.parse(fixture('form'))
    envelope.data.createSurface.components[0].props.fields=[{key,label:'Field',type:'text',required:false}]
    delete envelope.data.createSurface.dataModel.draft
    const transport=host(),controller=new GenuiController(JSON.stringify(envelope),transport)
    render(<GenuiSurface controller={controller}/>)
    const field=screen.getByRole('textbox',{name:'Field'}) as HTMLInputElement
    expect(field.value).toBe('')
    expect(field.getAttribute('aria-invalid')).toBe('false')
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.change(field,{target:{value:'authored'}})
    fireEvent.click(screen.getByRole('button',{name:'Review'}))
    await waitFor(()=>expect(transport.submit).toHaveBeenCalledTimes(1))
    expect(parseCall(vi.mocked(transport.submit).mock.calls[0][0]).callAgentFunction.callFunction.args.input.draft).toEqual({[key]:'authored'})
  })
  it.each(['approval','form','list_detail'])('renders %s with semantic markup golden', name=>{
    const {controller}=create(name)
    expect(renderToStaticMarkup(<GenuiSurface controller={controller}/>)).toMatchSnapshot()
  })
  it('keeps text inert and pending visible; repeated clicks do not imply execution',async()=>{
    const e=JSON.parse(fixture('approval')); e.data.createSurface.components[0].props.summary='<img src=x onerror=alert(1)>'
    const transport=host(),controller=new GenuiController(JSON.stringify(e),transport)
    const {container}=render(<GenuiSurface controller={controller}/>)
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeDefined()
    expect(container.querySelector('img')).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:'Approve'}))
    await screen.findByText('Accepted by the host. Completion is still pending.')
    expect((screen.getByRole('button',{name:'Approve'}) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button',{name:'Approve'}))
    expect(transport.submit).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button',{name:'Check host status'}))
    await screen.findByText('The host reports completion.')
    expect(transport.submit).toHaveBeenCalledTimes(1)
  })
  it('submits typed complete draft only after accessible errors are resolved',async()=>{
    const {controller,transport}=create('form')
    render(<GenuiSurface controller={controller}/>)
    const name=screen.getByRole('textbox',{name:'Name (required)'})
    fireEvent.change(name,{target:{value:''}})
    fireEvent.click(screen.getByRole('button',{name:'Review'}))
    expect(screen.getByRole('alert').textContent).toBe('A value is required.')
    expect(document.activeElement).toBe(name)
    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(name.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id)
    expect(transport.submit).not.toHaveBeenCalled()
    fireEvent.change(name,{target:{value:'Draft rename'}})
    fireEvent.click(screen.getByRole('checkbox',{name:'Enabled'}))
    fireEvent.click(screen.getByRole('button',{name:'Review'}))
    await waitFor(()=>expect(transport.submit).toHaveBeenCalledTimes(1))
    const call=parseCall(vi.mocked(transport.submit).mock.calls[0][0])
    expect(call.callAgentFunction.callFunction.args.input).toEqual({approved:true,draft:{name:'Draft rename',enabled:false}})
    expect(screen.getByText('Submitting this draft requests a new review. It does not apply the proposed changes.')).toBeDefined()
  })
  it('integer field refuses lossy lexical values before dispatch',async()=>{
    const e=JSON.parse(fixture('form'));e.data.createSurface.components[0].props.fields.push({key:'count',label:'Count',type:'integer',required:true})
    const transport=host(),controller=new GenuiController(JSON.stringify(e),transport)
    render(<GenuiSurface controller={controller}/>)
    for(const value of ['9007199254740993','1.0','1e0','-0']) {
      fireEvent.change(screen.getByRole('textbox',{name:'Count (required)'}),{target:{value}})
      fireEvent.click(screen.getByRole('button',{name:'Review'}))
      expect(screen.getByRole('alert').textContent).toBe('Enter a whole number.')
    }
    expect(transport.submit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('textbox',{name:'Count (required)'}),{target:{value:'9007199254740991'}})
    fireEvent.click(screen.getByRole('button',{name:'Review'}))
    await waitFor(()=>expect(transport.submit).toHaveBeenCalledTimes(1))
  })
  it('remounting a new controller discards stale local draft',()=>{
    const first=create('form'), second=create('form')
    const view=render(<GenuiSurface controller={first.controller}/>)
    fireEvent.change(screen.getByRole('textbox',{name:'Name (required)'}),{target:{value:'Unsaved'}})
    view.rerender(<GenuiSurface controller={second.controller}/>)
    expect((screen.getByRole('textbox',{name:'Name (required)'}) as HTMLInputElement).value).toBe('Example')
  })
  it('list selection asks host for a new surface rather than fabricating detail',()=>{
    const {controller,transport}=create('list_detail'), onSelect=vi.fn()
    render(<GenuiSurface controller={controller} onSelect={onSelect}/>)
    fireEvent.click(screen.getByRole('button',{name:'Rename'}))
    expect(onSelect).toHaveBeenCalledWith('change_1')
    expect(screen.getByRole('region',{name:'Selected item'}).textContent).toContain('Review the proposed name.')
    expect(transport.submit).not.toHaveBeenCalled()
    const separator=screen.getByRole('separator',{name:'Resize list'})
    fireEvent.keyDown(separator,{key:'ArrowRight'})
    expect(separator.getAttribute('aria-valuenow')).toBe('57')
  })
  it.each(['loading','empty','error','stale','conflict','expired'])('shows %s state without enabled action',state=>{
    const e=JSON.parse(fixture('approval'));e.data.createSurface.components[0].props.state=state
    render(<GenuiSurface controller={new GenuiController(JSON.stringify(e),host())}/>)
    expect((screen.getByRole('button',{name:'Approve'}) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole(state==='error'||state==='conflict'?'alert':'status')).toBeDefined()
  })
  it('unknown future outcome has persistent recovery UI and no execution retry',async()=>{
    const transport=host(); transport.submit=vi.fn(async raw=>response(raw,{status:'awaiting_new_protocol',detail:'future'}))
    const controller=new GenuiController(fixture('approval'),transport)
    render(<GenuiSurface controller={controller}/>)
    fireEvent.click(screen.getByRole('button',{name:'Approve'}))
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toContain('not yet understood')
    expect(screen.getByRole('button',{name:'Check host status'})).toBeDefined()
    expect((screen.getByRole('button',{name:'Approve'}) as HTMLButtonElement).disabled).toBe(true)
  })
})
describe('host-owned presentation',()=>{
  it('shared modal traps focus and Escape dismisses without canceling the action',async()=>{
    const {controller,transport}=create()
    function Harness(){const [open,setOpen]=useState(false);const [target,setTarget]=useState<HTMLElement|null>(null);return <><button onClick={event=>{setTarget(event.currentTarget);setOpen(true)}}>Open review</button><SurfaceFrame mode="modal" title="Review panel" open={open} returnFocus={target} onClose={()=>setOpen(false)}><GenuiSurface controller={controller}/></SurfaceFrame></>}
    render(<Harness/>)
    const trigger=screen.getByRole('button',{name:'Open review'});trigger.focus();fireEvent.click(trigger)
    const dialog=await screen.findByRole('dialog',{name:'Review panel'})
    await waitFor(()=>expect(dialog.contains(document.activeElement)).toBe(true))
    fireEvent.click(within(dialog).getByRole('button',{name:'Approve'}))
    await within(dialog).findByText('Accepted by the host. Completion is still pending.')
    fireEvent.keyDown(document.activeElement ?? dialog,{key:'Escape'})
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(()=>expect(document.activeElement).toBe(trigger))
    expect(controller.getSnapshot().phase).toBe('pending')
    expect(transport.submit).toHaveBeenCalledTimes(1)
  })
})
