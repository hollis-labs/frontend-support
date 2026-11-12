import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeBlock, CodeBlockCopyButton } from "./code-block";
import {
  Snippet,
  SnippetInput,
  SnippetCopyButton,
  SnippetText,
} from "./snippet";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("plain CodeBlock", () => {
  it("preserves whitespace and renders source as text, with hidden line numbers", () => {
    const code = ' <script>\n\talert("x")\n';
    const { container } = render(<CodeBlock code={code} showLineNumbers />);
    expect(container.querySelector("script")).toBeNull();
    const body = container.querySelector("code")!;
    expect(body.textContent).toContain("<script>");
    expect(body.querySelectorAll('[aria-hidden="true"]').length).toBe(3);
    const source = body.cloneNode(true) as HTMLElement;
    source.querySelectorAll("[aria-hidden]").forEach((node) => node.remove());
    expect(source.textContent).toBe(code);
  });
  it("falls back to plain code when a host highlighter fails", () => {
    const highlighter = {
      name: "shiki" as const,
      type: "code-highlighter" as const,
      getThemes: () => [{ name: "test" }, { name: "test" }] as [{ name: string }, { name: string }],
      getSupportedLanguages: () => [],
      supportsLanguage: () => false,
      highlight: () => {
        throw Error("unsupported");
      },
    };
    const { container } = render(
      <CodeBlock code={"hello\nworld"} highlighter={highlighter} />,
    );
    expect(container.querySelector("code")!.textContent).toBe("hello\nworld");
  });
  it("copies current exact source and blocks concurrent writes", async () => {
    let resolve!: () => void;
    const writeText = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const onCopy = vi.fn();
    const { rerender } = render(
      <CodeBlock code="old">
        <CodeBlockCopyButton onCopy={onCopy} />
      </CodeBlock>,
    );
    const button = screen.getByRole("button", { name: "Copy code" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(writeText).toHaveBeenCalledTimes(1);
    resolve();
    await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(1));
    rerender(
      <CodeBlock code="new">
        <CodeBlockCopyButton onCopy={onCopy} />
      </CodeBlock>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenLastCalledWith("new");
    resolve();
    await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(2));
  });
  it("reports a missing clipboard and lets consumer clicks cancel copying", async () => {
    vi.stubGlobal("navigator", {});
    const error = vi.fn();
    render(
      <CodeBlock code="secret">
        <CodeBlockCopyButton onError={error} />
      </CodeBlock>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await waitFor(() => expect(error).toHaveBeenCalledWith(expect.any(Error)));
    cleanup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(
      <CodeBlock code="secret">
        <CodeBlockCopyButton onClick={(e) => e.preventDefault()} />
      </CodeBlock>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).not.toHaveBeenCalled();
  });
});
describe("Snippet", () => {
  it("shows a labelled read-only command and copies the source without its prefix", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(
      <Snippet code="npm test">
        <SnippetText>$</SnippetText>
        <SnippetInput aria-label="Command" />
        <SnippetCopyButton />
      </Snippet>,
    );
    const input = screen.getByRole("textbox", {
      name: "Command",
    }) as HTMLInputElement;
    expect(input.value).toBe("npm test");
    expect(input.readOnly).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Copy snippet" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("npm test"));
  });
});
