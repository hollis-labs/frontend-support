import { PageHeader } from '../../src'
import { EmptyState } from '@hollis-labs/design-components'

/** Placeholder settings route — proves the rail's Settings entry navigates. */
export function SettingsView() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Settings" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <EmptyState
          variant="empty"
          title="Settings"
          description="Demo placeholder — app settings would live here."
        />
      </div>
    </div>
  )
}
