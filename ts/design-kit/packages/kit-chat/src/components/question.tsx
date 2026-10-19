/**
 * Vendored from AI Elements (Vercel, Apache-2.0).
 * Upstream: packages/elements/src/question.tsx
 * Source: https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/question.tsx
 * Version: ai-elements 1.9.0 @ 6a9d5b1 (2026-08-21); vendored 2026-10-02
 * Divergences: Shared Button/Textarea/cn, token styles; native radio/checkbox semantics.
 * Host-configurable required text, controlled drafts, async duplicate-submit guard/error event.
 * This is a presentation form, not a Tangent transport or approval-card replacement.
 */
import { Button, Textarea, cn } from '@hollis-labs/design-components'
import { createContext, useContext, useId, useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react'
export interface QuestionValue { selectedValues: readonly string[]; text: string }
export interface QuestionResponse { selectedValues: readonly string[]; text?: string }
export type QuestionSelectionMode = 'single' | 'multiple'
interface QuestionContextValue { disabled: boolean; pending: boolean; requireText: boolean; name: string; selectionMode: QuestionSelectionMode; value: QuestionValue; setText: (text: string) => void; select: (value: string, checked: boolean) => void; canSubmit: boolean }
const QuestionContext = createContext<QuestionContextValue | null>(null)
const useQuestion = () => { const value = useContext(QuestionContext); if (!value) throw new Error('Question components must be used within Question'); return value }
const EMPTY_VALUE: QuestionValue = { selectedValues: [], text: '' }
export type QuestionProps = Omit<ComponentProps<'form'>, 'defaultValue' | 'value' | 'onSubmit'> & {
  value?: QuestionValue; defaultValue?: QuestionValue; onValueChange?: (value: QuestionValue) => void;
  onSubmit?: (response: QuestionResponse, event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onSubmitError?: (error: unknown) => void;
  disabled?: boolean; pending?: boolean; requireText?: boolean; selectionMode?: QuestionSelectionMode;
}
export const Question = ({ value: controlled, defaultValue = EMPTY_VALUE, onValueChange, onSubmit, onSubmitError, disabled = false, pending: hostPending = false, requireText = false, selectionMode = 'single', children, className, ...props }: QuestionProps) => {
  const [internal, setInternal] = useState(defaultValue), [submitting, setSubmitting] = useState(false), [failed, setFailed] = useState(false)
  const inFlight = useRef(false), name = useId(), value = controlled ?? internal
  const selectedValues = selectionMode === 'single' ? value.selectedValues.slice(0, 1) : [...new Set(value.selectedValues)]
  const draft = { ...value, selectedValues }, pending = hostPending || submitting, locked = disabled || pending
  const canSubmit = requireText ? value.text.trim().length > 0 : selectedValues.length > 0 || value.text.trim().length > 0
  const setValue = (next: QuestionValue) => { if (locked || inFlight.current) return; setFailed(false); if (controlled === undefined) setInternal(next); onValueChange?.(next) }
  const select = (option: string, checked: boolean) => setValue({ ...draft, selectedValues: selectionMode === 'single' ? [option] : checked ? [...new Set([...selectedValues, option])] : selectedValues.filter(item => item !== option) })
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (locked || inFlight.current || !canSubmit || !onSubmit) return
    inFlight.current = true; setSubmitting(true); setFailed(false)
    try { await onSubmit({ selectedValues, text: value.text.trim() || undefined }, event) }
    catch (error) { setFailed(true); onSubmitError?.(error) }
    finally { inFlight.current = false; setSubmitting(false) }
  }
  return <QuestionContext.Provider value={{ disabled: locked, pending, requireText, name, selectionMode, value: draft, setText: text => setValue({ ...draft, text }), select, canSubmit }}>
    <form className={cn('space-y-4 rounded-panel border border-border bg-background p-4', className)} aria-busy={pending || undefined} {...props} onSubmit={handleSubmit}>
      {children}{failed && <p role="alert" className="text-sm text-destructive">Could not submit response. Try again.</p>}
    </form>
  </QuestionContext.Provider>
}
export type QuestionPromptProps = ComponentProps<'p'>
export const QuestionPrompt = ({ className, ...props }: QuestionPromptProps) => <p className={cn('text-sm font-medium', className)} {...props} />
export type QuestionDescriptionProps = ComponentProps<'p'>
export const QuestionDescription = ({ className, ...props }: QuestionDescriptionProps) => <p className={cn('text-sm text-muted-foreground', className)} {...props} />
export type QuestionOptionsProps = ComponentProps<'div'>
export const QuestionOptions = ({ className, ...props }: QuestionOptionsProps) => { const { selectionMode } = useQuestion(); return <div role={selectionMode === 'single' ? 'radiogroup' : 'group'} className={cn('flex flex-wrap gap-2', className)} {...props} /> }
export type QuestionOptionProps = Omit<ComponentProps<'input'>, 'type' | 'value' | 'checked' | 'defaultChecked' | 'children' | 'name'> & { value: string; children?: ReactNode }
export const QuestionOption = ({ value, children, className, disabled, onChange, ...props }: QuestionOptionProps) => {
  const question = useQuestion(), checked = question.value.selectedValues.includes(value)
  return <label className={cn('flex cursor-pointer items-center gap-2 rounded-control border border-border p-3 text-sm has-checked:bg-accent has-checked:text-accent-foreground has-disabled:cursor-default has-disabled:opacity-50', className)}>
    <input {...props} className="size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-ring" type={question.selectionMode === 'single' ? 'radio' : 'checkbox'} name={question.name} value={value} checked={checked} disabled={question.disabled || disabled}
      onChange={event => { onChange?.(event); if (!event.defaultPrevented) question.select(value, event.currentTarget.checked) }} />
    <span>{children ?? value}</span>
  </label>
}
export type QuestionInputProps = Omit<ComponentProps<typeof Textarea>, 'defaultValue' | 'value'>
export const QuestionInput = ({ className, disabled, onChange, required, ...props }: QuestionInputProps) => { const question = useQuestion(); return <Textarea className={cn('min-h-20', className)} {...props} value={question.value.text} disabled={question.disabled || disabled} required={question.requireText || required} onChange={event => { onChange?.(event); if (!event.defaultPrevented) question.setText(event.currentTarget.value) }} /> }
export type QuestionActionsProps = ComponentProps<'div'>
export const QuestionActions = ({ className, ...props }: QuestionActionsProps) => <div className={cn('flex items-center justify-end gap-2', className)} {...props} />
export type QuestionSubmitProps = ComponentProps<typeof Button>
export const QuestionSubmit = ({ children = 'Submit', disabled, ...props }: QuestionSubmitProps) => { const question = useQuestion(); return <Button {...props} type="submit" disabled={question.disabled || disabled || !question.canSubmit}>{children}</Button> }
