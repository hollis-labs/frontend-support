import { expect, it } from 'vitest'
import { defineBindingTable, resolve } from '@hollis-labs/design-bindings'
import { genuiBinding } from '../src/bindings'

it('uses the existing binding owner and requires host admission', () => {
  const spec = {contractDigest:'canonical-genui-1',resolverConfig:{inlinePayloadLimitBytes:262144},rows:[],defaults:[genuiBinding]}
  const refused = defineBindingTable({...spec,trust:()=>({quarantine:'Host did not admit this renderer.'})})
  const granted = defineBindingTable({...spec,trust:()=>({admit:'host-primitive'})})
  expect(resolve(refused,'genui.declarative-surface',{version:'1.0.0',origin:'agent'}).ok).toBe(false)
  const drawable = resolve(granted,'genui.declarative-surface',{version:'1.0.0',origin:'agent'})
  expect(drawable.ok).toBe(true)
  expect(resolve(granted,'genui.declarative-surface',{version:'2.0.0',origin:'agent'}).ok).toBe(false)
})
