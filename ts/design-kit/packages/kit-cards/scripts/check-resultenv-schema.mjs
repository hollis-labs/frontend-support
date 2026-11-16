import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const root = new URL('../', import.meta.url)
const schemaSource = readFileSync(new URL('fixtures/shared-resultenv/resultenv.schema.json', root), 'utf8')
const schema = JSON.parse(schemaSource)
const properties = schema.properties
const expected = ['version', 'outcome', 'mcp_result', 'output_schema_ref', 'truncation', 'exit_code', 'signal', 'cancel_requested', 'cancel_confirmed', 'stdout', 'stderr', 'error', 'redact']
if (schema.$id !== 'https://github.com/hollis-labs/libs/agent/resultenv/schema/resultenv.schema.json' ||
    schema.additionalProperties !== false ||
    JSON.stringify(schema.required) !== JSON.stringify(['version', 'outcome']) ||
    JSON.stringify(Object.keys(properties)) !== JSON.stringify(expected) ||
    properties.version.const !== 'resultenv/v1' ||
    properties.mcp_result.type !== 'object' ||
    properties.exit_code.type !== 'integer' ||
    properties.signal.type !== 'string' ||
    properties.cancel_requested.type !== 'boolean' ||
    properties.cancel_confirmed.type !== 'boolean' ||
    properties.stdout.type !== 'string' ||
    properties.stderr.type !== 'string' ||
    properties.output_schema_ref.type !== 'string' ||
    JSON.stringify(properties.truncation.required) !== JSON.stringify(['truncated']) ||
    JSON.stringify(properties.error.required) !== JSON.stringify(['code', 'message']) ||
    JSON.stringify(properties.redact.items.pattern) !== JSON.stringify('^/')) {
  throw new Error('Shared resultenv schema changed: review the ToolResult adapter and regenerate its type contract')
}
const outcomes = properties.outcome.enum
if (!Array.isArray(outcomes) || outcomes.some((value) => typeof value !== 'string')) throw new Error('Invalid resultenv outcomes')
const digest = createHash('sha256').update(schemaSource).digest('hex')
const generated = `// Generated from fixtures/shared-resultenv/resultenv.schema.json (${digest}). Run: node scripts/check-resultenv-schema.mjs --write\n` +
  `export const RESULTENV_VERSION = ${JSON.stringify(properties.version.const)} as const\n` +
  `export const RESULTENV_OUTCOMES = ${JSON.stringify(outcomes)} as const\n` +
  `export type ResultenvOutcome = (typeof RESULTENV_OUTCOMES)[number]\n` +
  `export interface ResultenvEnvelope {\n` +
  `  readonly version: typeof RESULTENV_VERSION\n` +
  `  readonly outcome: ResultenvOutcome\n` +
  `  readonly mcp_result?: Record<string, unknown>\n` +
  `  readonly output_schema_ref?: string\n` +
  `  readonly truncation?: { readonly truncated: boolean; readonly cursor?: string }\n` +
  `  readonly exit_code?: number\n` +
  `  readonly signal?: string\n` +
  `  readonly cancel_requested?: boolean\n` +
  `  readonly cancel_confirmed?: boolean\n` +
  `  readonly stdout?: string\n` +
  `  readonly stderr?: string\n` +
  `  readonly error?: { readonly code: string; readonly message: string }\n` +
  `  readonly redact?: readonly string[]\n` +
  `}\n`
const target = new URL('src/cards/resultenv.generated.ts', root)
if (process.argv.includes('--write')) writeFileSync(target, generated)
else if (readFileSync(target, 'utf8') !== generated) throw new Error('Shared resultenv type contract is stale; review schema and regenerate')
