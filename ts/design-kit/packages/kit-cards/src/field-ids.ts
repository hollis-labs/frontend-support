/** Derived ids for a Field's hint and error, so controls can point `aria-describedby` at them. */
export function fieldIds(id: string) {
  return { hint: `${id}-hint`, error: `${id}-error` } as const
}

/** `aria-describedby` for a control inside a `Field`. */
export function fieldDescribedBy(id: string, parts: { hint?: boolean; error?: boolean }): string | undefined {
  const ids = fieldIds(id)
  const list = [parts.hint ? ids.hint : null, parts.error ? ids.error : null].filter(Boolean)
  return list.length ? list.join(' ') : undefined
}

