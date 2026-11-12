/**
 * CLI integration tests for scripts/ratchet.mjs.
 *
 * These spawn the script in a real subprocess against a temp directory, so
 * they test the fail-closed guards that the unit tests cannot reach (argument
 * parsing, ESLint invocation, exit codes).
 *
 * The tests use Node's built-in test runner and a real temp dir under os.tmpdir().
 * They do NOT use any live project source — all fixtures are written inline.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPT = resolve(__dirname, '../scripts/ratchet.mjs')
const ROOT_DIR = resolve(__dirname, '../') // package root has typescript-eslint installed

/**
 * Run the ratchet script synchronously and return { stdout, stderr, status }.
 * The script is always run with --no-colors --quiet to keep assertions simple.
 */
function run(args, { cwd = tmpdir() } = {}) {
  const result = spawnSync(
    process.execPath,
    [SCRIPT, '--no-colors', ...args],
    { cwd, encoding: 'utf8' },
  )
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? -1,
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** A minimal .js file with no violations. */
const CLEAN_JS = 'const x = "bg-fg text-surface"\n'

/** A .js file with 2 hex literals → 2 no-color-literal violations. */
const DIRTY_JS = 'const x = "#abc123"\nconst y = "#ff0000"\n'

/** A file that is not valid JS/TS — ESLint will report a parse error. */
const UNPARSEABLE = 'function { broken syntax !!! )\n'

// ─── Test setup ───────────────────────────────────────────────────────────────

let tmpRoot
let srcDir
let baselineFile

before(() => {
  // Create a temp root with a src/ subdir
  tmpRoot = mkdtempSync(join(tmpdir(), 'ratchet-cli-test-'))
  srcDir = join(tmpRoot, 'src')
  mkdirSync(srcDir, { recursive: true })
  baselineFile = join(tmpRoot, '.eslint-design-baseline.json')
})

after(() => {
  try { rmSync(tmpRoot, { recursive: true, force: true }) } catch { /* ignore */ }
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ratchet CLI — exit codes', () => {
  // ── Guard: missing / wrong path ─────────────────────────────────────────────

  it('exits 2 with a clear message when no files are linted (non-existent path)', () => {
    const r = run([
      '--no-config',
      '--root', tmpRoot,
      '--baseline', baselineFile,
      'does-not-exist',
    ], { cwd: ROOT_DIR })
    assert.equal(r.status, 2, `expected exit 2, got ${r.status}\nstderr: ${r.stderr}`)
    assert.ok(
      r.stderr.includes('no files were linted'),
      `expected "no files were linted" in stderr, got:\n${r.stderr}`,
    )
    assert.ok(
      r.stderr.includes('does-not-exist'),
      `expected the path name in stderr, got:\n${r.stderr}`,
    )
  })

  // ── Guard: unparseable file ──────────────────────────────────────────────────

  it('exits 2 when a file cannot be parsed, listing the offending file', () => {
    writeFileSync(join(srcDir, 'broken.js'), UNPARSEABLE)

    const r = run([
      '--no-config',
      '--root', tmpRoot,
      '--baseline', join(tmpRoot, 'baseline-parse-test.json'),
      'src',
    ], { cwd: ROOT_DIR })

    // Restore
    rmSync(join(srcDir, 'broken.js'))

    assert.equal(r.status, 2, `expected exit 2, got ${r.status}\nstderr: ${r.stderr}`)
    assert.ok(
      r.stderr.includes('could not be parsed') || r.stderr.includes('parse error'),
      `expected parse-error message in stderr, got:\n${r.stderr}`,
    )
  })

  // ── First run: no baseline, over-zero violations → still exit 2? No: see below ──
  // A first run (no baseline) with violations fails because baseline is treated
  // as 0 per rule, so any non-zero count is a regression. This is intentional:
  // the user must run --update to record their starting point.

  it('exits 1 when violations exceed baseline', () => {
    // Write a clean file, record a zero baseline
    writeFileSync(join(srcDir, 'a.js'), CLEAN_JS)
    run(['--no-config', '--root', tmpRoot, '--baseline', baselineFile, '--update', 'src'], { cwd: ROOT_DIR })

    // Now add a dirty file — violations above the baseline
    writeFileSync(join(srcDir, 'b.js'), DIRTY_JS)
    const r = run([
      '--no-config',
      '--root', tmpRoot,
      '--baseline', baselineFile,
      'src',
    ], { cwd: ROOT_DIR })

    // Restore
    rmSync(join(srcDir, 'b.js'))

    assert.equal(r.status, 1, `expected exit 1, got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`)
    assert.ok(r.stdout.includes('FAIL'), `expected FAIL in output, got:\n${r.stdout}`)
  })

  it('exits 0 when violations match the baseline exactly', () => {
    // Baseline is already at the clean level (from previous test). Clean file is in place.
    // Re-record to be sure.
    writeFileSync(join(srcDir, 'a.js'), CLEAN_JS)
    run(['--no-config', '--root', tmpRoot, '--baseline', baselineFile, '--update', 'src'], { cwd: ROOT_DIR })

    const r = run([
      '--no-config',
      '--root', tmpRoot,
      '--baseline', baselineFile,
      'src',
    ], { cwd: ROOT_DIR })

    assert.equal(r.status, 0, `expected exit 0, got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`)
    assert.ok(r.stdout.includes('ok'), `expected "ok" in output, got:\n${r.stdout}`)
  })

  it('exits 0 when violations decrease below baseline (improvement)', () => {
    // Record a baseline with 2 violations
    writeFileSync(join(srcDir, 'a.js'), DIRTY_JS)
    run(['--no-config', '--root', tmpRoot, '--baseline', baselineFile, '--update', 'src'], { cwd: ROOT_DIR })

    // Remove the dirty file — now zero violations, below baseline
    writeFileSync(join(srcDir, 'a.js'), CLEAN_JS)
    const r = run([
      '--no-config',
      '--root', tmpRoot,
      '--baseline', baselineFile,
      'src',
    ], { cwd: ROOT_DIR })

    assert.equal(r.status, 0, `expected exit 0, got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`)
    assert.ok(r.stdout.includes('ok'), `expected "ok" in output, got:\n${r.stdout}`)
  })

  // ── --update writes baseline and exits 0 ────────────────────────────────────

  it('--update exits 0 and writes the baseline file', () => {
    writeFileSync(join(srcDir, 'a.js'), CLEAN_JS)
    const bl = join(tmpRoot, 'update-test-baseline.json')
    const r = run([
      '--no-config',
      '--root', tmpRoot,
      '--baseline', bl,
      '--update',
      'src',
    ], { cwd: ROOT_DIR })
    assert.equal(r.status, 0, `expected exit 0 from --update, got ${r.status}\nstderr: ${r.stderr}`)
    // File should exist and parse
    const parsed = JSON.parse(readFileSync(bl, 'utf8'))
    assert.equal(parsed.version, 1)
    assert.ok(typeof parsed.counts === 'object')
  })

  // ── Usage error ─────────────────────────────────────────────────────────────

  it('exits 2 with usage message when no path is given', () => {
    const r = run([], { cwd: ROOT_DIR })
    assert.equal(r.status, 2)
    assert.ok(r.stderr.includes('usage'))
  })
})
