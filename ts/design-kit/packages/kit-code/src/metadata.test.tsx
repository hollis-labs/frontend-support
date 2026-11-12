import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Commit,
  CommitHeader,
  CommitActions,
  CommitCopyButton,
  CommitContent,
  CommitTimestamp,
  CommitFileStatus,
  CommitFileAdditions,
  CommitFileDeletions,
} from "./commit";
import {
  Agent,
  AgentInstructions,
  AgentTools,
  AgentTool,
  AgentOutput,
} from "./agent";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("Commit", () => {
  it("copies the current exact hash outside controlled disclosure activation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const change = vi.fn();
    const view = (hash: string) => (
      <Commit open={false} onOpenChange={change}>
        <CommitHeader>
          Change
          <CommitActions>
            <CommitCopyButton hash={hash} />
          </CommitActions>
        </CommitHeader>
        <CommitContent>Files</CommitContent>
      </Commit>
    );
    const { rerender, container } = render(view("old-hash"));
    fireEvent.click(screen.getByRole("button", { name: "Copy commit hash" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("old-hash"));
    expect(change).not.toHaveBeenCalled();
    expect(container.querySelector("button button")).toBeNull();
    rerender(view("new-hash"));
    fireEvent.click(screen.getByRole("button", { name: "Copy commit hash" }));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("new-hash"));
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(change.mock.calls[0][0]).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Change" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });
  it("guards invalid dates and nonfinite change counts while exposing status names", () => {
    const { container } = render(
      <div>
        <CommitTimestamp date={new Date(NaN)} />
        <CommitFileStatus status="renamed" />
        <CommitFileAdditions count={NaN} />
        <CommitFileDeletions count={Infinity} />
      </div>,
    );
    expect(screen.getByText("Unknown date")).toBeTruthy();
    expect(container.querySelector("time")!.hasAttribute("datetime")).toBe(
      false,
    );
    expect(screen.getByLabelText("renamed").textContent).toBe("R");
    expect(container.textContent).not.toContain("NaN");
    expect(container.textContent).not.toContain("Infinity");
  });
  it("retains a machine-readable timestamp and caller content", () => {
    const date = new Date("2026-10-02T12:00:00Z");
    const { container } = render(
      <CommitTimestamp date={date}>Reviewed</CommitTimestamp>,
    );
    expect(container.querySelector("time")!.dateTime).toBe(date.toISOString());
    expect(screen.getByText("Reviewed")).toBeTruthy();
  });
});
describe("Agent", () => {
  it("presents inert instructions and local schema values with independent disclosures", async () => {
    const tool = {
      description: "Read file",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "<img src=x onerror=alert(1)>" },
        },
      },
    };
    const { container } = render(
      <Agent>
        <AgentInstructions>{"<script>alert(1)</script>"}</AgentInstructions>
        <AgentTools>
          <AgentTool tool={tool} />
          <AgentTool
            tool={{ description: "Search", inputSchema: { query: "needle" } }}
          />
        </AgentTools>
        <AgentOutput schema={{ enabled: true, missing: null, count: 3 }} />
      </Agent>,
    );
    const read = screen.getByRole("button", { name: "Read file" }),
      search = screen.getByRole("button", { name: "Search" });
    fireEvent.click(read);
    await waitFor(() => expect(container.textContent).toContain('"path"'));
    fireEvent.click(search);
    await waitFor(() => expect(container.textContent).toContain('"query"'));
    expect(read.getAttribute("aria-expanded")).toBe("true");
    expect(search.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector("script,img")).toBeNull();
    expect(container.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(container.textContent).toContain('"enabled": true');
    expect(container.querySelector("span.text-syntax-boolean")).toBeTruthy();
  });
  it("waits for a controlled host and tolerates a circular schema through JsonViewer fallback", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const change = vi.fn();
    const { rerender } = render(
      <AgentTool
        tool={{ inputSchema: circular }}
        open={false}
        onOpenChange={change}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "No description" }));
    expect(change.mock.calls[0][0]).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "No description" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    rerender(<AgentTool tool={{ inputSchema: circular }} open />);
    await waitFor(() =>
      expect(screen.getByText("[object Object]")).toBeTruthy(),
    );
  });
});
