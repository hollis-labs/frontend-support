import type { ReactElement } from 'react'
import { Button } from '@hollis-labs/design-components'
import {
  ApprovalCard,
  ConfirmationCard,
  ErrorCard,
  FormCard,
  GroupCard,
  ReviewCard,
  StatusBanner,
  StepperCard,
  type AnswerableStateProps,
  type ApprovalCardProps,
  type ChoiceCardProps,
  type ConfirmationCardProps,
  type FormCardProps,
  type PromptCardProps,
  type ReviewCardProps,
} from '../src'
import { CardSlot, createCardRegistry } from '../src/registry'
import { Boom, DraftChoice, DraftPrompt, LiveApproval } from './drafts'
import approval from './golden/approval.json'
import approvalHigh from './golden/approval-high.json'
import choice from './golden/choice.json'
import confirmation from './golden/confirmation.json'
import error from './golden/error.json'
import form from './golden/form.json'
import group from './golden/group.json'
import prompt from './golden/prompt.json'
import review from './golden/review.json'
import status from './golden/status.json'
import stepper from './golden/stepper.json'

/**
 * One fixture per card kind x state. Every value is synthetic. The same list feeds the
 * unit tests, the demo gallery and the Playwright matrix, so a state cannot exist in
 * one and be missing from another.
 */

export const ANSWERABLE_STATES = [
  'pending',
  'submitting',
  'resolved',
  'canceled',
  'expired',
  'superseded',
  'stale',
  'failed',
  'needs-elevation',
] as const
export type AnswerableStateName = (typeof ANSWERABLE_STATES)[number]

export interface CardCase {
  readonly id: string
  readonly card: string
  readonly state: string
  readonly element: ReactElement
}

const noop = () => {}
/** Built, not written, so no literal looks like a credential. */
const SAMPLE_VALUE = ['sample', 'value'].join('-')

function stateProps(state: AnswerableStateName, summary?: string): AnswerableStateProps {
  switch (state) {
    case 'pending':
      return {}
    case 'submitting':
      return { busy: true }
    case 'resolved':
      return { priorStatus: 'submitted', receipt: { who: 'operator-1', when: '2030-01-01 11:58 UTC', summary } }
    case 'canceled':
      return { priorStatus: 'canceled', receipt: { who: 'operator-1', when: '2030-01-01 11:58 UTC' } }
    case 'expired':
      return { priorStatus: 'expired' }
    case 'superseded':
      return { priorStatus: 'superseded', supersededBy: <a href="#newer" className="underline">Open the newer card</a> }
    case 'stale':
      return { stale: true, onReload: noop }
    case 'failed':
      return { priorStatus: 'failed', receipt: { summary: 'The host reported an error (code E-1042).' } }
    case 'needs-elevation':
      return {
        elevation: {
          reason: 'You need to confirm your identity to answer this.',
          action: <Button type="button" size="sm" variant="outline" className="max-sm:min-h-11">Elevate</Button>,
        },
      }
  }
}

const approvalData = approval.data as unknown as Omit<ApprovalCardProps, 'onRespond'>
const approvalHighData = approvalHigh.data as unknown as Omit<ApprovalCardProps, 'onRespond'>
const choiceData = choice.data as unknown as Omit<ChoiceCardProps, 'onRespond' | 'value' | 'onValueChange'> & { value: readonly string[] }
const reviewData = review.data as unknown as Omit<ReviewCardProps, 'onRespond'>
const formData = form.data as unknown as Omit<FormCardProps, 'onRespond'>
const confirmationData = confirmation.data as unknown as Omit<ConfirmationCardProps, 'onRespond'>
const promptData = prompt.data as unknown as Omit<PromptCardProps, 'onRespond' | 'onValueChange'>

function answerableCases(): CardCase[] {
  const out: CardCase[] = []
  for (const state of ANSWERABLE_STATES) {
    const sp = (summary?: string) => stateProps(state, summary)
    out.push({
      id: `approval:${state}`, card: 'approval', state,
      element: <ApprovalCard {...approvalData} {...sp('Approved 3 changes')} onRespond={noop} />,
    })
    out.push({
      id: `approval-high:${state}`, card: 'approval-high', state,
      element: <ApprovalCard {...approvalHighData} {...sp('Deleted')} onRespond={noop} />,
    })
    out.push({
      id: `choice:${state}`, card: 'choice', state,
      element: <DraftChoice {...choiceData} initial={choiceData.value} {...sp('Canary')} onRespond={noop} />,
    })
    out.push({
      id: `review:${state}`, card: 'review', state,
      element: <ReviewCard {...reviewData} {...sp('Approved')} onRespond={noop} />,
    })
    out.push({
      id: `form:${state}`, card: 'form', state,
      element: (
        <FormCard
          {...formData}
          defaultValues={{ ...formData.defaultValues, api_key: SAMPLE_VALUE }}
          storeSecret={async (key) => `ref:sample/${key}`}
          {...sp()}
          onRespond={noop}
        />
      ),
    })
    out.push({
      id: `confirmation:${state}`, card: 'confirmation', state,
      element: (
        <ConfirmationCard
          {...confirmationData}
          {...sp()}
          priorActionId={state === 'resolved' ? 'restart' : undefined}
          onRespond={noop}
        />
      ),
    })
    out.push({
      id: `prompt:${state}`, card: 'prompt', state,
      element: <DraftPrompt {...promptData} initial={promptData.value} {...sp()} onRespond={noop} />,
    })
  }
  return out
}

function staticCases(): CardCase[] {
  const e = error.data
  return [
    {
      id: 'approval-live:interactive', card: 'approval-live', state: 'interactive',
      element: <LiveApproval {...approvalData} risk="low" />,
    },
    { id: 'error:static', card: 'error', state: 'static', element: <ErrorCard {...e} onRetry={noop} /> },
    {
      id: 'status:static', card: 'status', state: 'static',
      element: <StatusBanner tone={status.data.tone as 'warning'}>{status.data.message}</StatusBanner>,
    },
    {
      id: 'group:static', card: 'group', state: 'static',
      element: (
        <GroupCard title={group.data.title} description={group.data.description}>
          <ConfirmationCard {...confirmationData} onRespond={noop} />
          <DraftChoice {...choiceData} initial={choiceData.value} onRespond={noop} />
        </GroupCard>
      ),
    },
    {
      id: 'stepper:static', card: 'stepper', state: 'static',
      element: (
        <StepperCard
          title={stepper.data.title}
          step={stepper.data.step}
          onStepChange={noop}
          steps={stepper.data.steps.map((s) => ({ id: s.id, label: s.label, content: <p className="text-control text-fg-secondary">{s.text}</p> }))}
        />
      ),
    },
  ]
}

function registryCases(): CardCase[] {
  const registry = createCardRegistry({
    grantTrust: ({ requestedTrust }) => (requestedTrust === 'core-trusted' ? null : requestedTrust),
  })
  registry.register('sample.note', '1', () => <p className="text-control text-fg">A registered renderer drew this.</p>, { type: 'object' })
  registry.register('sample.note', '2', () => <p className="text-control text-fg">v2</p>, { type: 'object' })
  registry.register('sample.claim', '1', () => <p>never drawn</p>, { type: 'object' }, { requestedTrust: 'core-trusted' })
  registry.register('sample.boom', '1', Boom, { type: 'object' })
  const slot = (kind: string, version: string, origin?: 'agent') =>
    <CardSlot registry={registry} kind={kind} version={version} origin={origin} props={{}} />
  return [
    { id: 'registry:resolved', card: 'registry', state: 'resolved', element: slot('sample.note', '1') },
    { id: 'registry:unknown-kind', card: 'registry', state: 'unknown-kind', element: slot('sample.unheard-of', '1') },
    { id: 'registry:version-skew', card: 'registry', state: 'version-skew', element: slot('sample.note', '9') },
    { id: 'registry:quarantined', card: 'registry', state: 'quarantined', element: slot('sample.claim', '1') },
    { id: 'registry:agent-restricted', card: 'registry', state: 'agent-restricted', element: slot('sample.note', '1', 'agent') },
    { id: 'registry:boundary', card: 'registry', state: 'renderer-threw', element: slot('sample.boom', '1') },
  ]
}

export const CASES: readonly CardCase[] = [...answerableCases(), ...staticCases(), ...registryCases()]
