/**
 * Dashboard page shells. `DetailPageLayout` is NOT here — CW-0116 read it as
 * idiom-free (a header slot over a scroll body with an optional pinned aside,
 * naming one token) and it lives in `@hollis-labs/design-components`.
 */
export {
  ListPageLayout,
  DetailHeader,
  TabStrip,
  OperationsTablePage,
  type TabStripItem,
} from './components/layout'

export { OperationsListPage, type OperationsListPageProps, type OperationsFacet, type OperationsInspector, type OperationsActionScope } from './components/layout'

export { DashboardToolbar, DashboardField, DashboardSection, type DashboardFieldProps } from './components/layout/dashboard-controls'

export { DashboardSearchToolbar } from './components/layout/search-toolbar'

export { DashboardViewTabs, type DashboardViewTab } from './components/layout/view-tabs'
