import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenIn, OpenInItem, OpenInTrigger } from "../components/open-in";
import type { OpenInProvider } from "../components/open-in";

afterEach(cleanup);
// Real Menu items inline for jsdom; Chromium verifies popup/focus/activation.
function Items({
  providers,
  onClick,
}: {
  providers: readonly OpenInProvider[];
  onClick?: () => void;
}) {
  return (
    <OpenIn providers={providers}>
      <OpenInTrigger />
      {providers.map((provider) => (
        <OpenInItem key={provider.id} provider={provider} onClick={onClick} />
      ))}
    </OpenIn>
  );
}

describe("OpenIn host destinations", () => {
  it("preserves explicit HTTP(S) hrefs and isolates new tabs", () => {
    const providers = [
      {
        id: "secure",
        label: "Host destination",
        href: "https://example.test/open?content=host%20encoded#part",
      },
      {
        id: "local",
        label: "Local destination",
        href: "http://localhost:4000/path",
      },
    ];
    render(<Items providers={providers} />);
    for (const provider of providers) {
      const item = screen.getByRole("menuitem", { name: provider.label });
      expect(item.tagName).toBe("A");
      expect(item.getAttribute("href")).toBe(provider.href);
      expect(item.getAttribute("target")).toBe("_blank");
      expect(item.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });
  it("retains rejected destinations as inert non-link rows, including mixed-case executable schemes", () => {
    const onClick = vi.fn();
    const hrefs = [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "mailto:test@example.test",
      "/relative",
      "//example.test/path",
      "not a url",
    ];
    render(
      <Items
        providers={hrefs.map((href, index) => ({
          id: String(index),
          label: `Rejected ${index}`,
          href,
        }))}
        onClick={onClick}
      />,
    );
    for (const [index] of hrefs.entries()) {
      const item = screen.getByRole("menuitem", {
        name: `Rejected ${index} Unavailable destination`,
      });
      expect(item.tagName).not.toBe("A");
      expect(item.getAttribute("href")).toBeNull();
      expect(item.getAttribute("aria-disabled")).toBe("true");
      fireEvent.click(item);
    }
    expect(onClick).not.toHaveBeenCalled();
    expect(document.querySelector("a")).toBeNull();
  });
  it("has no default destinations and disables an empty catalog", () => {
    render(<OpenIn providers={[]} />);
    expect(
      screen.getByRole("button", { name: "Open in" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.queryByRole("menuitem")).toBeNull();
  });
  it("renders consumer icons decoratively and treats labels as text", () => {
    render(
      <Items
        providers={[
          {
            id: "custom",
            label: "<img src=x onerror=alert(1)>",
            href: "https://example.test",
            icon: <span data-testid="consumer-icon">H</span>,
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("menuitem", { name: "<img src=x onerror=alert(1)>" }),
    ).toBeTruthy();
    expect(
      screen
        .getByTestId("consumer-icon")
        .parentElement?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(document.querySelector("img")).toBeNull();
  });
  it("updates from the host catalog and supports a custom trigger label", () => {
    const view = render(
      <OpenIn providers={[]}>
        <OpenInTrigger>Choose destination</OpenInTrigger>
      </OpenIn>,
    );
    expect(
      screen
        .getByRole("button", { name: "Choose destination" })
        .hasAttribute("disabled"),
    ).toBe(true);
    view.rerender(
      <OpenIn
        providers={[
          { id: "host", label: "Host", href: "https://example.test" },
        ]}
      >
        <OpenInTrigger>Choose destination</OpenInTrigger>
      </OpenIn>,
    );
    expect(
      screen
        .getByRole("button", { name: "Choose destination" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
});
