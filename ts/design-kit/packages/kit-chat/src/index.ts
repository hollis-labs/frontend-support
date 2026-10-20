/**
 * @hollis-labs/kit-chat — the chat idiom.
 *
 * PROPS DOWN, MESSAGES UP. No global stores, built-in transport, API client or
 * plugin system. The host owns application state; components own presentation
 * and interaction. Optional headless hooks own local interaction/pagination state.
 * That constraint is what makes them reusable, and it is the reason this package was
 * built rather than extracted from Nanite, whose 748-line composer is wired into six
 * zustand stores.
 *
 * THIS PACKAGE NEVER PARSES MARKDOWN. `ChatStream` takes already-rendered content.
 * A streaming-safe markdown renderer ships as the optional `/markdown` subpath, so a
 * host that already renders its own pays nothing for ours.
 */

export { ChatInput } from './components/chat-input'
export type { ChatInputProps } from './components/chat-input'

export { ChatComposer } from './components/chat-composer'
export type { ChatComposerProps } from './components/chat-composer'

export { ChatStream } from './components/chat-stream'
export type { ChatStreamProps } from './components/chat-stream'

export { ResizableChatPanel } from './components/resizable-chat-panel'
export type { ResizableChatPanelProps } from './components/resizable-chat-panel'
export { ForwardMessageDialog } from './components/forward-message-dialog'
export type { ForwardMessageDialogProps, ForwardRecipient } from './components/forward-message-dialog'

export {
  ArtifactCard,
  DocumentCard,
  PromptCard,
  CardBoundary,
  CardFallbackDeclined,
  CardMiss,
  ConfirmationCard,
  DiffCard,
  Envelope,
  EnvelopeBody,
  EnvelopeFooter,
  EnvelopeHeader,
  EnvelopeSection,
  InfoCard,
  ListCard,
  MetricCard,
  ProgressCard,
  TableCard,
  TimelineCard,
} from './cards'
export type {
  ArtifactCardProps,
  DocumentCardProps,
  PromptCardProps,
  CardBoundaryProps,
  CardFallbackDeclinedProps,
  CardMissProps,
  ConfirmationAction,
  ConfirmationCardProps,
  DiffCardProps,
  DiffSide,
  EnvelopeBodyProps,
  EnvelopeFooterProps,
  EnvelopeHeaderProps,
  EnvelopeProps,
  EnvelopeSectionProps,
  InfoCardProps,
  ListCardItem,
  ListCardProps,
  MetricCardProps,
  MetricTrend,
  ProgressCardProps,
  ProgressStep,
  TableCardProps,
  TableColumn,
  TimelineCardProps,
  TimelineEvent,
  TimelineStatus,
} from './cards'

/* The response seam. See lib/response.ts for why emit is closed and read is open. */
export { acceptsInput, classifyPriorResponse } from './lib/response'
export type {
  CardAnswer,
  CardDecision,
  CardOutcome,
  CardResponder,
  PriorResponseState,
} from './lib/response'

export { useStallDetector } from './lib/use-stall-detector'

export { useChatHistory } from './lib/use-chat-history'
export type {
  ChatHistoryCursor,
  ChatHistoryPage,
  ChatHistoryRequest,
  UseChatHistoryOptions,
} from './lib/use-chat-history'

export {
  applyReference,
  detectSuggestion,
  filterSuggestions,
  removeSuggestion,
} from './lib/suggestion'
export type {
  ActiveSuggestion,
  ChatTrigger,
  CommandTrigger,
  ReferenceTrigger,
  SuggestionItem,
} from './lib/suggestion'

export type {
  ChatCardItem,
  ChatItem,
  ChatMarkerItem,
  ChatMessageItem,
  ChatRole,
  ChatStreamStatus,
} from './lib/types'

export { Reasoning, ReasoningTrigger, ReasoningContent } from './components/reasoning'
export type { ReasoningProps, ReasoningTriggerProps, ReasoningContentProps } from './components/reasoning'
export { ChainOfThought, ChainOfThoughtHeader, ChainOfThoughtStep, ChainOfThoughtSearchResults, ChainOfThoughtSearchResult, ChainOfThoughtContent, ChainOfThoughtImage } from './components/chain-of-thought'
export type { ChainOfThoughtProps, ChainOfThoughtHeaderProps, ChainOfThoughtStepProps, ChainOfThoughtSearchResultsProps, ChainOfThoughtSearchResultProps, ChainOfThoughtContentProps, ChainOfThoughtImageProps } from './components/chain-of-thought'
export { Sources, SourcesTrigger, SourcesContent, Source } from './components/sources'
export type { SourcesProps, SourcesTriggerProps, SourcesContentProps, SourceProps } from './components/sources'
export { Plan, PlanHeader, PlanTitle, PlanDescription, PlanAction, PlanContent, PlanFooter, PlanTrigger } from './components/plan'
export type { PlanProps, PlanHeaderProps, PlanTitleProps, PlanDescriptionProps, PlanActionProps, PlanContentProps, PlanFooterProps, PlanTriggerProps } from './components/plan'

export { Shimmer } from './components/shimmer'
export type { TextShimmerProps } from './components/shimmer'
export { MessageActions, MessageAction, MessageBranch, MessageBranchContent, MessageBranchSelector, MessageBranchPrevious, MessageBranchNext, MessageBranchPage } from './components/message'
export type { MessageActionsProps, MessageActionProps, MessageBranchProps, MessageBranchContentProps, MessageBranchSelectorProps, MessageBranchPreviousProps, MessageBranchNextProps, MessageBranchPageProps } from './components/message'

export { Attachments, Attachment, AttachmentPreview, AttachmentInfo, AttachmentRemove, AttachmentEmpty, AttachmentHoverCard, AttachmentHoverCardTrigger, AttachmentHoverCardContent } from './components/attachments'
export type { AttachmentData, AttachmentMediaCategory, AttachmentVariant, AttachmentsProps, AttachmentProps, AttachmentPreviewProps, AttachmentInfoProps, AttachmentRemoveProps, AttachmentEmptyProps, AttachmentHoverCardProps, AttachmentHoverCardTriggerProps, AttachmentHoverCardContentProps } from './components/attachments'
export { AttachmentDropzone, PromptInputActionAddAttachments } from './components/attachment-dropzone'
export type { AttachmentDropzoneProps, AttachmentRejection, PromptInputActionAddAttachmentsProps } from './components/attachment-dropzone'
export { getMediaCategory, getAttachmentLabel } from './lib/attachment'

export { ModelSelector, ModelSelectorTrigger, ModelSelectorContent, ModelSelectorDialog, ModelSelectorInput, ModelSelectorList, ModelSelectorEmpty, ModelSelectorGroup, ModelSelectorItem, ModelSelectorShortcut, ModelSelectorSeparator, ModelSelectorLogo, ModelSelectorLogoGroup, ModelSelectorName } from './components/model-selector'
export type { ModelSelectorProps, ModelSelectorTriggerProps, ModelSelectorContentProps, ModelSelectorDialogProps, ModelSelectorInputProps, ModelSelectorListProps, ModelSelectorEmptyProps, ModelSelectorGroupProps, ModelSelectorItemProps, ModelSelectorShortcutProps, ModelSelectorSeparatorProps, ModelSelectorLogoProps, ModelSelectorLogoGroupProps, ModelSelectorNameProps } from './components/model-selector'

export { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from './components/tool'
export type { ToolState, ToolProps, ToolHeaderProps, ToolContentProps, ToolInputProps, ToolOutputProps } from './components/tool'
export { ConfirmationTitle, ConfirmationRequest, ConfirmationAccepted, ConfirmationRejected } from './components/confirmation'
export type { ConfirmationTitleProps, ConfirmationRequestProps, ConfirmationAcceptedProps, ConfirmationRejectedProps } from './components/confirmation'
export { QueueItem, QueueItemIndicator, QueueItemContent, QueueItemDescription, QueueItemActions, QueueItemAction, QueueItemAttachment, QueueItemImage, QueueItemFile, QueueList, QueueSection, QueueSectionTrigger, QueueSectionLabel, QueueSectionContent, Queue } from './components/queue'
export type { QueueMessagePart, QueueMessage, QueueTodo, QueueItemProps, QueueItemIndicatorProps, QueueItemContentProps, QueueItemDescriptionProps, QueueItemActionsProps, QueueItemActionProps, QueueItemAttachmentProps, QueueItemImageProps, QueueItemFileProps, QueueListProps, QueueSectionProps, QueueSectionTriggerProps, QueueSectionLabelProps, QueueSectionContentProps, QueueProps } from './components/queue'

export { OpenIn, OpenInTrigger, OpenInContent, OpenInItem, OpenInGroup, OpenInLabel, OpenInSeparator } from './components/open-in'
export type { OpenInProvider, OpenInProps, OpenInTriggerProps, OpenInContentProps, OpenInItemProps, OpenInGroupProps, OpenInLabelProps, OpenInSeparatorProps } from './components/open-in'

export { Suggestions, Suggestion } from './components/suggestion'
export type { SuggestionsProps, SuggestionProps } from './components/suggestion'
export { Context, ContextTrigger, ContextContent, ContextContentHeader, ContextContentBody, ContextContentFooter, ContextInputUsage, ContextOutputUsage, ContextReasoningUsage, ContextCacheUsage } from './components/context'
export type { ContextProps, ContextUsage, ContextCost, ContextTriggerProps, ContextContentProps, ContextContentHeaderProps, ContextContentBodyProps, ContextContentFooterProps, ContextInputUsageProps, ContextOutputUsageProps, ContextReasoningUsageProps, ContextCacheUsageProps } from './components/context'
export { Question, QuestionPrompt, QuestionDescription, QuestionOptions, QuestionOption, QuestionInput, QuestionActions, QuestionSubmit } from './components/question'
export type { QuestionValue, QuestionResponse, QuestionSelectionMode, QuestionProps, QuestionPromptProps, QuestionDescriptionProps, QuestionOptionsProps, QuestionOptionProps, QuestionInputProps, QuestionActionsProps, QuestionSubmitProps } from './components/question'

export { Image } from './components/image'
export type { ImageProps } from './components/image'
export { InlineCitation, InlineCitationText, InlineCitationCard, InlineCitationCardTrigger, InlineCitationCardBody, InlineCitationCarousel, InlineCitationCarouselContent, InlineCitationCarouselItem, InlineCitationCarouselHeader, InlineCitationCarouselIndex, InlineCitationCarouselPrev, InlineCitationCarouselNext, InlineCitationSource, InlineCitationQuote } from './components/inline-citation'
export type { InlineCitationProps, InlineCitationTextProps, InlineCitationCardProps, InlineCitationCardTriggerProps, InlineCitationCardBodyProps, InlineCitationCarouselProps, InlineCitationCarouselContentProps, InlineCitationCarouselItemProps, InlineCitationCarouselHeaderProps, InlineCitationCarouselIndexProps, InlineCitationCarouselPrevProps, InlineCitationCarouselNextProps, InlineCitationSourceProps, InlineCitationQuoteProps } from './components/inline-citation'

export { Artifact, ArtifactHeader, ArtifactTitle, ArtifactDescription, ArtifactClose, ArtifactActions, ArtifactAction, ArtifactContent } from './components/artifact'
export type { ArtifactProps, ArtifactHeaderProps, ArtifactTitleProps, ArtifactDescriptionProps, ArtifactCloseProps, ArtifactActionsProps, ArtifactActionProps, ArtifactContentProps } from './components/artifact'
