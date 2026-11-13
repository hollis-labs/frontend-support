export const GENERIC_ERROR_MESSAGE = 'The request could not be completed.'
export const NETWORK_ERROR_MESSAGE = 'Could not reach the server. Check your connection and try again.'

/** Every non-2xx response, as the flat `{code, message, details?}` body the identity module returns. */
export class IdentityError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown
  /** Seconds until a retry is allowed, from the `Retry-After` header (429, 503); absent when not sent or unreadable. */
  readonly retryAfter?: number

  constructor(status: number, code: string, message: string, details?: unknown, retryAfter?: number) {
    super(message)
    this.name = 'IdentityError'
    this.status = status
    this.code = code
    this.details = details
    if (retryAfter !== undefined) this.retryAfter = retryAfter
  }
}

/** `Retry-After` as seconds from `now`: delta-seconds or an HTTP date. `undefined` when absent or unreadable. */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | undefined {
  const text = value?.trim() ?? ''
  if (text === '') return undefined
  if (/^\d+$/.test(text)) return Number(text)
  const at = Date.parse(text)
  return Number.isNaN(at) ? undefined : Math.max(0, Math.ceil((at - now) / 1000))
}

/** "Try again in 45 seconds." / "Try again in 3 minutes (at 14:05)." */
export function retryAfterText(seconds: number, now: number = Date.now()): string {
  if (seconds < 1) return 'Try again now.'
  if (seconds < 60) return `Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`
  const minutes = Math.ceil(seconds / 60)
  const at = new Date(now + seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `Try again in ${minutes} minute${minutes === 1 ? '' : 's'} (at ${at}).`
}

/** The only text the UI shows for a failure; never a raw body. A rate limit with `Retry-After` says when to try again. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof IdentityError)) return GENERIC_ERROR_MESSAGE
  if (error.status !== 429 || error.retryAfter === undefined) return error.message
  return `${error.message}${/[.!?]$/.test(error.message) ? '' : '.'} ${retryAfterText(error.retryAfter)}`
}

/** A 403 from the auth guard or identity handler that means "you may not use this", as opposed to bad input. */
export function isDenied(error: unknown): boolean {
  return error instanceof IdentityError && error.status === 403 && error.code !== 'bad_origin' && error.code !== 'csrf'
}
