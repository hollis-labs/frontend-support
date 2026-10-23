import { useState } from 'react'
import { ApprovalCard, ChoiceCard, PromptCard, type ApprovalCardProps, type ChoiceCardProps, type PromptCardProps } from '../src'

/** Draft state that lives in the fixture, as a host's would. */
export function DraftChoice(props: Omit<ChoiceCardProps, 'value' | 'onValueChange'> & { initial: readonly string[] }) {
  const { initial, ...rest } = props
  const [value, setValue] = useState<readonly string[]>(initial)
  return <ChoiceCard {...rest} value={value} onValueChange={setValue} />
}
export function DraftPrompt(props: Omit<PromptCardProps, 'value' | 'onValueChange'> & { initial: string }) {
  const { initial, ...rest } = props
  const [value, setValue] = useState(initial)
  return <PromptCard {...rest} value={value} onValueChange={setValue} />
}


export function Boom(): never {
  throw new Error('Sample renderer failed while drawing.')
}


/** Resolves itself on answer, as a host that records the outcome would. */
export function LiveApproval(props: Omit<ApprovalCardProps, 'onRespond' | 'priorStatus'>) {
  const [status, setStatus] = useState<string | null>(null)
  return (
    <ApprovalCard
      {...props}
      priorStatus={status}
      receipt={status ? { who: 'operator-1', when: '2030-01-01 11:58 UTC' } : undefined}
      onRespond={(outcome) => setStatus(outcome.status)}
    />
  )
}
