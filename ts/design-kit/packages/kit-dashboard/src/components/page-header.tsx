interface PageHeaderProps {
  title: string
  /** Heading element for the title. Default `h1`; pass `h2` under a shell that already renders the page's h1. */
  as?: 'h1' | 'h2'
  children?: React.ReactNode
}

/** Compact, pinned page header — mirrors Torque's Operations header. */
export function PageHeader({ title, as: Heading = 'h1', children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-bg dash-page-header">
      <Heading className="dash-page-heading text-text-soft">
        {title}
      </Heading>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
