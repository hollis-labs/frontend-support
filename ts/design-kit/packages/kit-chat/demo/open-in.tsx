import { CloudIcon, FileTextIcon } from "lucide-react";
import { OpenIn } from "../src/components/open-in";

const providers = [
  {
    id: "document",
    label: "Host document",
    href: "https://destination.example.test/document?content=host%20encoded#section",
    icon: <FileTextIcon className="size-4" />,
  },
  {
    id: "invalid",
    label: "Unsupported destination",
    href: "javascript:alert(1)",
  },
  {
    id: "workspace",
    label: "Host workspace",
    href: "https://destination.example.test/workspace",
    icon: <CloudIcon className="size-4" />,
  },
];

/** Host-owned explicit URLs and generic consumer icons; no provider defaults. */
export function OpenInDemo() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-heading font-semibold">Open in</h1>
      <p className="text-body text-fg-muted">
        Choose a host-approved destination. Activation opens a new tab.
      </p>
      <div className="flex flex-wrap gap-4">
        <OpenIn providers={providers} />
        <OpenIn providers={[]} />
      </div>
      <p className="text-body text-fg-muted">
        The unsupported destination is retained as a disabled row. The second
        trigger has an empty catalog.
      </p>
      <button type="button">Next host control</button>
    </section>
  );
}
