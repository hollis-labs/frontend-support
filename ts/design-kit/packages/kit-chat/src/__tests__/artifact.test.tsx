import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DownloadIcon } from "lucide-react";
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactClose,
  ArtifactContent,
} from "../components/artifact";
import { ArtifactCard } from "../cards/artifact-card";
afterEach(cleanup);
describe("expanded Artifact shell", () => {
  it("coexists with compact ArtifactCard and renders host content verbatim", () => {
    const text = "<script>alert(1)</script>";
    render(
      <>
        <ArtifactCard name="Compact record" />
        <Artifact role="region" aria-labelledby="viewer-title">
          <ArtifactHeader>
            <div>
              <ArtifactTitle id="viewer-title">Expanded viewer</ArtifactTitle>
              <ArtifactDescription>Host metadata</ArtifactDescription>
            </div>
          </ArtifactHeader>
          <ArtifactContent aria-label="Rendered document">
            <p>{text}</p>
            <a href="#host">Host content control</a>
          </ArtifactContent>
        </Artifact>
      </>,
    );
    expect(
      screen.getByRole("heading", { name: "Compact record" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Expanded viewer" }),
    ).toBeTruthy();
    expect(screen.getByText("Host metadata")).toBeTruthy();
    expect(screen.getByText(text)).toBeTruthy();
    expect(document.querySelector("script")).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Host content control" })
        .getAttribute("href"),
    ).toBe("#host");
  });
  it("reports actions/close to the host without submitting or hiding the viewer", () => {
    const action = vi.fn(),
      close = vi.fn(),
      submit = vi.fn();
    // An untyped host's spread cannot turn action/close into navigation links.
    const renderOverride = {
      render: <a href="#override">Host rendering</a>,
      nativeButton: false,
    };
    render(
      <form onSubmit={submit}>
        <Artifact data-testid="viewer">
          <ArtifactActions>
            <ArtifactAction
              {...renderOverride}
              label="Save document"
              icon={DownloadIcon}
              onClick={action}
            />
            <ArtifactClose {...renderOverride} onClick={close} />
          </ArtifactActions>
          <ArtifactContent>Still present</ArtifactContent>
        </Artifact>
      </form>,
    );
    expect(screen.getByRole("button", { name: "Save document" }).tagName).toBe(
      "BUTTON",
    );
    expect(screen.getByRole("button", { name: "Close artifact" }).tagName).toBe(
      "BUTTON",
    );
    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save document" }));
    fireEvent.click(screen.getByRole("button", { name: "Close artifact" }));
    expect(action).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByTestId("viewer")).toBeTruthy();
    expect(screen.getByText("Still present")).toBeTruthy();
  });
  it("requires a nonempty action label independently of tooltip and keeps disabled actions inert", () => {
    expect(() =>
      render(<ArtifactAction label="  " tooltip="A hint" />),
    ).toThrow("Artifact action label must be nonempty");
    const action = vi.fn();
    render(
      <ArtifactActions>
        <ArtifactAction
          label="Copy document"
          tooltip="Copy the rendered document"
          aria-describedby="host-help"
        />
        <ArtifactAction label="Unavailable action" disabled onClick={action} />
      </ArtifactActions>,
    );
    expect(
      screen
        .getByRole("button", { name: "Copy document" })
        .getAttribute("aria-describedby"),
    ).toBe("host-help");
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Unavailable action" }));
    expect(action).not.toHaveBeenCalled();
    expect(document.querySelector("button button")).toBeNull();
  });
  it("provides a labelled keyboard-focusable native content pane and preserves host overrides", () => {
    const view = render(<ArtifactContent>Host children</ArtifactContent>);
    const pane = screen.getByRole("region", { name: "Artifact content" });
    expect(pane.tabIndex).toBe(0);
    pane.focus();
    expect(document.activeElement).toBe(pane);
    view.rerender(
      <ArtifactContent
        aria-label="Document preview"
        className="max-h-64"
        tabIndex={-1}
      >
        Next children
      </ArtifactContent>,
    );
    expect(
      screen.getByRole("region", { name: "Document preview" }).tabIndex,
    ).toBe(-1);
    expect(screen.getByText("Next children")).toBeTruthy();
  });
});
