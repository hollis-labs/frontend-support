/** Presentation inputs. Hosts normalize wire responses and validate them once. */
export interface ObservationState {
  phase: 'idle' | 'loading' | 'ready' | 'error'
  /** Last successful response's observed time; never the last request start. */
  observedAt?: string
  /** Controlled clock. The host updates it; the kit owns no timer. */
  nowMs: number
  staleAfterMs: number
  supported?: boolean
  paused?: boolean
  /** Sanitized plain text, never a raw transport error or secret. */
  error?: string
  onRetry?: () => void
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
export type ObservationUnit = 'count' | 'bytes' | 'seconds' | 'milliseconds' | 'ratio' | 'percent'
export type ObservationKind = 'gauge' | 'counter'
/** Host-bounded, non-executable structured JSON; no remote schema loading. */
export type DiagnosticValue = null | boolean | number | string | DiagnosticValue[] | { [key: string]: DiagnosticValue }
export type DiagnosticValidation =
  | { state: 'valid' }
  | { state: 'invalid' | 'unsupported'; messages: readonly string[] }
