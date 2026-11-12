import { ChainOfThought, ChainOfThoughtContent, ChainOfThoughtHeader, ChainOfThoughtSearchResult, ChainOfThoughtSearchResults, ChainOfThoughtStep, Plan, PlanAction, PlanContent, PlanDescription, PlanFooter, PlanHeader, PlanTitle, PlanTrigger, Reasoning, ReasoningContent, ReasoningTrigger, Source, Sources, SourcesContent, SourcesTrigger } from '@hollis-labs/kit-chat'

export function ChatDisclosuresDemo() {
  return <main className="mx-auto max-w-3xl space-y-4 bg-bg p-4 text-fg">
    <h1 className="text-heading font-semibold">Chat disclosures</h1>
    <Reasoning defaultOpen duration={4}><ReasoningTrigger /><ReasoningContent><p>Reasoning rendered by the host; no markdown dependency in this entrypoint.</p></ReasoningContent></Reasoning>
    <ChainOfThought defaultOpen><ChainOfThoughtHeader /><ChainOfThoughtContent>
      <ChainOfThoughtStep label="Search complete" description="Two references found"><ChainOfThoughtSearchResults><ChainOfThoughtSearchResult>Guide</ChainOfThoughtSearchResult></ChainOfThoughtSearchResults></ChainOfThoughtStep>
      <ChainOfThoughtStep label="Preparing answer" status="active" />
      <ChainOfThoughtStep label="Final review" status="pending" />
    </ChainOfThoughtContent></ChainOfThought>
    <Sources defaultOpen><SourcesTrigger count={2} /><SourcesContent><Source href="https://example.com/guide" title="Guide" /><Source>Tool call evidence</Source></SourcesContent></Sources>
    <Plan defaultOpen><PlanHeader><PlanTitle>Draft plan</PlanTitle><PlanDescription>Host-supplied steps</PlanDescription><PlanAction><PlanTrigger /></PlanAction></PlanHeader><PlanContent><ol className="list-inside list-decimal text-control"><li>Review inputs</li><li>Propose changes</li></ol></PlanContent><PlanFooter>Actions belong to the host.</PlanFooter></Plan>
  </main>
}
