export const GENERIC_ERROR_MESSAGE = 'The request could not be completed.'
export const NETWORK_ERROR_MESSAGE = 'Could not reach the server. Check your connection and try again.'

/** Every non-2xx response, as the flat `{code, message, details?}` body the identity module returns. */
export class IdentityError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'IdentityError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/** The only text the UI shows for a failure; never a raw body. */
export function errorMessage(error: unknown): string {
  return error instanceof IdentityError ? error.message : GENERIC_ERROR_MESSAGE
}

/** A 403 from the auth guard or identity handler that means "you may not use this", as opposed to bad input. */
export function isDenied(error: unknown): boolean {
  return error instanceof IdentityError && error.status === 403 && error.code !== 'bad_origin' && error.code !== 'csrf'
}
