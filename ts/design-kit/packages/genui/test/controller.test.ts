import { describe, expect, it, vi } from 'vitest'
import { GenuiController, type GenuiTransport } from '../src/controller'
import { parseCall } from '../src/contract'
import { fixture, response } from './helpers'
import type { Envelope } from '../src/generated'
const accepted = { status: 'accepted', handle: 'host-handle' }
const challenge = JSON.parse(fixture('outcome_needs_confirmation'))
const ids = () => { let n=0; return () => `invocation-${++n}` }
function host(overrides: Partial<GenuiTransport> = {}): GenuiTransport {
  return { submit: vi.fn(async raw => response(raw, accepted)), recover: vi.fn(async request => ({response:JSON.stringify({version:'1.0',agentFunctionResponse:{functionCallId:request.functionCallId,value:{status:'ok'}}})})), ...overrides }
}
describe('host-driven action lifecycle', () => {
  it('adopts the exact retained host request after a semantically equivalent local submission', async () => {
    const retained = JSON.parse(fixture('call'))
    delete retained.callAgentFunction.callFunction.catalogId
    retained.callAgentFunction.callFunction.args.genui_action.risk = 'low'
    const transport = host({
      submit: vi.fn(async raw => response(raw, challenge)),
      recover: vi.fn(async q => ({ request: JSON.stringify({ ...retained, callAgentFunction: { ...retained.callAgentFunction, functionCallId: q.functionCallId } }), response: JSON.stringify({ version:'1.0', agentFunctionResponse:{ functionCallId:q.functionCallId, value:challenge } }) })),
      confirm: vi.fn(async () => 'opaque-proof'),
    })
    const controller = new GenuiController(fixture('approval'), transport, ids())
    await controller.submit(0)
    await controller.recover()
    expect(controller.getSnapshot().phase).toBe('confirmation')
    expect(controller.getSnapshot().canConfirm).toBe(true)
    expect(transport.submit).toHaveBeenCalledTimes(1)
    await controller.confirm()
    const resumed = parseCall(vi.mocked(transport.submit).mock.calls[1][0]).callAgentFunction.callFunction
    expect(resumed.catalogId).toBeUndefined()
    expect(resumed.args.genui_action).toEqual({ ...retained.callAgentFunction.callFunction.args.genui_action, confirmation:'opaque-proof' })
    expect(resumed.args.input).toEqual(retained.callAgentFunction.callFunction.args.input)
  })
  it.each([undefined, 'low', 'medium', 'high'])('recovers host-accepted default catalog and advisory risk %s without changing the original request', async risk => {
    const recorded = JSON.parse(fixture('call'))
    delete recorded.callAgentFunction.callFunction.catalogId
    if (risk === undefined) delete recorded.callAgentFunction.callFunction.args.genui_action.risk
    else recorded.callAgentFunction.callFunction.args.genui_action.risk = risk
    const transport = host({
      recover: vi.fn(async q => ({ request: JSON.stringify({ ...recorded, callAgentFunction: { ...recorded.callAgentFunction, functionCallId: q.functionCallId } }), response: JSON.stringify({ version:'1.0', agentFunctionResponse:{ functionCallId:q.functionCallId, value:challenge } }) })),
      confirm: vi.fn(async () => 'opaque-proof'),
    })
    const controller = new GenuiController(fixture('approval'), transport, ids())
    await controller.recover('action_0001')
    expect(controller.getSnapshot().phase).toBe('confirmation')
    expect(controller.getSnapshot().canConfirm).toBe(true)
    expect(transport.submit).not.toHaveBeenCalled()
    await controller.confirm()
    const sent = parseCall(vi.mocked(transport.submit).mock.calls[0][0])
    const expected = structuredClone(recorded.callAgentFunction.callFunction)
    expected.args.genui_action.confirmation = 'opaque-proof'
    expect(sent.callAgentFunction.callFunction).toEqual(expected)
  })
  it.each(['subject', 'revision', 'projection', 'input', 'action', 'proof'])('does not normalize protected recovery %s facts', async change => {
    const recorded = JSON.parse(fixture('call'))
    const call = recorded.callAgentFunction.callFunction
    delete call.catalogId
    call.args.genui_action.risk = 'low'
    if (change === 'subject') call.args.genui_action.subject.id = 'another'
    if (change === 'revision') call.args.genui_action.basis.revision = '8'
    if (change === 'projection') call.args.genui_action.basis.projectionRevision = '8'
    if (change === 'input') call.args.input.approved = false
    if (change === 'action') call.args.genui_action.id = 'another'
    if (change === 'proof') call.args.genui_action.confirmation = 'old-proof'
    const transport = host({ recover: vi.fn(async q => ({ request:JSON.stringify(recorded), response:JSON.stringify({version:'1.0',agentFunctionResponse:{functionCallId:q.functionCallId,value:challenge}}) })), confirm:vi.fn(async () => 'new-proof') })
    const controller = new GenuiController(fixture('approval'), transport, ids())
    await controller.recover('action_0001')
    await controller.confirm()
    expect(controller.getSnapshot().phase).toBe('unknown')
    expect(controller.getSnapshot().canConfirm).toBe(false)
    expect(transport.confirm).not.toHaveBeenCalled()
    expect(transport.submit).not.toHaveBeenCalled()
  })
  it('sends exact nested action/input and never treats accepted as complete', async () => {
    const transport = host(), controller = new GenuiController(fixture('approval'), transport, ids())
    await Promise.all([controller.submit(0), controller.submit(0)])
    expect(transport.submit).toHaveBeenCalledTimes(1)
    const sent = parseCall(vi.mocked(transport.submit).mock.calls[0][0])
    expect(sent.callAgentFunction.callFunction).toEqual(JSON.parse(fixture('approval')).data.createSurface.components[0].props.choices[0].callFunction)
    expect(controller.getSnapshot().phase).toBe('pending')
    await controller.recover()
    expect(controller.getSnapshot().phase).toBe('terminal')
    expect(transport.submit).toHaveBeenCalledTimes(1)
  })
  it('retains unknown/malformed/transport failures without resubmitting', async () => {
    for (const result of [{status:'future',note:'await later'}, {status:'partial'}, {status:'ok',unexpected:true}, 'throw']) {
      const transport = host({submit:vi.fn(async raw => { if (result === 'throw') throw new Error('private diagnostic'); return response(raw,result) })})
      const controller = new GenuiController(fixture('approval'),transport,ids())
      await controller.submit(0); await controller.submit(0)
      expect(controller.getSnapshot().phase).toBe('unknown')
      expect(JSON.stringify(controller.getSnapshot())).not.toContain('private diagnostic')
      expect(transport.submit).toHaveBeenCalledTimes(1)
    }
  })
  it('confirmation uses host proof and same original semantic input, only invocation changes', async () => {
    const transport = host({submit:vi.fn(async raw => response(raw, parseCall(raw).callAgentFunction.callFunction.args.genui_action.confirmation ? {status:'ok'} : challenge)), confirm:vi.fn(async () => 'opaque-host-proof')})
    const controller = new GenuiController(fixture('form'),transport,ids())
    const draft = {name:'Changed', enabled:false}
    await controller.submit(0,draft)
    draft.name = 'Later mutation'
    expect(controller.getSnapshot().phase).toBe('confirmation')
    await controller.confirm()
    const [a,b] = vi.mocked(transport.submit).mock.calls.map(args => parseCall(args[0]))
    expect(a.callAgentFunction.callFunction.args.input).toEqual({approved:true,draft:{name:'Changed',enabled:false}})
    expect(b.callAgentFunction.callFunction.args.input).toEqual(a.callAgentFunction.callFunction.args.input)
    expect(b.callAgentFunction.callFunction.args.genui_action).toEqual({...a.callAgentFunction.callFunction.args.genui_action,confirmation:'opaque-host-proof'})
    expect(a.callAgentFunction.functionCallId).not.toBe(b.callAgentFunction.functionCallId)
    expect(controller.getSnapshot().phase).toBe('terminal')
  })
  it('remount recovers exact recorded choice, never guesses the first shared ID', async () => {
    const envelope = JSON.parse(fixture('approval')) as Envelope
    const root = envelope.data.createSurface.components[0]
    if (root.component !== 'GenuiApproval') throw new Error('fixture')
    root.props.choices.push({...root.props.choices[0],label:'Deny',callFunction:{...root.props.choices[0].callFunction,args:{...root.props.choices[0].callFunction.args,input:{approved:false}}}})
    let recorded = ''
    const transport = host({submit:vi.fn(async raw => {recorded=raw; return response(raw,challenge)}),recover:vi.fn(async q=>({response:JSON.stringify({version:'1.0',agentFunctionResponse:{functionCallId:q.functionCallId,value:challenge}}),request:recorded})),confirm:vi.fn(async()=> 'proof')})
    const previous = new GenuiController(JSON.stringify(envelope),transport,ids())
    await previous.submit(1); previous.dispose()
    const fresh = new GenuiController(JSON.stringify(envelope),transport,ids())
    await fresh.recover('action_0001')
    expect(fresh.getSnapshot().canConfirm).toBe(true)
    await fresh.confirm()
    expect(parseCall(recorded).callAgentFunction.callFunction.args.input).toEqual({approved:false})
  })
  it('missing or forged recorded request never permits reconstruction', async () => {
    const transport = host({recover:vi.fn(async q=>({response:JSON.stringify({version:'1.0',agentFunctionResponse:{functionCallId:q.functionCallId,value:challenge}})})),confirm:vi.fn(async()=> 'proof')})
    const fresh = new GenuiController(fixture('approval'),transport,ids())
    await fresh.recover('action_0001'); await fresh.confirm()
    expect(fresh.getSnapshot().phase).toBe('confirmation')
    expect(fresh.getSnapshot().canConfirm).toBe(false)
    expect(transport.submit).not.toHaveBeenCalled()
    const forged = JSON.parse(fixture('call')); forged.callAgentFunction.callFunction.args.input = {forged:true}
    transport.recover = vi.fn(async q=>({response:JSON.stringify({version:'1.0',agentFunctionResponse:{functionCallId:q.functionCallId,value:challenge}}),request:JSON.stringify(forged)}))
    await fresh.recover()
    expect(fresh.getSnapshot().phase).toBe('unknown')
    expect(transport.submit).not.toHaveBeenCalled()
  })
  it('never retains or reuses confirmation proof exposed by recovery', async () => {
    const request=JSON.parse(fixture('call'))
    request.callAgentFunction.callFunction.args.genui_action.confirmation='must-not-recover'
    const transport=host({recover:vi.fn(async q=>({response:JSON.stringify({version:'1.0',agentFunctionResponse:{functionCallId:q.functionCallId,value:challenge}}),request:JSON.stringify(request)})),confirm:vi.fn(async()=> 'new-proof')})
    const controller=new GenuiController(fixture('approval'),transport,ids())
    await controller.recover('action_0001');await controller.confirm()
    expect(controller.getSnapshot().phase).toBe('unknown')
    expect(controller.getSnapshot().canConfirm).toBe(false)
    expect(JSON.stringify(controller.getSnapshot())).not.toContain('must-not-recover')
    expect(transport.confirm).not.toHaveBeenCalled()
    expect(transport.submit).not.toHaveBeenCalled()
  })
  it('cannot switch a retained intent to another action ID during recovery', async () => {
    const envelope=JSON.parse(fixture('approval')) as Envelope
    const root=envelope.data.createSurface.components[0]
    if(root.component!=='GenuiApproval') throw new Error('fixture')
    root.props.choices.push({...root.props.choices[0],label:'Another',callFunction:{...root.props.choices[0].callFunction,args:{...root.props.choices[0].callFunction.args,genui_action:{...root.props.choices[0].callFunction.args.genui_action,id:'action_0002'}}}})
    const transport=host(),controller=new GenuiController(JSON.stringify(envelope),transport,ids())
    await controller.submit(0)
    await controller.recover('action_0002')
    expect(transport.recover).not.toHaveBeenCalled()
    expect(controller.getSnapshot().actionId).toBe('action_0001')
  })
  it('rejects mismatched invocation and ignores results after disposal', async () => {
    const wrong = host({submit:vi.fn(async()=>fixture('response'))})
    const controller = new GenuiController(fixture('approval'),wrong,ids()); await controller.submit(0)
    expect(controller.getSnapshot().phase).toBe('unknown')
    let resolve!: (value: string)=>void
    let raw=''
    const transport=host({submit:vi.fn(call=>{raw=call;return new Promise<string>(r=>{resolve=r})})})
    const disposed=new GenuiController(fixture('approval'),transport,ids())
    const pending=disposed.submit(0); disposed.dispose(); resolve(response(raw,{status:'ok'})); await pending
    expect(disposed.getSnapshot().phase).toBe('busy')
    expect(vi.mocked(transport.submit).mock.calls[0][1].aborted).toBe(true)
  })
  it('refuses unsafe draft numbers and unavailable view states before effects', async () => {
    const transport=host(), controller=new GenuiController(fixture('form'),transport,ids())
    await expect(controller.submit(0,{name:'valid',enabled:NaN})).rejects.toThrow()
    expect(transport.submit).not.toHaveBeenCalled()
    const e=JSON.parse(fixture('approval'));e.data.createSurface.components[0].props.state='expired'
    await expect(new GenuiController(JSON.stringify(e),transport,ids()).submit(0)).rejects.toThrow()
    expect(transport.submit).not.toHaveBeenCalled()
  })
})
