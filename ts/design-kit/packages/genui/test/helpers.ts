import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Call } from '../src/generated'
export const fixture = (name: string): string => readFileSync(path.resolve('contract/fixtures', `${name}.json`), 'utf8')
export function response(call: string | Call, value: unknown): string {
  const parsed = typeof call === 'string' ? JSON.parse(call) as Call : call
  return JSON.stringify({ version: '1.0', agentFunctionResponse: { functionCallId: parsed.callAgentFunction.functionCallId, value } })
}
