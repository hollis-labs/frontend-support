import { useState } from "react";
import {
  Commit,
  CommitHeader,
  CommitInfo,
  CommitMessage,
  CommitHash,
  CommitAuthor,
  CommitAuthorAvatar,
  CommitMetadata,
  CommitSeparator,
  CommitTimestamp,
  CommitActions,
  CommitCopyButton,
  CommitContent,
  CommitFiles,
  CommitFile,
  CommitFileInfo,
  CommitFileStatus,
  CommitFileIcon,
  CommitFilePath,
  CommitFileChanges,
  CommitFileAdditions,
  CommitFileDeletions,
} from "../src";
import {
  Agent,
  AgentHeader,
  AgentContent,
  AgentInstructions,
  AgentTools,
  AgentTool,
  AgentOutput,
} from "../src";
export const exampleHash = "6a9d5b1822ffb10bba4bd97175f01edd7d8651cd";
const files = [
  { status: "added" as const, path: "src/agent.tsx", add: 82, del: 0 },
  { status: "modified" as const, path: "src/commit.tsx", add: 18, del: 12 },
  { status: "renamed" as const, path: "docs/metadata.md", add: 0, del: 0 },
  { status: "deleted" as const, path: "legacy/helper.ts", add: 0, del: 6 },
];
export function MetadataDemo() {
  const [status, setStatus] = useState("Ready");
  return (
    <div data-metadata className="space-y-6">
      <h2 className="text-lg font-medium">Commit and agent metadata</h2>
      <p data-metadata-status role="status" className="text-sm text-fg-muted">
        {status}
      </p>
      <section className="space-y-2" aria-label="Commit details">
        <h3 className="font-medium">Commit</h3>
        <Commit defaultOpen>
          <CommitHeader aria-label="Show commit files">
            <CommitAuthorAvatar initials="HL" />
            <CommitInfo>
              <CommitMessage>Add developer presentation</CommitMessage>
              <CommitMetadata>
                <CommitAuthor>Hollis Labs</CommitAuthor>
                <CommitSeparator />
                <CommitHash>{exampleHash.slice(0, 7)}</CommitHash>
                <CommitSeparator />
                <CommitTimestamp date={new Date("2026-10-02T12:00:00Z")} />
              </CommitMetadata>
            </CommitInfo>
            <CommitActions>
              <CommitCopyButton
                hash={exampleHash}
                onCopy={() => setStatus("Copied commit hash")}
              />
            </CommitActions>
          </CommitHeader>
          <CommitContent>
            <CommitFiles>
              {files.map((file) => (
                <CommitFile key={file.path}>
                  <CommitFileInfo>
                    <CommitFileStatus status={file.status} />
                    <CommitFileIcon />
                    <CommitFilePath>{file.path}</CommitFilePath>
                  </CommitFileInfo>
                  <CommitFileChanges>
                    <CommitFileAdditions count={file.add} />
                    <CommitFileDeletions count={file.del} />
                  </CommitFileChanges>
                </CommitFile>
              ))}
            </CommitFiles>
          </CommitContent>
        </Commit>
        <p className="text-xs text-fg-muted">
          Invalid timestamp fallback: <CommitTimestamp date={new Date(NaN)} />
        </p>
      </section>
      <section className="space-y-2" aria-label="Agent descriptor">
        <h3 className="font-medium">Agent</h3>
        <Agent>
          <AgentHeader name="Change planner" model="host-selected model" />
          <AgentContent>
            <AgentInstructions>
              {
                "Plan a change and describe it.\nLiteral instructions: <script>alert(1)</script>"
              }
            </AgentInstructions>
            <AgentTools>
              <AgentTool
                value="read"
                defaultOpen
                tool={{
                  description: "Read a file",
                  inputSchema: {
                    type: "object",
                    properties: {
                      path: {
                        type: "string",
                        description: "<img src=x onerror=alert(1)>",
                      },
                    },
                    required: ["path"],
                  },
                }}
              />
              <AgentTool
                value="search"
                tool={{
                  description: "Search files",
                  inputSchema: {
                    type: "object",
                    properties: { query: { type: "string" } },
                  },
                }}
              />
            </AgentTools>
            <AgentOutput
              schema={{
                type: "object",
                properties: { summary: { type: "string" } },
                required: ["summary"],
              }}
            />
          </AgentContent>
        </Agent>
      </section>
    </div>
  );
}
