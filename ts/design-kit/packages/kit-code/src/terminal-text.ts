/**
 * Text handling for `/terminal`. Original Hollis Labs code (MIT), not vendored.
 *
 * Terminal output is untrusted: a tool, a package script or a remote host wrote it. Two things are
 * done to it before it reaches the ANSI renderer, and a third for the clipboard.
 *
 * 1. `sanitizeForDisplay` keeps colour and text styling (SGR, `ESC [ ... m`) and the characters a
 *    terminal lays out (`\n \t \b \r`) and removes everything else that is a control sequence: window
 *    titles, OSC 8 hyperlinks, cursor and screen control, device strings, stray ESC and C0/C1 control
 *    bytes. The renderer would otherwise print an OSC payload (`javascript:...`) as visible text.
 * 2. `normalizeLineControls` makes the peer's own `\r` and `\b` helpers cheap. In ansi-to-react 6.2.6 (via escape-carriage 1.3.1)
 *    `/\r+\n/gm` is quadratic on a run of carriage returns: a line of 65,536 of them takes ~6 s, and the other helper loops add a
 *    log-factor of passes. A length cap alone does not stop that, so the controls are normalised here in linear time and the peer
 *    never sees a run. See docs/terminal-evidence/security-audit.md.
 * 3. `tailOf` bounds the work: the renderer builds one DOM element per styled run, so cost grows with
 *    the input. Measured with ansi-to-react 6.2.6 on a hostile input of one colour change per six
 *    characters, rendering took ~0.2 s at 96 KB and ~8.6 s at 6 MB. Only the last `maxChars` are shown.
 * 4. `toCopyText` strips every control sequence, so what is copied is the text the user sees, not
 *    bytes that a terminal would execute when pasted.
 *
 * Every pattern here is linear: the character classes inside one sequence are disjoint, there is no
 * nested quantifier and no alternation that overlaps, so nothing can backtrack on hostile input.
 */

// ESC-introduced sequences, shared by both patterns below. In order:
//   OSC    ESC ] ... (BEL | ESC \)          title, hyperlink; at most 4096 payload characters, as terminals bound it, so an
//                                           unterminated one cannot swallow the output that follows
//   DCS... ESC P|X|^|_ ... (ESC \)          device control, SOS, PM, APC; same bound
//   CSI    ESC [ params intermediates final parameter bytes 0x30-0x3F, intermediates 0x20-0x2F, final 0x40-0x7E
//   two    ESC + one byte 0x30-0x7E         two-byte escapes (save cursor, reset, index, ...); `[` and the string openers come first
//   tail   ESC with an unfinished sequence at the very end of the text (output still streaming)
//   other  a lone ESC that starts none of the above, including an ESC before `[` or `]` whose sequence is malformed
//          (display keeps an ESC only when it begins a complete SGR; copy keeps none)
const OSC = String.raw`\][^\x07\x1b]{0,4096}(?:\x07|\x1b\\)?`
const DEVICE = String.raw`[PX^_][^\x1b]{0,4096}(?:\x1b\\)?`
const FE = String.raw`[0-Z\\-~]`
const UNFINISHED_AT_END = String.raw`(?:\[[0-?]*[ -/]*|\][^\x07\x1b]*|[PX^_][^\x1b]*)?$`
// C0 controls except \b \t \n \r (ESC is handled above), DEL, the C1 range (U+009B is a one-character CSI), and the
// bidirectional embedding/override/isolate controls (U+202A-202E, U+2066-2069), which can reorder what the user reads.
const CONTROLS = String.raw`[\x00-\x07\x0b\x0c\x0e-\x1a\x1c-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]`

// What display keeps: `ESC [ digits ; : m`, a complete colour/style sequence, and nothing else that starts with ESC.
const SGR_PARAMS = String.raw`[0-9;:]*m`

/** Every complete CSI except a plain SGR, and every ESC that does not begin one: SGR (colour and style) survives, nothing else. */
const DISPLAY = new RegExp(
  String.raw`\x1b(?:${OSC}|${DEVICE}|\[(?!${SGR_PARAMS})[0-?]*[ -/]*[@-~]|${FE}|${UNFINISHED_AT_END}|(?!\[${SGR_PARAMS}))|${CONTROLS}`,
  'g',
)
/** Every complete CSI, SGR included, and an unconditional fallback for any ESC left over: no control byte can survive. */
const ALL = new RegExp(
  String.raw`\x1b(?:${OSC}|${DEVICE}|\[[0-?]*[ -/]*[@-~]|${FE}|${UNFINISHED_AT_END})?|${CONTROLS}`,
  'g',
)

/**
 * Keep SGR colour and style, `\n \t \b \r` and text; drop every other control sequence and control byte. Every ESC left in the
 * result begins a complete `ESC [ digits ; : m`, including after malformed input (`ESC [ 3 1 \n`, `ESC [ ESC [ 3 1 m`, ...).
 */
export function sanitizeForDisplay(text: string): string {
  return text.replace(DISPLAY, '')
}

// "\b" preceded by any character but a newline: the peer's backspace rule (it removes both), applied until nothing changes.
const BACKSPACE_PAIR = new RegExp(String.raw`[^\n]\x08`, 'g')
/**
 * The loop converges in about log2(length) passes (exhaustively over every string of three symbols up to length 13 the worst
 * case is 4), so 32 passes is far beyond any real input and still bounds the work if one were ever found.
 */
const MAX_BACKSPACE_PASSES = 32

/**
 * Prepare `\r` and `\b` for the peer, in linear time, with the result the peer itself would produce. It does its work in this
 * order (backspaces, then carriage returns), and so does this:
 * - backspaces are applied by the peer's own rule until nothing changes, in a bounded number of passes. A `\b` left over (one at
 *   the start of a line, with nothing before it to erase) stays, because the peer counts it as a character when a later `\r`
 *   overwrites the line; it is invisible. Should the pass limit ever be reached, the remaining backspaces are dropped instead;
 * - a run of carriage returns becomes one: both of the peer's helpers read `\r+` as a single separator, so this is exact, and it
 *   removes the quadratic scan. Carriage returns at the very end of the text are dropped: there is nothing for them to overwrite
 *   yet (the next chunk of a stream will fold in properly), and the peer would leave each as a literal character, which CSS
 *   `pre-wrap` can show as a space;
 * After this the peer's helpers find no pair to erase and no run, so neither loops. `src/terminal-text.test.ts` checks the result
 * against the peer on thousands of random inputs.
 */
export function normalizeLineControls(text: string): string {
  let out = text
  if (out.includes('\b')) {
    let converged = false
    for (let pass = 0; pass < MAX_BACKSPACE_PASSES; pass += 1) {
      const next = out.replace(BACKSPACE_PAIR, '')
      if (next.length === out.length) {
        converged = true
        break
      }
      out = next
    }
    if (!converged) {
      out = out.replaceAll('\b', '')
    }
  }
  if (!out.includes('\r')) {
    return out
  }
  out = out.replace(/\r{2,}/g, '\r')
  // By index, not `/\r+$/`: that pattern rescans a whole run from every position inside it.
  let end = out.length
  while (end > 0 && out.charCodeAt(end - 1) === 13) {
    end -= 1
  }
  return end === out.length ? out : out.slice(0, end)
}

/**
 * Everything the renderer needs done to untrusted text, in the order that keeps its guarantee: sanitise, normalise, sanitise
 * again, then drop what backspaces left. Applying a backspace can erase the final `m` of a colour sequence and leave its ESC
 * behind, and that ESC must not reach the DOM; a backspace with nothing before it to erase survives `normalizeLineControls` (it
 * keeps exactly what the peer would) and is an invisible control character, so it goes too. Every step is linear, and the
 * later ones run over text that is already clean apart from those cases. The result holds no control byte but `\t \n \r`
 * and no ESC that does not begin a complete colour sequence.
 */
export function prepareForDisplay(text: string): string {
  return sanitizeForDisplay(normalizeLineControls(sanitizeForDisplay(text))).replaceAll('\b', '')
}

/** The text a user would select: no control sequences or control bytes at all, `\r\n` and `\r` as newlines, `\b` gone. */
export function toCopyText(text: string): string {
  return text.replace(ALL, '').replace(/\r\n?/g, '\n').replaceAll('\x08', '')
}

/** The last `maxChars` of `text`, starting on a line boundary when one is near, never inside a surrogate pair. */
export function tailOf(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { text, truncated: false }
  }

  const cut = text.length - maxChars
  const newline = text.indexOf('\n', cut)
  let start = newline !== -1 && newline - cut < maxChars / 2 ? newline + 1 : cut
  const unit = text.charCodeAt(start)
  if (unit >= 0xdc00 && unit <= 0xdfff) {
    start += 1 // the cut fell between the halves of a surrogate pair
  }
  return { text: text.slice(start), truncated: true }
}
