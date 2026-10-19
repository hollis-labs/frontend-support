interface ProgressBarProps {
  /** Completion percentage, 0–100. Values outside the range are clamped. */
  value?: number
  /**
   * Render an animated indeterminate bar — the "something is running, no
   * known total" state. Ignores `value` when set.
   *
   * REQUIRES `@hollis-labs/design-components/keyframes.css`. The determinate bar
   * needs nothing.
   */
  indeterminate?: boolean
  /** Extra classes — e.g. a taller `h-*` for hero progress bars. */
  className?: string
}

/**
 * Thin completion bar.
 *
 * The fill was `bg-status-done` in sysop-ui, which CW-0116 called out directly:
 * a bar at 40% is not "done". It names `primary` now — progress is the app's
 * action colour, not a terminal state — and base may not name `status-*` at all,
 * since the contract burned that prefix.
 */
export function ProgressBar({ value = 0, indeterminate = false, className = '' }: ProgressBarProps) {
  if (indeterminate) {
    return (
      <div
        className={`relative h-1 w-full overflow-hidden rounded-full bg-border ${className}`}
        role="progressbar"
        aria-busy="true"
      >
        <div
          className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary"
          style={{ animation: 'hl-progress-indeterminate 1.1s ease-in-out infinite' }}
        />
      </div>
    )
  }
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={`h-1 w-full overflow-hidden rounded-full bg-border ${className}`}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
