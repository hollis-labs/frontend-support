/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/test-results.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/test-results.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Base UI disclosure, contract tokens, finite/clamped progress,
 *              visible zero duration and accessible progress/status labels.
 */
"use client";

import { Badge } from "@hollis-labs/design-components";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hollis-labs/design-components";
import { cn } from "@hollis-labs/design-components";
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleDotIcon,
  CircleIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";
import { createContext, useContext, useMemo } from "react";

export type TestStatus = "passed" | "failed" | "skipped" | "running";

export interface TestResultsSummary {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration?: number;
}

interface TestResultsContextType {
  summary?: TestResultsSummary;
}

const TestResultsContext = createContext<TestResultsContextType>({});

const formatDuration = (ms: number) => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};

export type TestResultsHeaderProps = HTMLAttributes<HTMLDivElement>;

export const TestResultsHeader = ({
  className,
  children,
  ...props
}: TestResultsHeaderProps) => (
  <div
    className={cn(
      "flex items-center justify-between border-b border-border px-4 py-3",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export type TestResultsDurationProps = HTMLAttributes<HTMLSpanElement>;

export const TestResultsDuration = ({
  className,
  children,
  ...props
}: TestResultsDurationProps) => {
  const { summary } = useContext(TestResultsContext);

  if (summary?.duration === undefined || !Number.isFinite(summary.duration)) {
    return null;
  }

  return (
    <span className={cn("text-fg-muted text-sm", className)} {...props}>
      {children ?? formatDuration(summary.duration)}
    </span>
  );
};

export type TestResultsSummaryProps = HTMLAttributes<HTMLDivElement>;

export const TestResultsSummary = ({
  className,
  children,
  ...props
}: TestResultsSummaryProps) => {
  const { summary } = useContext(TestResultsContext);

  if (!summary) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      {children ?? (
        <>
          <Badge
            className="gap-1 bg-success-muted text-success"
            variant="secondary"
          >
            <CheckCircle2Icon className="size-3" />
            {summary.passed} passed
          </Badge>
          {summary.failed > 0 && (
            <Badge
              className="gap-1 bg-danger-muted text-danger"
              variant="secondary"
            >
              <XCircleIcon className="size-3" />
              {summary.failed} failed
            </Badge>
          )}
          {summary.skipped > 0 && (
            <Badge
              className="gap-1 bg-warning-muted text-warning"
              variant="secondary"
            >
              <CircleIcon className="size-3" />
              {summary.skipped} skipped
            </Badge>
          )}
        </>
      )}
    </div>
  );
};

export type TestResultsProps = HTMLAttributes<HTMLDivElement> & {
  summary?: TestResultsSummary;
};

export const TestResults = ({
  summary,
  className,
  children,
  ...props
}: TestResultsProps) => {
  const contextValue = useMemo(() => ({ summary }), [summary]);

  return (
    <TestResultsContext.Provider value={contextValue}>
      <div
        className={cn(
          "rounded-panel border border-border bg-bg text-fg",
          className,
        )}
        {...props}
      >
        {children ??
          (summary && (
            <TestResultsHeader>
              <TestResultsSummary />
              <TestResultsDuration />
            </TestResultsHeader>
          ))}
      </div>
    </TestResultsContext.Provider>
  );
};

export type TestResultsProgressProps = HTMLAttributes<HTMLDivElement>;

export const TestResultsProgress = ({
  className,
  children,
  ...props
}: TestResultsProgressProps) => {
  const { summary } = useContext(TestResultsContext);

  if (!summary) {
    return null;
  }

  const total =
    Number.isFinite(summary.total) && summary.total > 0 ? summary.total : 0;
  const passed = Number.isFinite(summary.passed)
    ? Math.max(0, Math.min(total, summary.passed))
    : 0;
  const failed = Number.isFinite(summary.failed)
    ? Math.max(0, Math.min(total - passed, summary.failed))
    : 0;
  const passedPercent = total ? (passed / total) * 100 : 0;
  const failedPercent = total ? (failed / total) * 100 : 0;

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children ?? (
        <>
          <div
            role="progressbar"
            aria-label="Tests passed or failed"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={passedPercent + failedPercent}
            className="flex h-2 overflow-hidden rounded-control bg-surface"
          >
            <div
              className="bg-success transition-all motion-reduce:transition-none"
              style={{ width: `${passedPercent}%` }}
            />
            <div
              className="bg-danger transition-all motion-reduce:transition-none"
              style={{ width: `${failedPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-fg-muted text-xs">
            <span>
              {summary.passed}/{summary.total} tests passed
            </span>
            <span>{passedPercent.toFixed(0)}%</span>
          </div>
        </>
      )}
    </div>
  );
};

export type TestResultsContentProps = HTMLAttributes<HTMLDivElement>;

export const TestResultsContent = ({
  className,
  children,
  ...props
}: TestResultsContentProps) => (
  <div className={cn("space-y-2 p-4", className)} {...props}>
    {children}
  </div>
);

interface TestSuiteContextType {
  name: string;
  status: TestStatus;
}

const TestSuiteContext = createContext<TestSuiteContextType>({
  name: "",
  status: "passed",
});

const statusStyles: Record<TestStatus, string> = {
  failed: "text-danger",
  passed: "text-success",
  running: "text-info",
  skipped: "text-warning",
};

const statusIcons: Record<TestStatus, React.ReactNode> = {
  failed: <XCircleIcon className="size-4" />,
  passed: <CheckCircle2Icon className="size-4" />,
  running: (
    <CircleDotIcon className="size-4 animate-pulse motion-reduce:animate-none" />
  ),
  skipped: <CircleIcon className="size-4" />,
};

const TestStatusIcon = ({ status }: { status: TestStatus }) => (
  <span
    role="img"
    aria-label={status}
    className={cn("shrink-0", statusStyles[status])}
  >
    {statusIcons[status]}
  </span>
);

export type TestSuiteProps = ComponentProps<typeof Collapsible> & {
  name: string;
  status: TestStatus;
};

export const TestSuite = ({
  name,
  status,
  className,
  children,
  ...props
}: TestSuiteProps) => {
  const contextValue = useMemo(() => ({ name, status }), [name, status]);

  return (
    <TestSuiteContext.Provider value={contextValue}>
      <Collapsible
        className={(state) =>
          cn(
            "rounded-panel border border-border",
            typeof className === "function" ? className(state) : className,
          )
        }
        {...props}
      >
        {children}
      </Collapsible>
    </TestSuiteContext.Provider>
  );
};

export type TestSuiteNameProps = ComponentProps<typeof CollapsibleTrigger>;

export const TestSuiteName = ({
  className,
  children,
  ...props
}: TestSuiteNameProps) => {
  const { name, status } = useContext(TestSuiteContext);

  return (
    <CollapsibleTrigger
      className={(state) =>
        cn(
          "group flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-surface/50 motion-reduce:transition-none",
          typeof className === "function" ? className(state) : className,
        )
      }
      {...props}
    >
      <ChevronRightIcon className="size-4 shrink-0 text-fg-muted transition-transform group-aria-expanded:rotate-90 motion-reduce:transition-none" />
      <TestStatusIcon status={status} />
      <span className="font-medium text-sm">{children ?? name}</span>
    </CollapsibleTrigger>
  );
};

export type TestSuiteStatsProps = HTMLAttributes<HTMLDivElement> & {
  passed?: number;
  failed?: number;
  skipped?: number;
};

export const TestSuiteStats = ({
  passed = 0,
  failed = 0,
  skipped = 0,
  className,
  children,
  ...props
}: TestSuiteStatsProps) => (
  <div
    className={cn("ml-auto flex items-center gap-2 text-xs", className)}
    {...props}
  >
    {children ?? (
      <>
        {passed > 0 && <span className="text-success">{passed} passed</span>}
        {failed > 0 && <span className="text-danger">{failed} failed</span>}
        {skipped > 0 && <span className="text-warning">{skipped} skipped</span>}
      </>
    )}
  </div>
);

export type TestSuiteContentProps = ComponentProps<typeof CollapsibleContent>;

export const TestSuiteContent = ({
  className,
  children,
  ...props
}: TestSuiteContentProps) => (
  <CollapsibleContent
    className={(state) =>
      cn(
        "border-t border-border",
        typeof className === "function" ? className(state) : className,
      )
    }
    {...props}
  >
    <div className="divide-y divide-border">{children}</div>
  </CollapsibleContent>
);

interface TestContextType {
  name: string;
  status: TestStatus;
  duration?: number;
}

const TestContext = createContext<TestContextType>({
  name: "",
  status: "passed",
});

export type TestNameProps = HTMLAttributes<HTMLSpanElement>;

export const TestName = ({ className, children, ...props }: TestNameProps) => {
  const { name } = useContext(TestContext);

  return (
    <span className={cn("flex-1", className)} {...props}>
      {children ?? name}
    </span>
  );
};

export type TestDurationProps = HTMLAttributes<HTMLSpanElement>;

export const TestDuration = ({
  className,
  children,
  ...props
}: TestDurationProps) => {
  const { duration } = useContext(TestContext);

  if (duration === undefined || !Number.isFinite(duration)) {
    return null;
  }

  return (
    <span className={cn("ml-auto text-fg-muted text-xs", className)} {...props}>
      {children ?? `${duration}ms`}
    </span>
  );
};

export type TestStatusProps = HTMLAttributes<HTMLSpanElement>;

export const TestStatus = ({
  className,
  children,
  ...props
}: TestStatusProps) => {
  const { status } = useContext(TestContext);

  return (
    <span
      role="img"
      aria-label={status}
      className={cn("shrink-0", statusStyles[status], className)}
      {...props}
    >
      {children ?? statusIcons[status]}
    </span>
  );
};

export type TestProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  status: TestStatus;
  duration?: number;
};

export const Test = ({
  name,
  status,
  duration,
  className,
  children,
  ...props
}: TestProps) => {
  const contextValue = useMemo(
    () => ({ duration, name, status }),
    [duration, name, status],
  );

  return (
    <TestContext.Provider value={contextValue}>
      <div
        className={cn("flex items-center gap-2 px-4 py-2 text-sm", className)}
        {...props}
      >
        {children ?? (
          <>
            <TestStatus />
            <TestName />
            {duration !== undefined && <TestDuration />}
          </>
        )}
      </div>
    </TestContext.Provider>
  );
};

export type TestErrorProps = HTMLAttributes<HTMLDivElement>;

export const TestError = ({
  className,
  children,
  ...props
}: TestErrorProps) => (
  <div
    className={cn("mt-2 rounded-control bg-danger-muted p-3", className)}
    {...props}
  >
    {children}
  </div>
);

export type TestErrorMessageProps = HTMLAttributes<HTMLParagraphElement>;

export const TestErrorMessage = ({
  className,
  children,
  ...props
}: TestErrorMessageProps) => (
  <p className={cn("font-medium text-danger text-sm", className)} {...props}>
    {children}
  </p>
);

export type TestErrorStackProps = HTMLAttributes<HTMLPreElement>;

export const TestErrorStack = ({
  className,
  children,
  ...props
}: TestErrorStackProps) => (
  <pre
    className={cn(
      "mt-2 overflow-auto font-mono text-danger text-xs",
      className,
    )}
    {...props}
  >
    {children}
  </pre>
);
