import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Suggestions, Suggestion } from '../components/suggestion'
import { Context, ContextContentBody, ContextContentFooter, ContextContentHeader, ContextInputUsage, ContextOutputUsage, ContextReasoningUsage, ContextCacheUsage, type ContextProps } from '../components/context'
import { Question, QuestionInput, QuestionOption, QuestionOptions, QuestionSubmit, type QuestionProps } from '../components/question'
afterEach(cleanup)
const Usage = (props: ContextProps) => <Context {...props}><ContextContentHeader /><ContextContentBody><ContextInputUsage /><ContextOutputUsage /><ContextReasoningUsage /><ContextCacheUsage /></ContextContentBody><ContextContentFooter /></Context>
const Form = (props: QuestionProps) => <Question aria-label="Question" {...props}><QuestionOptions aria-label="Choices"><QuestionOption value="a">Alpha</QuestionOption><QuestionOption value="b">Beta</QuestionOption><QuestionOption value="c" disabled>Unavailable</QuestionOption></QuestionOptions><QuestionInput aria-label="Details" /><QuestionSubmit /></Question>
describe('suggestion actions', () => {
  it('reports the host suggestion without submitting a surrounding form and leaves disabled inert', () => {
    const click = vi.fn(), submit = vi.fn(); render(<form onSubmit={submit}><Suggestions><Suggestion suggestion="Explain" onClick={click} /><Suggestion suggestion="Disabled" disabled onClick={click} /></Suggestions></form>)
    fireEvent.click(screen.getByRole('button', { name: 'Explain' })); fireEvent.click(screen.getByRole('button', { name: 'Disabled' }))
    expect(click).toHaveBeenCalledOnce(); expect(click).toHaveBeenCalledWith('Explain'); expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole('group', { name: 'Suggestions' }).tabIndex).toBe(0)
  })
})
describe('numeric context presentation', () => {
  it('shows known zero costs/tokens and host usage with a clamped capacity meter', () => {
    render(<Usage usedTokens={150} maxTokens={100} usage={{ inputTokens: 0, outputTokens: 50 }} cost={{ totalUSD: 0, inputUSD: 0, outputUSD: 0.5 }} />)
    expect(screen.getByRole('progressbar').getAttribute('value')).toBe('100')
    expect(screen.getByText('150 / 100')).toBeTruthy();expect(screen.getByText('$0.00')).toBeTruthy();expect(screen.getByText('• $0.00')).toBeTruthy()
    expect(screen.getByText('$0.50', { exact: false })).toBeTruthy()
    expect(screen.getAllByText('Unknown', { exact: false }).length).toBeGreaterThan(0)
  })
  it.each([0, -1, NaN, Infinity])('keeps invalid capacity %s unknown without nonfinite output', maxTokens => {
    const view=render(<Usage usedTokens={10} maxTokens={maxTokens} />)
    expect(screen.queryByRole('progressbar')).toBeNull();expect(view.container.textContent).not.toMatch(/NaN|Infinity|\$0\.00/)
    expect(screen.getByText('10 / Unknown')).toBeTruthy()
  })
  it('keeps omitted/nonfinite/negative usage and costs unknown and honors host slots', () => {
    const view=render(<Usage usedTokens={NaN} maxTokens={100} usage={{ inputTokens: -2, outputTokens: Infinity }} cost={{ totalUSD: NaN }} />)
    expect(screen.queryByRole('progressbar')).toBeNull();expect(view.container.textContent).not.toMatch(/NaN|Infinity|\$0\.00/)
    view.rerender(<Context><ContextContentHeader>Host header</ContextContentHeader><ContextInputUsage>Host usage</ContextInputUsage><ContextContentFooter>Host price</ContextContentFooter></Context>)
    expect(screen.getByText('Host price')).toBeTruthy();expect(screen.queryByText('Total cost')).toBeNull()
  })
})
describe('question form', () => {
  it('uses native single selection without deselecting a chosen radio and reports trimmed text', async () => {
    const submit=vi.fn();render(<Form onSubmit={submit} />)
    const a=screen.getByRole('radio', { name: 'Alpha' }),b=screen.getByRole('radio', { name: 'Beta' })
    fireEvent.click(a);fireEvent.click(a);expect(a).toHaveProperty('checked',true)
    fireEvent.click(b);expect(a).toHaveProperty('checked',false);expect(b).toHaveProperty('checked',true)
    fireEvent.change(screen.getByRole('textbox'), {target:{value:'  <script>host data</script>  '}})
    await act(async()=>fireEvent.submit(screen.getByRole('form')))
    expect(submit).toHaveBeenCalledWith({selectedValues:['b'],text:'<script>host data</script>'},expect.anything())
    expect(document.querySelector('script')).toBeNull()
  })
  it('toggles independent native checkboxes and keeps disabled options inert', () => {
    render(<Form selectionMode="multiple" />)
    const a=screen.getByRole('checkbox', {name:'Alpha'}), b=screen.getByRole('checkbox',{name:'Beta'})
    fireEvent.click(a);fireEvent.click(b);fireEvent.click(a)
    expect(a).toHaveProperty('checked',false);expect(b).toHaveProperty('checked',true)
    const disabled=screen.getByRole('checkbox',{name:'Unavailable'});expect(disabled).toHaveProperty('disabled',true)
  })
  it('delegates controlled edits and allows the host to reject or accept them', () => {
    const change=vi.fn(),value={selectedValues:['a'],text:'host'};const view=render(<Form value={value} onValueChange={change} />)
    fireEvent.click(screen.getByRole('radio',{name:'Beta'}));expect(change).toHaveBeenLastCalledWith({selectedValues:['b'],text:'host'})
    expect(screen.getByRole('radio',{name:'Alpha'})).toHaveProperty('checked',true)
    view.rerender(<Form value={{selectedValues:['b'],text:'accepted'}} onValueChange={change} />)
    expect(screen.getByRole('textbox')).toHaveProperty('value','accepted')
  })
  it('supports required text policy and suppresses blank, disabled and host-pending submits', async () => {
    const submit=vi.fn();const view=render(<Form requireText onSubmit={submit} />)
    fireEvent.click(screen.getByRole('radio',{name:'Alpha'}));await act(async()=>fireEvent.submit(screen.getByRole('form')))
    expect(submit).not.toHaveBeenCalled();expect(screen.getByRole('textbox')).toHaveProperty('required',true)
    fireEvent.change(screen.getByRole('textbox'),{target:{value:'  '}});expect(screen.getByRole('button')).toHaveProperty('disabled',true)
    fireEvent.change(screen.getByRole('textbox'),{target:{value:'answer'}})
    view.rerender(<Form value={{selectedValues:['a'],text:'answer'}} disabled onSubmit={submit} />)
    await act(async()=>fireEvent.submit(screen.getByRole('form')));expect(submit).not.toHaveBeenCalled()
    view.rerender(<Form value={{selectedValues:['a'],text:'answer'}} pending onSubmit={submit} />)
    await act(async()=>fireEvent.submit(screen.getByRole('form')));expect(submit).not.toHaveBeenCalled()
  })
  it('locks synchronously against duplicate async submission and preserves the draft', async () => {
    let resolve!:()=>void;const submit=vi.fn(()=>new Promise<void>(r=>{resolve=r}));render(<Form defaultValue={{selectedValues:['a'],text:'draft'}} onSubmit={submit} />)
    const form=screen.getByRole('form');fireEvent.submit(form);fireEvent.submit(form)
    expect(submit).toHaveBeenCalledOnce();expect(form.getAttribute('aria-busy')).toBe('true');expect(screen.getByRole('textbox')).toHaveProperty('disabled',true)
    await act(async()=>resolve());expect(screen.getByRole('textbox')).toHaveProperty('value','draft');expect(screen.getByRole('button')).toHaveProperty('disabled',false)
  })
  it('reports failed submissions, retains the draft and allows retry', async () => {
    const error=new Error('host failure'),onError=vi.fn(),submit=vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined)
    render(<Form defaultValue={{selectedValues:['a'],text:'draft'}} onSubmit={submit} onSubmitError={onError} />)
    await act(async()=>fireEvent.submit(screen.getByRole('form')))
    expect(onError).toHaveBeenCalledWith(error);expect(screen.getByRole('alert')).toBeTruthy()
    expect(within(screen.getByRole('form')).getByRole('textbox')).toHaveProperty('value','draft')
    await act(async()=>fireEvent.submit(screen.getByRole('form')));expect(submit).toHaveBeenCalledTimes(2);expect(screen.queryByRole('alert')).toBeNull()
  })
})
