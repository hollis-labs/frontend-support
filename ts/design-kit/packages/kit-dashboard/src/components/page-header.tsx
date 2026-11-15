interface PageHeaderProps {
  title: string
  /** Rendered beside the title, e.g. view tabs or a count chip (left group). */
  leading?: React.ReactNode
  children?: React.ReactNode
}

/** Compact, pinned page header — mirrors Torque's Operations header. */
export function PageHeader({ title, leading, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-bg dash-page-header">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="dash-page-heading text-text-soft">
          {title}
        </h1>
        {leading}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
