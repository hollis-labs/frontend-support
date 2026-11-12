import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FileTree,
  FileTreeFolder,
  FileTreeFile,
  FileTreeActions,
} from "./file-tree";
import {
  StackTrace,
  StackTraceHeader,
  StackTraceContent,
  StackTraceFrames,
  StackTraceActions,
  StackTraceCopyButton,
} from "./stack-trace";
import {
  TestResults,
  TestResultsProgress,
  TestResultsDuration,
  TestSuite,
  TestSuiteName,
  TestSuiteContent,
  Test,
} from "./test-results";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("FileTree", () => {
  it("requests immutable controlled expansion and waits for the host", async () => {
    const expanded = new Set<string>();
    const change = vi.fn();
    const tree = (value: Set<string>) => (
      <FileTree expanded={value} onExpandedChange={change}>
        <FileTreeFolder path="src" name="src">
          <FileTreeFile path="src/main.ts" name="main.ts" />
        </FileTreeFolder>
      </FileTree>
    );
    const { rerender } = render(tree(expanded));
    fireEvent.click(screen.getByRole("button", { name: "Expand src" }));
    expect(change).toHaveBeenCalledWith(new Set(["src"]));
    expect(expanded.size).toBe(0);
    expect(
      screen
        .getByRole("button", { name: "Expand src" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    rerender(tree(change.mock.calls[0][0]));
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Collapse src" })
          .getAttribute("aria-expanded"),
      ).toBe("true"),
    );
    expect(screen.getByText("main.ts")).toBeTruthy();
  });
  it("separates row actions from selection and exposes honest native controls", () => {
    const select = vi.fn(),
      action = vi.fn();
    const { container } = render(
      <FileTree onSelect={select} selectedPath="main.ts">
        <FileTreeFile path="main.ts" name="main.ts">
          <FileTreeActions>
            <button onClick={action}>Inspect</button>
          </FileTreeActions>
        </FileTreeFile>
      </FileTree>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Inspect" }));
    expect(action).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
    const file = screen.getByRole("button", { name: "main.ts" });
    expect(file.getAttribute("aria-current")).toBe("true");
    fireEvent.click(file);
    expect(select).toHaveBeenCalledWith("main.ts");
    expect(container.querySelector("button button")).toBeNull();
    expect(container.querySelector('[role="tree"]')).toBeNull();
  });
});
describe("StackTrace", () => {
  it("retains crafted long frames as unknown text without regex backtracking", () => {
    const crafted = "at " + "a (".repeat(32000);
    const longValid = crafted + "/src/main.ts:1:2)";
    const started = performance.now();
    const { container } = render(
      <StackTrace
        trace={`Error: oversized\n${crafted}\n${longValid}`}
        defaultOpen
        onFilePathClick={vi.fn()}
      >
        <StackTraceContent>
          <StackTraceFrames />
        </StackTraceContent>
      </StackTrace>,
    );
    // Even the syntactically valid long frame stays unknown rather than becoming
    // a host-navigation button. Both complete raw lines remain visible as text.
    expect(container.textContent).toContain(crafted);
    expect(container.textContent).toContain(longValid);
    expect(screen.queryByRole("button")).toBeNull();
    expect(performance.now() - started).toBeLessThan(2000);
  });
  it.each([
    ["spaces", (n: number) => "at " + " ".repeat(n) + "("],
    ["open delimiters", (n: number) => "at " + " (".repeat(n) + "broken)"],
    ["colon coordinates", (n: number) => "at f (/x" + ":1".repeat(n) + ":nope)"],
    ["closing delimiters", (n: number) => "at f (/x:1:2" + ")".repeat(n)],
  ])("finishes 100 fuzzed %s frames and retains unknown text", (_name, shape) => {
    // Vary lengths below the cap, including the independently reproduced 989-char line.
    const frames = Array.from({ length: 100 }, (_, i) => shape(i === 99 ? 985 : 200 + i * 7));
    const started = performance.now();
    const { container } = render(
      <StackTrace trace={["Error: malformed", ...frames].join("\n")} defaultOpen onFilePathClick={vi.fn()}>
        <StackTraceContent><StackTraceFrames /></StackTraceContent>
      </StackTrace>,
    );
    expect(performance.now() - started).toBeLessThan(2000);
    for (const frame of frames) expect(container.textContent).toContain(frame);
    expect(screen.queryByRole("button")).toBeNull();
  });
  it.each([
    ["at run (/src/main.ts:12:4)", "run", "/src/main.ts", 12, 4, false],
    ["at /src/main.ts:0:2", null, "/src/main.ts", 0, 2, false],
    ["at process (node:internal/task_queues:95:5)", "process", "node:internal/task_queues", 95, 5, true],
    ["at dependency (/app/node_modules/pkg/index.js:1:2)", "dependency", "/app/node_modules/pkg/index.js", 1, 2, true],
    ["at C:\\x\\y.ts:1:2", null, "C:\\x\\y.ts", 1, 2, false],
  ])("preserves normal frame equivalence: %s", (frame, fn, path, line, column, internal) => {
    const navigate = vi.fn();
    const view = (showInternalFrames: boolean) => (
      <StackTrace trace={frame} defaultOpen onFilePathClick={navigate}>
        <StackTraceContent><StackTraceFrames showInternalFrames={showInternalFrames} /></StackTraceContent>
      </StackTrace>
    );
    const { container, rerender } = render(view(true));
    expect(container.textContent).toBe(frame);
    if (fn) expect(container.textContent).toContain(`${fn} (`);
    fireEvent.click(screen.getByRole("button", { name: `${path}:${line}:${column}` }));
    expect(navigate).toHaveBeenCalledWith(path, line, column);
    rerender(view(false));
    expect(screen.queryByRole("button") === null).toBe(internal);
  });
  const trace =
    "Error: broken\n    at run (C:\\src\\main.ts:12:4)\nunknown frame <img src=x>\n    at huge (/src/x.ts:99999999999999999999:2)";
  it("retains unknown frames as text and delegates valid coordinates to the host", () => {
    const navigate = vi.fn();
    const { container } = render(
      <StackTrace trace={trace} defaultOpen onFilePathClick={navigate}>
        <StackTraceHeader>Details</StackTraceHeader>
        <StackTraceContent>
          <StackTraceFrames />
        </StackTraceContent>
      </StackTrace>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "C:\\src\\main.ts:12:4" }),
    );
    expect(navigate).toHaveBeenCalledWith("C:\\src\\main.ts", 12, 4);
    expect(screen.getByText("unknown frame <img src=x>")).toBeTruthy();
    expect(
      screen.getByText("at huge (/src/x.ts:99999999999999999999:2)"),
    ).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });
  it("keeps copying outside the trigger and copies the exact raw trace", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const change = vi.fn();
    const { container } = render(
      <StackTrace trace={trace} open={false} onOpenChange={change}>
        <StackTraceHeader>
          Details
          <StackTraceActions>
            <StackTraceCopyButton />
          </StackTraceActions>
        </StackTraceHeader>
        <StackTraceContent>
          <StackTraceFrames />
        </StackTraceContent>
      </StackTrace>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy stack trace" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(trace));
    expect(change).not.toHaveBeenCalled();
    expect(container.querySelector("button button")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Error: broken" }));
    expect(change).toHaveBeenCalledWith(true);
    expect(
      screen
        .getByRole("button", { name: "Error: broken" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });
  it("handles a trace starting with a frame and presents paths without navigation as text", () => {
    render(
      <StackTrace trace="at /app/start.ts:0:0" defaultOpen>
        <StackTraceContent>
          <StackTraceFrames />
        </StackTraceContent>
      </StackTrace>,
    );
    expect(screen.getByText("/app/start.ts:0:0")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
describe("TestResults", () => {
  it("bounds malformed progress and preserves zero duration", () => {
    const view = (total: number, passed: number, failed: number) => (
      <TestResults summary={{ total, passed, failed, skipped: 0, duration: 0 }}>
        <TestResultsProgress />
        <TestResultsDuration />
      </TestResults>
    );
    const { rerender, container } = render(view(0, 0, 0));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "0",
    );
    expect(screen.getByText("0ms")).toBeTruthy();
    rerender(view(2, 10, Infinity));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "100",
    );
    expect(container.querySelector('[style*="width: 100%"]')).toBeTruthy();
    rerender(view(NaN, -1, -1));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "0",
    );
  });
  it("opens a suite through its labelled native trigger and names statuses", async () => {
    render(
      <TestSuite name="parser" status="failed">
        <TestSuiteName />
        <TestSuiteContent>
          <Test name="escapes input" status="passed" duration={0} />
        </TestSuiteContent>
      </TestSuite>,
    );
    const trigger = screen.getByRole("button", { name: "failed parser" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByText("escapes input")).toBeTruthy());
    expect(screen.getByRole("img", { name: "passed" })).toBeTruthy();
    expect(screen.getByText("0ms")).toBeTruthy();
  });
});
