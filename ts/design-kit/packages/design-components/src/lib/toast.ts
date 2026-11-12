import { toast } from 'sonner'

/**
 * Toast lives in this package, NOT in `design-app-runtime`, and the epic's
 * package table was wrong about it.
 *
 * It wraps `sonner`, and it only does anything when `ui/sonner.tsx`'s `<Toaster/>`
 * is mounted. Filing it under transport would put a base component's required
 * runtime in a package that base does not depend on — an import that works in
 * development because everything is installed, and fails for the first consumer
 * who takes the runtime without the components. They ship together because they
 * are one thing.
 */

/**
 * Unwrap a thrown value into user-facing text. The single place to extend
 * when the API starts returning structured errors (`{ code, message, … }`).
 */
function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err.length > 0) return err
  return fallback
}

/** Show an error toast — call from `catch` blocks with a fallback message. */
export function notifyError(err: unknown, fallback: string): void {
  toast.error(extractMessage(err, fallback))
}

/** Show a success toast. */
export function notifySuccess(message: string): void {
  toast.success(message)
}
