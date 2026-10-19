import { useState } from 'react'
import { Context, ContextTrigger, ContextContent, ContextContentHeader, ContextContentBody, ContextContentFooter, ContextInputUsage, ContextOutputUsage, ContextReasoningUsage, ContextCacheUsage } from '../src/components/context'
import { Question, QuestionPrompt, QuestionDescription, QuestionOptions, QuestionOption, QuestionInput, QuestionActions, QuestionSubmit, type QuestionResponse } from '../src/components/question'
import { Suggestions, Suggestion } from '../src/components/suggestion'

export function ContextQuestionDemo() {
  const [suggestion, setSuggestion] = useState('None'), [response, setResponse] = useState<QuestionResponse>(), [requireText, setRequireText] = useState(false)
  const [multiple, setMultiple] = useState(false), [calls, setCalls] = useState(0), [submit, setSubmit] = useState(false)
  return <section className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
    <h1 className="text-heading font-semibold">Suggestions, context and questions</h1>
    <Suggestions>{['Explain the result','Summarize the changes','Show next steps'].map(value => <Suggestion key={value} suggestion={value} onClick={setSuggestion} />)}<Suggestion suggestion="Unavailable action" disabled /></Suggestions>
    <p role="status">Suggestion: {suggestion}</p>
    <div className="flex flex-wrap items-center gap-4">
      <Context usedTokens={24000} maxTokens={128000} usage={{inputTokens:20000,outputTokens:4000,cachedInputTokens:0}} cost={{totalUSD:0.08,inputUSD:0.04,outputUSD:0.04,cacheUSD:0}}>
        <ContextTrigger aria-label="Known context usage" /><ContextContent aria-label="Known context details"><ContextContentHeader /><ContextContentBody><ContextInputUsage /><ContextOutputUsage /><ContextReasoningUsage /><ContextCacheUsage /></ContextContentBody><ContextContentFooter /></ContextContent>
      </Context>
      <Context maxTokens={0}><ContextTrigger aria-label="Unknown context usage" /><ContextContent aria-label="Unknown context details"><ContextContentHeader /><ContextContentBody><ContextInputUsage /><ContextOutputUsage /></ContextContentBody><ContextContentFooter /></ContextContent></Context>
    </div>
    <div className="flex flex-wrap gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={requireText} onChange={event=>setRequireText(event.target.checked)} />Require text</label><label className="flex items-center gap-2"><input type="checkbox" checked={multiple} onChange={event=>setMultiple(event.target.checked)} />Multiple choices</label></div>
    <Question key={String(multiple)} aria-label="Deployment question" selectionMode={multiple?'multiple':'single'} requireText={requireText} onSubmit={value => { setCalls(count=>count+1);setSubmit(true);return new Promise<void>(resolve=>{ const finish=()=>{setResponse(value);setSubmit(false);resolve()};(window as Window & { completeDemoQuestion?:()=>void }).completeDemoQuestion=finish }) }}>
      <QuestionPrompt>Which environment should we discuss?</QuestionPrompt><QuestionDescription>Select a host-defined choice or add detail. Submission stays local to this demo.</QuestionDescription>
      <QuestionOptions aria-label="Environment"><QuestionOption value="staging">Staging</QuestionOption><QuestionOption value="production">Production</QuestionOption><QuestionOption value="unavailable" disabled>Unavailable</QuestionOption></QuestionOptions>
      <QuestionInput aria-label="Additional detail" placeholder="Optional detail" maxLength={2000} />
      <QuestionActions><QuestionSubmit /></QuestionActions>
    </Question>
    {submit && <button type="button" className="rounded-control border border-border p-2" onClick={()=>(window as Window & {completeDemoQuestion?:()=>void}).completeDemoQuestion?.()}>Finish local submission</button>}
    <p role="status">Submission calls: {calls}</p>
    {response && <p role="status">Response: {response.selectedValues.join(', ')} — {response.text ?? 'No text'}</p>}
  </section>
}
