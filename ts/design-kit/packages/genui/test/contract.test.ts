import { describe, expect, it } from 'vitest'
import manifest from '../contract/fixtures/manifest.json'
import { draftErrors, parseEnvelope, parseCall, parseOutcome, parseResponse, parseRecovery, isTerminal, serializeCall } from '../src/contract'
import { decodeJSON } from '../src/decode'
import { fixture } from './helpers'
import type { Envelope } from '../src/generated'

const parsers = { 'envelope/1': parseEnvelope, 'call/1': parseCall, 'outcome/1': parseOutcome, 'response/1': parseResponse, 'response-read/1': parseResponse }
describe('canonical cross-language fixtures', () => {
  for (const entry of manifest.fixtures) it(entry.name, () => {
    const parse = parsers[entry.schema as keyof typeof parsers]
    const raw = fixture(entry.file.replace(/\.json$/, ''))
    if (!entry.valid) expect(() => parse(raw)).toThrow()
    else {
      const value = parse(raw)
      if (entry.schema === 'outcome/1') expect(isTerminal(value as ReturnType<typeof parseOutcome>)).toBe(entry.terminal)
      if (entry.schema === 'response-read/1') {
        const result = value as ReturnType<typeof parseResponse>
        expect(result.kind === 'known').toBe(entry.known)
        expect(result.kind === 'known' && result.terminal).toBe(entry.terminal)
      }
    }
  })
})
describe('raw profile before lossy conversion', () => {
  it.each(['{"a":1,"\\u0061":2}', '{"v":-0}', '{"v":1e0}', '{"v":1.0}', '{"v":9007199254740993}', '{"v":"\\ud800"}', '{"v":"\\udc00"}', '{"v":1} false', '\ufeff{}'])('refuses %s', raw => expect(() => decodeJSON(raw, 65536)).toThrow())
  it('refuses invalid UTF-8 and byte BOM without replacement', () => {
    expect(() => decodeJSON(new Uint8Array([0xc0, 0xaf]), 100)).toThrow()
    expect(() => decodeJSON(new Uint8Array([0xef, 0xbb, 0xbf, 123, 125]), 100)).toThrow()
  })
  it('accepts safe boundaries, paired Unicode and harmless object names', () => {
    const value = decodeJSON('{"__proto__":9007199254740991,"constructor":-9007199254740991,"unicode":"\\ud83d\\ude00"}', 65536)
    expect(Object.getPrototypeOf(value)).toBeNull()
    expect(value).toEqual({ ['__proto__']: 9007199254740991, constructor: -9007199254740991, unicode: '😀' })
  })
  it('bounds bytes, keys, values, collections and nesting', () => {
    for (const raw of [JSON.stringify({ value: 'é'.repeat(8193) }), JSON.stringify({ ['é'.repeat(129)]: 1 }), JSON.stringify(Array(257).fill(null)), JSON.stringify(Object.fromEntries(Array.from({length:257}, (_, i) => [i, 0]))), '['.repeat(34)+'0'+']'.repeat(34)]) expect(() => decodeJSON(raw, 262144)).toThrow()
    expect(() => decodeJSON(' '.repeat(100)+'{}', 100)).toThrow()
  })
  it('refuses JavaScript values that stringify would silently replace/drop', () => {
    for (const bad of [NaN, Infinity, -0, undefined, new Date(), () => true, Array(1), Object.assign([1], { extra: 2 })]) {
      const call = JSON.parse(fixture('call'))
      call.callAgentFunction.callFunction.args.input.bad = bad
      expect(() => serializeCall(call)).toThrow()
    }
  })
})
describe('reviewed pattern semantics', () => {
  it.each(['constructor', 'toString', '__proto__'])('validates only own draft values for %s', key => {
    const envelope = JSON.parse(fixture('form')) as Envelope
    const root = envelope.data.createSurface.components[0]
    if (root.component !== 'GenuiForm') throw new Error('fixture')
    root.props.fields = [{ key, label: 'Field', type: 'text', required: false }]
    delete envelope.data.createSurface.dataModel.draft
    expect(() => parseEnvelope(JSON.stringify(envelope))).not.toThrow()
    expect(draftErrors(root.props.fields, {})).toEqual({})
    expect(draftErrors([{ ...root.props.fields[0], required: true }], {})).toEqual({ [key]: 'A value is required.' })
    envelope.data.createSurface.dataModel.draft = { [key]: 'authored value' }
    expect(() => parseEnvelope(JSON.stringify(envelope))).not.toThrow()
    envelope.data.createSurface.dataModel.draft = { [key]: 7 }
    expect(() => parseEnvelope(JSON.stringify(envelope))).toThrow()
  })
  it('refuses out-of-pattern draft and pre-granted choices', () => {
    const envelope = JSON.parse(fixture('approval')) as Envelope
    envelope.data.createSurface.dataModel.draft = {}
    expect(() => parseEnvelope(JSON.stringify(envelope))).toThrow()
    delete envelope.data.createSurface.dataModel.draft
    const root = envelope.data.createSurface.components[0]
    if (root.component !== 'GenuiApproval') throw new Error('fixture')
    root.props.choices[0].callFunction.args.genui_action.confirmation = 'pre-granted'
    expect(() => parseEnvelope(JSON.stringify(envelope))).toThrow()
  })
  it('permits mutually exclusive choices sharing the host intent ID', () => {
    const envelope = JSON.parse(fixture('approval')) as Envelope
    const root = envelope.data.createSurface.components[0]
    if (root.component !== 'GenuiApproval') throw new Error('fixture')
    root.props.choices.push({ ...root.props.choices[0], label: 'Deny', callFunction: { ...root.props.choices[0].callFunction, args: { ...root.props.choices[0].callFunction.args, input: { approved: false } } } })
    expect(parseEnvelope(JSON.stringify(envelope))).toEqual(envelope)
  })
  it('rejects malformed known outcomes, partial, mixed envelopes and wrong correlation', () => {
    for (const value of [{status:'ok',extra:1}, {status:'partial'}, {status:'accepted'}, {status:'conflict',recorded:{status:'future'}}]) expect(() => parseResponse(JSON.stringify({version:'1.0',agentFunctionResponse:{functionCallId:'x',value}}))).toThrow()
    expect(() => parseResponse(fixture('response'), 'wrong')).toThrow()
  })
})

describe('native host recovery wrapper', () => {
  function wrapper() {
    const request = JSON.parse(fixture('call'))
    request.callAgentFunction.functionCallId = 'read-invocation'
    return { request, response: { version: '1.0', agentFunctionResponse: { functionCallId: 'read-invocation', value: {status:'accepted',handle:'retained'} } } }
  }
  it('unpacks correlated native messages without changing exact semantic input', () => {
    const value=wrapper()
    value.request.callAgentFunction.callFunction.args.input = {number:9007199254740991, string:'9007199254740991'}
    const result=parseRecovery(JSON.stringify(value),'read-invocation')
    expect(parseCall(result.request!).callAgentFunction.callFunction.args.input).toEqual(value.request.callAgentFunction.callFunction.args.input)
    expect(parseResponse(result.response).kind).toBe('known')
    expect(parseRecovery(JSON.stringify({response:value.response})).request).toBeUndefined()
  })
  it('rejects proof exposure, extra fields, mismatched invocation and malformed request', () => {
    const proof=wrapper();proof.request.callAgentFunction.callFunction.args.genui_action.confirmation='opaque-proof'
    const mismatch=wrapper();mismatch.request.callAgentFunction.functionCallId='different-read'
    for(const value of [proof,mismatch,{...wrapper(),extra:true},{...wrapper(),request:null}]) expect(()=>parseRecovery(JSON.stringify(value))).toThrow()
    expect(()=>parseRecovery(JSON.stringify(wrapper()),'wrong-read')).toThrow()
  })
  it('refuses lossy raw tokens and duplicate wrapper members before ordinary JSON decoding', () => {
    const value=wrapper()
    const raw=JSON.stringify(value)
    expect(()=>parseRecovery(raw.replace('"retained"','9007199254740993'))).toThrow()
    expect(()=>parseRecovery(raw.replace('"retained"','1e0'))).toThrow()
    expect(()=>parseRecovery(raw.replace('"response":','"response":null,"response":'))).toThrow()
  })
  it('allows exactly the wrapper nesting over a maximal native message', () => {
    const value=wrapper()
    let nested: unknown = null
    for(let n=0;n<27;n++) nested=[nested]
    value.request.callAgentFunction.callFunction.args.input={nested}
    expect(()=>parseCall(JSON.stringify(value.request))).not.toThrow()
    expect(()=>parseRecovery(JSON.stringify(value))).not.toThrow()
    value.request.callAgentFunction.callFunction.args.input={nested:[nested]}
    expect(()=>parseRecovery(JSON.stringify(value))).toThrow()
  })
})
