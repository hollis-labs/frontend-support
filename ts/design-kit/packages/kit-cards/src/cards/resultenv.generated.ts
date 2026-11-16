// Generated from fixtures/shared-resultenv/resultenv.schema.json (e0bd6eb5dde103b3895fb1673514c814d0b161f73c2a901470e39a384e8980e0). Run: node scripts/check-resultenv-schema.mjs --write
export const RESULTENV_VERSION = "resultenv/v1" as const
export const RESULTENV_OUTCOMES = ["success","nonzero_exit","signal","tool_error","transport_error","timeout","cancelled","unknown","not_run"] as const
export type ResultenvOutcome = (typeof RESULTENV_OUTCOMES)[number]
export interface ResultenvEnvelope {
  readonly version: typeof RESULTENV_VERSION
  readonly outcome: ResultenvOutcome
  readonly mcp_result?: Record<string, unknown>
  readonly output_schema_ref?: string
  readonly truncation?: { readonly truncated: boolean; readonly cursor?: string }
  readonly exit_code?: number
  readonly signal?: string
  readonly cancel_requested?: boolean
  readonly cancel_confirmed?: boolean
  readonly stdout?: string
  readonly stderr?: string
  readonly combined_output?: string
  readonly error?: { readonly code: string; readonly message: string }
  readonly redact?: readonly string[]
}
