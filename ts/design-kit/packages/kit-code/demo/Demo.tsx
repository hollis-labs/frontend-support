import { useEffect, useState } from "react";
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from "@hollis-labs/design-tokens";
import { Button } from "@hollis-labs/design-components";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockFilename,
  CodeBlockActions,
  CodeBlockCopyButton,
  Snippet,
  SnippetInput,
  SnippetText,
  SnippetCopyButton,
} from "../src";
import { createCodeHighlighter } from "../src/highlight";
import type { CodeHighlighter } from "../src";
import typescript from "shiki/langs/typescript.mjs";
import json from "shiki/langs/json.mjs";
import bash from "shiki/langs/bash.mjs";
import "./demo.css";
import { InspectionDemo } from "./InspectionDemo";
import { TerminalDemo } from "./TerminalDemo";
import { MetadataDemo } from "./MetadataDemo";
const query = new URLSearchParams(window.location.search);
export function Demo() {
  const [theme, setTheme] = useState(query.get("theme") ?? DEFAULT_THEME_ID);
  const [mode, setMode] = useState(
    query.get("mode") === "light" ? "light" : "dark",
  );
  const [highlighter, setHighlighter] = useState<CodeHighlighter>();
  const [status, setStatus] = useState("Loading opt-in highlighter");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = mode;
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [theme, mode]);
  useEffect(() => {
    let disposed = false;
    let instance: Awaited<ReturnType<typeof createCodeHighlighter>> | undefined;
    void createCodeHighlighter({ langs: [typescript, json, bash] })
      .then((h) => {
        instance = h;
        if (disposed) {
          h.dispose();
          return;
        }
        setHighlighter(h);
        setStatus("Highlighting ready");
      })
      .catch(() => setStatus("Plain code fallback"));
    return () => {
      disposed = true;
      instance?.dispose();
    };
  }, []);
  return (
    <main className="min-h-screen bg-bg p-8 text-fg">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="text-xl font-semibold">Code presentation</h1>
        <div className="flex items-center gap-3">
          <label htmlFor="theme">Theme</label>
          <select
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="rounded-control border border-border bg-surface p-2"
          >
            {BUILTIN_THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => setMode(mode === "light" ? "dark" : "light")}
          >
            {mode}
          </Button>
        </div>
        <p role="status" className="text-sm text-fg-muted">
          {status}
        </p>
        {query.get("view") === "terminal" ? (
          <TerminalDemo />
        ) : query.get("view") === "inspection" ? (
          <InspectionDemo />
        ) : query.get("view") === "metadata" ? (
          <MetadataDemo />
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-medium">
                CodeBlock — opt-in highlighting
              </h2>
              <CodeBlock
                code={
                  'const ready: boolean = true;\nconsole.log("Hello", 42);\n'
                }
                language="typescript"
                highlighter={highlighter}
                showLineNumbers
              >
                <CodeBlockHeader>
                  <CodeBlockTitle>
                    <CodeBlockFilename>example.ts</CodeBlockFilename>
                  </CodeBlockTitle>
                  <CodeBlockActions>
                    <CodeBlockCopyButton
                      onCopy={() => setStatus("Copied code")}
                      onError={(e) => setStatus(e.message)}
                    />
                  </CodeBlockActions>
                </CodeBlockHeader>
              </CodeBlock>
              <CodeBlock
                code={'{"enabled":true,"missing":null,"count":42}'}
                language="json"
                highlighter={highlighter}
              />
            </section>
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Plain code fallback</h2>
              <CodeBlock
                code={"<script>\n  This is displayed as text.\n</script>"}
              />
            </section>
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Snippet</h2>
              <Snippet code="npm run test:run">
                <SnippetText>$</SnippetText>
                <SnippetInput aria-label="Command" />
                <SnippetCopyButton
                  onCopy={() => setStatus("Copied snippet")}
                  onError={(e) => setStatus(e.message)}
                />
              </Snippet>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
