interface PageHeaderProps {
  title: string
  children?: React.ReactNode
}

/** Compact, pinned page header — mirrors Torque's Operations header. */
export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-bg dash-page-header">
      <h1 className="dash-page-heading text-text-soft">
        {title}
      </h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
