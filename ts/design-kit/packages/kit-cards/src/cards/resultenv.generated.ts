// Generated from fixtures/shared-resultenv/resultenv.schema.json (1173849de14da845e483400009b77a2c25c55cfbef2f81c01b21a7a6d008ee19). Run: node scripts/check-resultenv-schema.mjs --write
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
  readonly error?: { readonly code: string; readonly message: string }
  readonly redact?: readonly string[]
}
