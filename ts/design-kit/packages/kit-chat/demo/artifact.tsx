import { useState } from "react";
import { Button } from "@hollis-labs/design-components";
import { CopyIcon, DownloadIcon } from "lucide-react";
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactClose,
  ArtifactContent,
} from "../src/components/artifact";
import { ArtifactCard } from "../src/cards/artifact-card";
export function ArtifactDemo() {
  const [open, setOpen] = useState(true),
    [action, setAction] = useState("None");
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-heading font-semibold">Artifact presentations</h1>
      <ArtifactCard
        name="Compact host record"
        meta="Host-provided document metadata"
      />
      <Button onClick={() => setOpen(true)} disabled={open}>
        Open expanded viewer
      </Button>
      <p role="status">Host action: {action}</p>
      {open && (
        <Artifact role="region" aria-labelledby="artifact-title">
          <ArtifactHeader>
            <div className="min-w-0 flex-1">
              <ArtifactTitle id="artifact-title">
                Expanded host document
              </ArtifactTitle>
              <ArtifactDescription>
                Rendered content, actions and visibility belong to the host.
              </ArtifactDescription>
            </div>
            <ArtifactActions>
              <ArtifactAction
                label="Copy document"
                tooltip="Ask the host to copy"
                icon={CopyIcon}
                onClick={() => setAction("Copy requested")}
              />
              <ArtifactAction
                label="Save document"
                tooltip="Ask the host to save"
                icon={DownloadIcon}
                onClick={() => setAction("Save requested")}
              />
              <ArtifactAction label="Unavailable action" disabled>
                <span aria-hidden="true">—</span>
              </ArtifactAction>
              <ArtifactClose
                onClick={() => {
                  setAction("Close requested");
                  setOpen(false);
                }}
              />
            </ArtifactActions>
          </ArtifactHeader>
          <ArtifactContent aria-label="Document preview">
            {Array.from({ length: 24 }, (_, i) => (
              <p key={i} className="mb-3 text-body">
                Host paragraph {i + 1}: this content is already rendered.
                &lt;script&gt;alert(1)&lt;/script&gt; stays text, and the
                bounded pane scrolls without moving its controls.
              </p>
            ))}
            <a href="#host-document" className="text-primary underline">
              Host content control
            </a>
          </ArtifactContent>
        </Artifact>
      )}
      <Button>Following host control</Button>
    </section>
  );
}
