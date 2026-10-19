import { useState } from "react";
import { Button } from "@hollis-labs/design-components";
import {
  FileTree,
  FileTreeFolder,
  FileTreeFile,
  FileTreeActions,
  StackTrace,
  StackTraceHeader,
  StackTraceError,
  StackTraceErrorType,
  StackTraceErrorMessage,
  StackTraceExpandButton,
  StackTraceActions,
  StackTraceCopyButton,
  StackTraceContent,
  StackTraceFrames,
  TestResults,
  TestResultsHeader,
  TestResultsSummary,
  TestResultsDuration,
  TestResultsProgress,
  TestResultsContent,
  TestSuite,
  TestSuiteName,
  TestSuiteContent,
  Test,
  TestError,
  TestErrorMessage,
  TestErrorStack,
} from "../src";
export const exampleTrace =
  "TypeError: Expected a string\n    at parse (/src/parser.ts:12:4)\n    at run (/src/main.ts:8:2)\n    at process (node:internal/task_queues:95:5)\nunknown frame <script>alert(1)</script>";
export function InspectionDemo() {
  const [expanded, setExpanded] = useState(new Set(["src"]));
  const [selected, setSelected] = useState("src/parser.ts");
  const [message, setMessage] = useState("Ready");
  return (
    <div className="space-y-6" data-inspection>
      <h2 className="text-lg font-medium">Developer inspection</h2>
      <p role="status" data-inspection-status className="text-sm text-fg-muted">
        {message}
      </p>
      <section aria-label="Project files" className="space-y-2">
        <h3 className="font-medium">FileTree</h3>
        <FileTree
          expanded={expanded}
          onExpandedChange={setExpanded}
          selectedPath={selected}
          onSelect={setSelected}
        >
          <FileTreeFolder
            path="src"
            name="src"
            actions={
              <FileTreeActions>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMessage("Folder inspected")}
                >
                  Inspect folder
                </Button>
              </FileTreeActions>
            }
          >
            <FileTreeFile path="src/parser.ts" name="parser.ts">
              <FileTreeActions>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMessage("File inspected")}
                >
                  Inspect file
                </Button>
              </FileTreeActions>
            </FileTreeFile>
            <FileTreeFile path="src/main.ts" name="main.ts" />
          </FileTreeFolder>
          <FileTreeFolder path="tests" name="tests">
            <FileTreeFile path="tests/parser.test.ts" name="parser.test.ts" />
          </FileTreeFolder>
          <FileTreeFile path="package.json" name="package.json" />
        </FileTree>
        <p className="text-xs text-fg-muted" data-selection>
          Selected: {selected}
        </p>
      </section>
      <section aria-label="Error details" className="space-y-2">
        <h3 className="font-medium">StackTrace</h3>
        <StackTrace
          trace={exampleTrace}
          defaultOpen
          onFilePathClick={(path, line, column) =>
            setMessage(`Open ${path}:${line}:${column}`)
          }
        >
          <StackTraceHeader>
            <StackTraceError>
              <StackTraceErrorType />
              <StackTraceErrorMessage />
            </StackTraceError>
            <StackTraceExpandButton />
            <StackTraceActions>
              <StackTraceCopyButton onCopy={() => setMessage("Copied trace")} />
            </StackTraceActions>
          </StackTraceHeader>
          <StackTraceContent>
            <StackTraceFrames />
          </StackTraceContent>
        </StackTrace>
      </section>
      <section aria-label="Test report" className="space-y-2">
        <h3 className="font-medium">TestResults</h3>
        <TestResults
          summary={{ passed: 2, failed: 1, skipped: 1, total: 4, duration: 0 }}
        >
          <TestResultsHeader>
            <TestResultsSummary />
            <TestResultsDuration />
          </TestResultsHeader>
          <TestResultsContent>
            <TestResultsProgress />
            <TestSuite name="parser.test.ts" status="failed" defaultOpen>
              <TestSuiteName />
              <TestSuiteContent>
                <Test name="escapes source" status="passed" duration={0} />
                <Test name="parses coordinates" status="passed" duration={3} />
                <Test
                  name="accepts missing input"
                  status="failed"
                  duration={1}
                />
                <div className="px-4 pb-3">
                  <TestError>
                    <TestErrorMessage>Expected a string</TestErrorMessage>
                    <TestErrorStack>
                      {"at parse (/src/parser.ts:12:4)"}
                    </TestErrorStack>
                  </TestError>
                </div>
                <Test name="remote fixture" status="skipped" />
                <Test name="next batch" status="running" />
              </TestSuiteContent>
            </TestSuite>
          </TestResultsContent>
        </TestResults>
      </section>
    </div>
  );
}
