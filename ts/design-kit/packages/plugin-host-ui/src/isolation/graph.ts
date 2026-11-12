import { parse } from 'es-module-lexer/js'
/** Syntax graph admission only. This does not restrict arbitrary JS once admitted. */
export async function reviewFrameModule(bytes: Uint8Array, approvedSpecifiers: readonly string[]): Promise<void> {
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  const [imports] = parse(source)
  for (const entry of imports) {
    // import.meta.url would give a data URL; resolving assets relative to it is not supported.
    if (entry.d === -2) throw new Error('unsupported-variant')
    if (!entry.n || !approvedSpecifiers.includes(entry.n) || /^(?:[./]|[a-z][a-z0-9+.-]*:)/iu.test(entry.n) || /[\s\\?#]/u.test(entry.n)) throw new Error('unsupported-variant')
  }
}
