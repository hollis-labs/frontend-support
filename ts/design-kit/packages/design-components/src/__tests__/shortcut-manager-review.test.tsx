import {render,fireEvent,cleanup} from '@testing-library/react'
import {it,expect,vi,afterEach} from 'vitest'
import {StrictMode,useLayoutEffect,useRef,useState} from 'react'
import {InspectionDialog} from '../components/inspection-dialog'
import {SearchInput} from '../components/search-input'
import {useShortcut} from '../hooks/use-shortcut'
import {useShiftShift} from '../hooks/use-shift-shift'
import {useLayeredEscape} from '../hooks/use-layered-escape'
import {EscapeStack} from '../lib/escape-stack'
afterEach(cleanup)
it('shortcut stays active across a committed stable-prop rerender',()=>{
 const onTrigger=vi.fn()
 function Probe({count}:{count:number}){useShortcut({key:'/',onTrigger});return <span>{count}</span>}
 const ui=render(<Probe count={0}/>);fireEvent.keyDown(window,{key:'/'});expect(onTrigger).toHaveBeenCalledTimes(1)
 ui.rerender(<Probe count={1}/>);fireEvent.keyDown(window,{key:'/'});expect(onTrigger).toHaveBeenCalledTimes(2)
})
it('Escape stays active across a committed stable-prop rerender',()=>{
 const onEscape=vi.fn(()=> 'closed' as const);const stack=new EscapeStack()
 function Probe({count}:{count:number}){useLayeredEscape({active:true,onEscape,escapeStack:stack});return <span>{count}</span>}
 const ui=render(<Probe count={0}/>);fireEvent.keyDown(window,{key:'Escape'});expect(onEscape).toHaveBeenCalledTimes(1)
 ui.rerender(<Probe count={1}/>);fireEvent.keyDown(window,{key:'Escape'});stack.reset();expect(onEscape).toHaveBeenCalledTimes(2)
})
it('nested child owns Escape on initial React mount',()=>{
 const stack=new EscapeStack(),outer=vi.fn(()=> 'closed' as const),inner=vi.fn(()=> 'closed' as const)
 function Inner(){useLayeredEscape({active:true,onEscape:inner,escapeStack:stack});return <div role="dialog">inner</div>}
 function Outer(){useLayeredEscape({active:true,onEscape:outer,escapeStack:stack});return <div role="dialog"><Inner/></div>}
 render(<Outer/>);fireEvent.keyDown(window,{key:'Escape'});stack.reset();expect(inner).toHaveBeenCalledTimes(1);expect(outer).not.toHaveBeenCalled()
})
it('held Shift repeat does not become a double tap',()=>{
 const onTrigger=vi.fn();let time=100;const getTime=()=>time
 function Probe(){useShiftShift({onTrigger,getTime});return null}
 render(<Probe/>);fireEvent.keyDown(window,{key:'Shift',shiftKey:true});time=150;fireEvent.keyDown(window,{key:'Shift',shiftKey:true,repeat:true});expect(onTrigger).not.toHaveBeenCalled()
})

it('retained shortcut trigger retires across source replacement while current trigger works',()=>{
 let held:ReturnType<typeof useShortcut>;const onTrigger=vi.fn()
 function Probe({generation}:{generation:number}){held=useShortcut({key:'/',onTrigger,sourceGeneration:generation});return null}
 const v=render(<Probe generation={1}/>);const previous=held!;expect(previous.trigger()).toBe(true)
 v.rerender(<Probe generation={2}/>);expect(held!.trigger()).toBe(true);expect(onTrigger).toHaveBeenCalledTimes(2)
 expect(previous.trigger()).toBe(false);expect(onTrigger).toHaveBeenCalledTimes(2)
})
it('retained Shift shortcut trigger retires across source replacement while current trigger works',()=>{
 let held:ReturnType<typeof useShiftShift>;const onTrigger=vi.fn()
 function Probe({generation}:{generation:number}){held=useShiftShift({onTrigger,sourceGeneration:generation});return null}
 const v=render(<Probe generation={1}/>);const previous=held!;expect(previous.trigger()).toBe(true)
 v.rerender(<Probe generation={2}/>);expect(held!.trigger()).toBe(true);expect(onTrigger).toHaveBeenCalledTimes(2)
 expect(previous.trigger()).toBe(false);expect(onTrigger).toHaveBeenCalledTimes(2)
})

it('effect replay retires captured activation handles while current handles and native listeners work',()=>{
 const captured: ReturnType<typeof useShortcut>[]=[];let current: ReturnType<typeof useShortcut>;const action=vi.fn()
 function Probe(){current=useShortcut({key:'/',onTrigger:action});useLayoutEffect(()=>{captured.push(current)},[]);return null}
 const view=render(<StrictMode><Probe/></StrictMode>);expect(current!.trigger()).toBe(true)
 for(const old of captured) expect(old.trigger()).toBe(false)
 fireEvent.keyDown(window,{key:'/'});expect(action).toHaveBeenCalledTimes(2)
 view.unmount();expect(current!.trigger()).toBe(false)
})
it('manual shortcut checks key, default modifiers, access and current admission',()=>{
 let current: ReturnType<typeof useShortcut>;let admitted=true;const action=vi.fn()
 function Probe(){current=useShortcut({key:'/',onTrigger:action,isAdmitted:()=>admitted});return null}
 render(<Probe/>);expect(current!.trigger()).toBe(true)
 expect(current!.trigger(new KeyboardEvent('keydown',{key:'/',ctrlKey:true}))).toBe(false)
 expect(current!.trigger(new KeyboardEvent('keydown',{key:'x'}))).toBe(false)
 admitted=false;expect(current!.trigger()).toBe(false);expect(action).toHaveBeenCalledTimes(1)
})
it('composition lifetime fences manual and native triggers until composition ends',()=>{
 let current:ReturnType<typeof useShiftShift>;let time=0;const action=vi.fn()
 function Probe(){current=useShiftShift({onTrigger:action,getTime:()=>time});return <div data-testid="composition"/>}
 const view=render(<Probe/>);fireEvent.compositionStart(view.getByTestId('composition'))
 expect(current!.trigger()).toBe(false);fireEvent.keyDown(window,{key:'Shift'});time=100;fireEvent.keyDown(window,{key:'Shift'});expect(action).not.toHaveBeenCalled()
 fireEvent.compositionEnd(view.getByTestId('composition'));expect(current!.trigger()).toBe(true)
})
it('a source replacement resets the pending Shift tap',()=>{
 let time=0;const action=vi.fn()
 function Probe({generation}:{generation:number}){useShiftShift({onTrigger:action,getTime:()=>time,sourceGeneration:generation});return null}
 const view=render(<Probe generation={1}/>);fireEvent.keyDown(window,{key:'Shift'});view.rerender(<Probe generation={2}/>)
 time=100;fireEvent.keyDown(window,{key:'Shift'});expect(action).not.toHaveBeenCalled();time=150;fireEvent.keyDown(window,{key:'Shift'});expect(action).toHaveBeenCalledTimes(1)
})
it('caller DOM scope refuses outside events and accepts current inside focus',()=>{
 let current:ReturnType<typeof useShortcut>;const action=vi.fn()
 function Probe(){current=useShortcut({key:'/',onTrigger:action,scopeElement:()=>document.getElementById('shortcut-scope')});return <><div id="shortcut-scope" tabIndex={0}/><div data-testid="outside" tabIndex={0}/></>}
 const view=render(<Probe/>);fireEvent.keyDown(view.getByTestId('outside'),{key:'/'});expect(action).not.toHaveBeenCalled()
 const inside=document.getElementById('shortcut-scope')!;inside.focus();expect(current!.trigger()).toBe(true);fireEvent.keyDown(inside,{key:'/'});expect(action).toHaveBeenCalledTimes(2)
})
it('top layer owns Escape even when the event targets an outer registered layer',()=>{
 const stack=new EscapeStack(),outer=vi.fn(()=> 'closed' as const),inner=vi.fn(()=> 'closed' as const)
 function Probe(){useLayeredEscape({active:true,onEscape:outer,escapeStack:stack});useLayeredEscape({active:true,onEscape:inner,escapeStack:stack});return <div data-testid="outer-focus"/>}
 const view=render(<Probe/>);fireEvent.keyDown(view.getByTestId('outer-focus'),{key:'Escape'});expect(inner).toHaveBeenCalledTimes(1);expect(outer).not.toHaveBeenCalled();stack.reset()
})
it('registered popup defers to a visible unregistered nested popup and then resumes',()=>{
 const stack=new EscapeStack(),action=vi.fn(()=> 'closed' as const)
 function Probe(){useLayeredEscape({active:true,onEscape:action,escapeStack:stack,rootElement:()=>document.getElementById('parent-popup')});return <div id="parent-popup" role="dialog"/>}
 render(<Probe/>);const root=document.getElementById('parent-popup')!;const child=document.createElement('div');child.setAttribute('role','dialog');child.getClientRects=()=>[{}] as unknown as DOMRectList;root.append(child)
 fireEvent.keyDown(root,{key:'Escape'});expect(action).not.toHaveBeenCalled();child.remove();fireEvent.keyDown(root,{key:'Escape'});expect(action).toHaveBeenCalledTimes(1);stack.reset()
})
it('layer handles retire across selection, access and reopening, with current positive controls',()=>{
 const stack=new EscapeStack(),action=vi.fn(()=> 'closed' as const);let current:ReturnType<typeof useLayeredEscape>
 function Probe({id,active,accessible}:{id:number;active:boolean;accessible:boolean}){current=useLayeredEscape({active,accessible,sourceGeneration:id,onEscape:action,escapeStack:stack});return null}
 const view=render(<Probe id={1} active accessible/>);const old=current!;expect(old.handleEscape()).toBe(true)
 view.rerender(<Probe id={2} active accessible/>);expect(old.handleEscape()).toBe(false);expect(current!.handleEscape()).toBe(true);const replacement=current!
 view.rerender(<Probe id={2} active accessible={false}/>);expect(current!.handleEscape()).toBe(false)
 view.rerender(<Probe id={2} active={false} accessible/>);view.rerender(<Probe id={2} active accessible/>);expect(replacement.handleEscape()).toBe(false);expect(current!.handleEscape()).toBe(true);stack.reset()
})
it('Shift handles retire on source replacement even after access is restored',()=>{
 let current:ReturnType<typeof useShiftShift>;const action=vi.fn()
 function Probe({accessible}:{accessible:boolean}){current=useShiftShift({accessible,onTrigger:action});return null}
 const view=render(<StrictMode><Probe accessible/></StrictMode>);const old=current!;expect(old.trigger()).toBe(true)
 view.rerender(<StrictMode><Probe accessible={false}/></StrictMode>);expect(current!.trigger()).toBe(false)
 view.rerender(<StrictMode><Probe accessible/></StrictMode>);expect(old.trigger()).toBe(false);expect(current!.trigger()).toBe(true)
})

it('controlled Base UI popup routes Escape through one bubble stack after React input clearing',()=>{
 const stack=new EscapeStack()
 function Probe(){const [open,setOpen]=useState(true);const root=useRef<HTMLDivElement>(null);const title=useRef<HTMLHeadingElement>(null);const [query,setQuery]=useState('filter')
  useLayeredEscape({active:open,rootElement:()=>root.current,escapeStack:stack,onEscape:()=>{setOpen(false);return 'closed'}})
  return <InspectionDialog ref={root} open={open} title="Stack popup" titleProps={{ref:title,tabIndex:-1}} initialFocus={title} onOpenChange={(next,details)=>{if(details.reason==='escape-key'){details.cancel();details.allowPropagation();return}setOpen(next)}}><SearchInput value={query} onChange={setQuery} layeredEscape retainFocusOnClear slashToFocus={false}/></InspectionDialog>
 }
 const view=render(<Probe/>);const input=view.getByRole('searchbox');fireEvent.keyDown(input,{key:'Escape'});expect((input as HTMLInputElement).value).toBe('');expect(view.getByRole('dialog')).toBeTruthy();fireEvent.keyDown(input,{key:'Escape'});expect(view.queryByRole('dialog')).toBeNull();stack.reset()
})

it('a popup root connecting after registration still receives native Escape',()=>{
 const stack=new EscapeStack();let root:HTMLElement|null=null;const action=vi.fn(()=> 'closed' as const)
 stack.register({id:'delayed-popup',active:true,accessible:true,live:()=>true,rootElement:()=>root,onEscape:action})
 root=document.createElement('div');root.setAttribute('role','dialog');document.body.append(root)
 fireEvent.keyDown(root,{key:'Escape'});expect(action).toHaveBeenCalledTimes(1);root.remove();fireEvent.keyDown(window,{key:'Escape'});expect(action).toHaveBeenCalledTimes(1);stack.reset()
})

it('an exiting closed popup releases Escape ownership while an open popup retains it',()=>{
 const stack=new EscapeStack(),action=vi.fn(()=> 'closed' as const)
 const root=document.createElement('div');root.setAttribute('role','dialog');document.body.append(root)
 const menu=document.createElement('div');menu.setAttribute('role','menu');menu.getClientRects=()=>[{}] as unknown as DOMRectList;document.body.append(menu)
 stack.register({id:'popup',active:true,accessible:true,live:()=>true,rootElement:root,onEscape:action})
 fireEvent.keyDown(root,{key:'Escape'});expect(action).not.toHaveBeenCalled()
 menu.setAttribute('data-closed','');fireEvent.keyDown(root,{key:'Escape'});expect(action).toHaveBeenCalledTimes(1)
 menu.remove();root.remove();stack.reset()
})
