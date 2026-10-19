/** Opt-in Shiki core adapter. One host-owned instance; no global caches or grammar downloads. */
import { createCssVariablesTheme, createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { LanguageInput } from "shiki/core";
import type { CodeHighlighter, HighlightResult } from "./highlighter-types";

const aliases: Record<string, string> = {
  foreground: "fg",
  background: "bg",
  "token-comment": "fg-muted",
  "token-string": "syntax-string",
  "token-keyword": "syntax-key",
  "token-constant": "syntax-number",
  "token-function": "primary",
  "token-parameter": "fg-secondary",
  "token-punctuation": "fg-muted",
  "token-string-expression": "syntax-string",
  "token-link": "primary",
};
function contractColor(value: string) {
  return value.replace(
    /var\(--shiki-([^)]+)\)/g,
    (_, name: string) => `var(--color-${aliases[name] ?? "fg"})`,
  );
}
export function createCodeTheme() {
  const theme = createCssVariablesTheme({
    name: "hollis-contract",
    fontStyle: false,
  });
  theme.colors = Object.fromEntries(
    Object.entries(theme.colors ?? {}).map(([name, value]) => [
      name,
      contractColor(value),
    ]),
  );
  theme.tokenColors = (theme.tokenColors ?? []).map((rule) => ({
    ...rule,
    settings: {
      ...rule.settings,
      ...(rule.settings.foreground
        ? { foreground: contractColor(rule.settings.foreground) }
        : {}),
    },
  }));
  theme.tokenColors.push(
    {
      scope: ["string"],
      settings: { foreground: "var(--color-syntax-string)" },
    },
    {
      scope: ["constant.numeric"],
      settings: { foreground: "var(--color-syntax-number)" },
    },
    {
      scope: ["constant.language.boolean", "constant.language.json"],
      settings: { foreground: "var(--color-syntax-boolean)" },
    },
    {
      scope: ["constant.language.null"],
      settings: { foreground: "var(--color-syntax-null)" },
    },
  );
  return theme;
}
export async function createCodeHighlighter({
  langs,
}: {
  langs: LanguageInput[];
}): Promise<CodeHighlighter & { dispose(): void }> {
  const theme = createCodeTheme();
  const engine = await createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    themes: [theme],
    langs,
  });
  let disposed = false;
  return {
    name: "shiki",
    type: "code-highlighter",
    getThemes: () => [theme, theme],
    getSupportedLanguages: () => (disposed ? [] : engine.getLoadedLanguages()),
    supportsLanguage: (language) =>
      !disposed &&
      (language === "text" ||
        language === "plaintext" ||
        engine.getLoadedLanguages().includes(language)),
    highlight: ({ code, language }): HighlightResult | null => {
      if (disposed) return null;
      try {
        return engine.codeToTokens(code, {
          lang: engine.getLoadedLanguages().includes(language)
            ? language
            : "text",
          theme: theme.name!,
        });
      } catch {
        return null;
      }
    },
    dispose: () => {
      if (!disposed) {
        disposed = true;
        engine.dispose();
      }
    },
  };
}
export type { CodeHighlighter, HighlightResult } from "./highlighter-types";
