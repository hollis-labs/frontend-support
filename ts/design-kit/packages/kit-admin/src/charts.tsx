import { SampleSeriesView, type SampleSeriesViewProps } from '@hollis-labs/kit-observe/charts'

/** Supply to AdminContent/AdminShell renderSeries. The root never imports this module. */
export function renderAdminSeries(props: SampleSeriesViewProps) {
  return <SampleSeriesView {...props} />
}
