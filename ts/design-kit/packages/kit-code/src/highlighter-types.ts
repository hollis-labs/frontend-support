/** Structural highlighting seam: no Shiki or markdown dependency in the main entry. */
export interface HighlightToken {
  content: string;
  color?: string;
  fontStyle?: number;
}
export interface HighlightResult {
  tokens: HighlightToken[][];
  fg?: string;
  bg?: string;
}
export interface HighlightTheme {
  name?: string;
  colors?: Record<string, string>;
  tokenColors?: unknown[];
  type?: "light" | "dark";
}
export interface CodeHighlighter {
  name: "shiki";
  type: "code-highlighter";
  getSupportedLanguages(): string[];
  getThemes(): [HighlightTheme, HighlightTheme];
  supportsLanguage(language: string): boolean;
  highlight(
    options: {
      code: string;
      language: string;
      themes: [string | HighlightTheme, string | HighlightTheme];
    },
    callback?: (result: HighlightResult) => void,
  ): HighlightResult | null;
}
