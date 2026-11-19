import type { JSONValue } from './generated'

export class ContractError extends Error {
  constructor(message = 'The GenUI message is not supported.') { super(message); this.name = 'ContractError' }
}

/** Raw-token validation happens before a JavaScript number or duplicate key can lose information. */
export function decodeJSON(input: string | Uint8Array, maxBytes: number, maxDepth = 32): JSONValue {
  let source: string
  if (typeof input === 'string') {
    if (new TextEncoder().encode(input).length > maxBytes) throw new ContractError('The GenUI message is too large.')
    source = input
  } else {
    if (input.byteLength > maxBytes) throw new ContractError('The GenUI message is too large.')
    try { source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(input) } catch { throw new ContractError() }
  }
  let pos = 0
  const fail = (): never => { throw new ContractError() }
  const whitespace = () => { while (/[\x20\t\r\n]/u.test(source[pos] ?? '\0')) pos++ }
  function string(): string {
    const start = pos++
    let escaped = false
    while (pos < source.length) {
      const c = source[pos++]
      if (c === '"' && !escaped) {
        let value: string
        try { value = JSON.parse(source.slice(start, pos)) as string } catch { return fail() }
        for (let n = 0; n < value.length; n++) {
          const unit = value.charCodeAt(n)
          if (unit >= 0xd800 && unit <= 0xdbff) {
            const next = value.charCodeAt(++n)
            if (!(next >= 0xdc00 && next <= 0xdfff)) return fail()
          } else if (unit >= 0xdc00 && unit <= 0xdfff) return fail()
        }
        if (new TextEncoder().encode(value).length > 16384) return fail()
        return value
      }
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
    }
    return fail()
  }
  function value(depth: number): JSONValue {
    if (depth > maxDepth) return fail()
    whitespace()
    const c = source[pos]
    if (c === '"') return string()
    if (c === '{') {
      pos++; whitespace()
      const result: Record<string, JSONValue> = Object.create(null) as Record<string, JSONValue>
      if (source[pos] === '}') { pos++; return result }
      for (;;) {
        whitespace()
        if (source[pos] !== '"') return fail()
        const key = string()
        if (new TextEncoder().encode(key).length > 256 || Object.hasOwn(result, key) || Object.keys(result).length >= 256) return fail()
        whitespace(); if (source[pos++] !== ':') return fail()
        result[key] = value(depth + 1)
        whitespace()
        const end = source[pos++]
        if (end === '}') return result
        if (end !== ',') return fail()
      }
    }
    if (c === '[') {
      pos++; whitespace()
      const result: JSONValue[] = []
      if (source[pos] === ']') { pos++; return result }
      for (;;) {
        if (result.length >= 256) return fail()
        result.push(value(depth + 1)); whitespace()
        const end = source[pos++]
        if (end === ']') return result
        if (end !== ',') return fail()
      }
    }
    for (const [token, decoded] of [['true', true], ['false', false], ['null', null]] as const) {
      if (source.startsWith(token, pos)) { pos += token.length; return decoded }
    }
    const token = /^-?(?:0|[1-9][0-9]*)/u.exec(source.slice(pos))?.[0]
    if (!token || token === '-0') return fail()
    pos += token.length
    const parsed = Number(token)
    if (!Number.isSafeInteger(parsed)) return fail()
    return parsed
  }
  const decoded = value(0)
  whitespace()
  if (pos !== source.length) return fail()
  return decoded
}

/** Immutable browser snapshots are presentation state, never an authorization proof. */
export function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    for (const entry of Object.values(value)) freeze(entry)
  }
  return value
}
