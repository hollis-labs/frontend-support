import { useState } from "react";
import { Button } from "@hollis-labs/design-components";
import { Terminal } from "../src/terminal";

const ESC = "\x1b";
const sgr = (codes: string, text: string) => `${ESC}[${codes}m${text}${ESC}[0m`;

const sampleOutput = [
  sgr("1", "$ npm test"),
  sgr("2", "Running 4 suites"),
  `${sgr("32", "✓")} parser accepts valid input ${sgr("2", "(12ms)")}`,
  `${sgr("32", "✓")} parser rejects bad tokens`,
  `${sgr("31", "✗")} ${sgr("31", "formatter keeps comments")}`,
  `  ${sgr("33", "warning:")} snapshot is obsolete`,
  `  ${sgr("34", "note:")} run with ${sgr("4", "--update")} to refresh`,
  `${sgr("35", "magenta")} ${sgr("36", "cyan")} ${sgr("91", "bright red")} ${sgr("1;42", " PASS ")} ${sgr("41;97", " FAIL ")} ${sgr("3", "italic")} ${sgr("9", "strike")}`,
  `${sgr("38;5;208", "256-colour falls back to plain")}  ${sgr("38;2;255;0;128", "true colour too")}`,
  "",
].join("\n");

// Output a hostile tool could print. Everything here must stay inert text.
const hostileOutput = [
  `<script>window.pwned = 1</script><img src=x onerror="window.pwned = 2">`,
  `${ESC}]8;;javascript:window.pwned=3\x07click me${ESC}]8;;\x07 (an OSC 8 link with a javascript: target)`,
  `${ESC}]0;hijacked title\x07text after a window-title sequence`,
  `https://example.com and www.example.org are not links here`,
  `${ESC}[2K${ESC}[1Aerase-line and cursor moves are dropped`,
].join("\n");

const lines = (count: number) =>
  Array.from({ length: count }, (_, i) => `${sgr("32", "ok")} line ${i + 1}`).join("\n");

export function TerminalDemo() {
  const [output, setOutput] = useState(sampleOutput);
  const [streaming, setStreaming] = useState(false);
  const [big, setBig] = useState("");
  const [renderMs, setRenderMs] = useState<number>();
  const [status, setStatus] = useState("Ready");

  const load = (text: string) => {
    const start = performance.now();
    setBig(text);
    // Measured after React has committed and the browser has laid the result out.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setRenderMs(Math.round(performance.now() - start))),
    );
  };

  return (
    <div className="space-y-6" data-terminal-demo>
      <h2 className="text-lg font-medium">Terminal — opt-in ANSI rendering</h2>
      <p role="status" data-terminal-status className="text-sm text-fg-muted">
        {status}
      </p>
      <section className="space-y-3" aria-label="Terminal sample">
        <h3 className="font-medium">Output with colour and style</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOutput((o) => `${o}${sgr("32", "ok")} appended line ${o.split("\n").length}\n`)}
          >
            Append line
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStreaming((s) => !s)}>
            {streaming ? "Stop streaming" : "Start streaming"}
          </Button>
        </div>
        <Terminal
          data-sample
          isStreaming={streaming}
          output={output}
          onClear={() => {
            setOutput("");
            setStatus("Cleared by host");
          }}
        />
      </section>
      <section className="space-y-3" aria-label="Hostile output">
        <h3 className="font-medium">Hostile output stays inert</h3>
        <Terminal data-hostile output={hostileOutput} />
      </section>
      <section className="space-y-3" aria-label="Large output">
        <h3 className="font-medium">Bounded rendering</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => load(lines(40_000))}>
            Load 40,000 lines
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => load(`${ESC}[31ma`.repeat(1_000_000))}
          >
            Load 6 MB of colour changes
          </Button>
          <span data-render-ms className="text-sm text-fg-muted">
            {renderMs === undefined ? "Nothing loaded" : `Rendered in ${renderMs} ms`}
          </span>
        </div>
        {big && <Terminal data-large output={big} />}
      </section>
    </div>
  );
}
