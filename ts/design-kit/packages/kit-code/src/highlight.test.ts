import { describe, expect, it } from "vitest";
import typescript from "shiki/langs/typescript.mjs";
import json from "shiki/langs/json.mjs";
import bash from "shiki/langs/bash.mjs";
import { createCodeHighlighter } from "./highlight";
describe("shared JS-engine highlighter", () => {
  it("renders selected grammars with only contract variable colours", async () => {
    const highlighter = await createCodeHighlighter({
      langs: [typescript, json, bash],
    });
    try {
      for (const [language, code] of [
        ["typescript", 'const text = "hello"; const n = 42;'],
        ["json", '{"enabled":true,"missing":null}'],
        ["bash", 'echo "hello"\nexport COUNT=42'],
      ]) {
        const result = highlighter.highlight({
          code,
          language,
          themes: highlighter.getThemes(),
        })!;
        expect(
          result.tokens
            .map((line) => line.map((t) => t.content).join(""))
            .join("\n"),
        ).toBe(code);
        for (const token of result.tokens.flat())
          expect(token.color).toMatch(/^var\(--color-[a-z-]+\)$/);
      }
      expect(highlighter.supportsLanguage("typescript")).toBe(true);
      expect(highlighter.supportsLanguage("unloaded-language")).toBe(false);
    } finally {
      highlighter.dispose();
    }
  });
  it("keeps equal-length source edits distinct and handles unknown grammars/disposal", async () => {
    const h = await createCodeHighlighter({ langs: [json] });
    const a = " ".repeat(100) + "true" + " ".repeat(100),
      b = " ".repeat(100) + "null" + " ".repeat(100);
    const highlight = (code: string, language = "json") =>
      h.highlight({ code, language, themes: h.getThemes() });
    const text = (code: string) =>
      highlight(code)!
        .tokens.flat()
        .map((t) => t.content)
        .join("");
    expect(text(a)).toBe(a);
    expect(text(b)).toBe(b);
    expect(highlight("raw", "unloaded")!.tokens[0][0].content).toBe("raw");
    h.dispose();
    h.dispose();
    expect(highlight("raw")).toBeNull();
  });
});
