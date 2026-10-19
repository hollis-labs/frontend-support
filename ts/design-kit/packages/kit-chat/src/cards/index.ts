/**
 * The card set — the chassis, and the shapes that compose on it.
 *
 * A CARD IS A SHAPE, NOT A WIRE KIND. There is no `ApprovalCard` here and there will
 * not be one: a renderer keyed to a wire kind is the design layer asserting wire
 * identity, which the portfolio's ownership table gives to `go-envelopes`. A host
 * binds ITS kinds to THESE shapes through `@hollis-labs/design-bindings`, and the
 * binding table is host-local by construction. Two of the wire-kind renderers that
 * exist in Nanite today are ADR 0005 boundary violations for Tangent, which is the
 * concrete reason this line is drawn rather than the tidy one.
 *
 * CONSEQUENTLY THIS KIT SHIPS NO DEFAULT BINDING ROWS. A `BindingRequest` names a
 * `kind`, and a kit that implements no kinds has no rows to offer. What it ships
 * instead is the part that IS design: drawing the miss when a kind resolves to
 * nothing — see `card-miss.tsx`.
 */

export { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader, EnvelopeSection } from './envelope'
export { ArtifactCard } from './artifact-card'
export type { ArtifactCardProps } from './artifact-card'
export { DocumentCard } from './document-card'
export type { DocumentCardProps } from './document-card'
export { PromptCard } from './prompt-card'
export type { PromptCardProps } from './prompt-card'
export type {
  EnvelopeBodyProps,
  EnvelopeFooterProps,
  EnvelopeHeaderProps,
  EnvelopeProps,
  EnvelopeSectionProps,
} from './envelope'

export { DiffCard } from './diff-card'
export type { DiffCardProps, DiffSide } from './diff-card'

export { InfoCard } from './info-card'
export type { InfoCardProps } from './info-card'

export { MetricCard } from './metric-card'
export type { MetricCardProps, MetricTrend } from './metric-card'

export { ProgressCard } from './progress-card'
export type { ProgressCardProps, ProgressStep } from './progress-card'

export { TimelineCard } from './timeline-card'
export type { TimelineCardProps, TimelineEvent, TimelineStatus } from './timeline-card'

export { ConfirmationCard } from './confirmation-card'
export type { ConfirmationAction, ConfirmationCardProps } from './confirmation-card'

export { TableCard } from './table-card'
export type { TableCardProps, TableColumn } from './table-card'

export { ListCard } from './list-card'
export type { ListCardItem, ListCardProps } from './list-card'

export { CardMiss, CardFallbackDeclined } from './card-miss'
export type { CardMissProps, CardFallbackDeclinedProps } from './card-miss'

export { CardBoundary } from './card-boundary'
export type { CardBoundaryProps } from './card-boundary'
