import { useEffect, useState } from 'react'

/**
 * Report that a stream has gone quiet — no new content for `afterMs`.
 *
 * WHY THIS IS A HOOK FOR THE HOST RATHER THAN BEHAVIOUR INSIDE `ChatStream`, and it
 * is a direct consequence of the decision that this package never parses markdown.
 *
 * `ChatStream` receives already-rendered content as an opaque `ReactNode`. Two
 * renders carrying the same text produce two different objects, so the component
 * cannot tell "a token arrived" from "the host re-rendered" by looking at what it was
 * given. Only the host holds something that changes exactly when content does — the
 * accumulating string, a token count, a sequence number.
 *
 * So the honest shape is: the host owns the signal, and this hook owns the timer, so
 * nobody reimplements Nanite's version by hand.
 *
 *     const stalled = useStallDetector(text)
 *     <ChatStream status={stalled ? { status: 'stalled', role, content }
 *                                  : { status: 'streaming', role, content }} … />
 *
 * `afterMs` defaults to 2000, which is the value Nanite arrived at in production
 * rather than a number chosen here.
 *
 * `signal` should be a primitive that changes on every new token. Passing a value
 * that is recreated each render makes this report "never stalled"; passing one that
 * never changes makes it report stalled once and stay there. Both are correct
 * behaviour for the signal given, which is why the signal is the host's to choose.
 */
export function useStallDetector(signal: string | number | null, afterMs = 2000): boolean {
  const [stalled, setStalled] = useState(false)
  const [seen, setSeen] = useState(signal)

  /*
   * Reset DURING RENDER rather than in an effect. React documents this for state that
   * must adjust when a prop changes: it re-runs the component immediately without
   * committing the stale value, so the reader never sees a frame that says "stalled"
   * about content that just moved. Doing it in an effect is an extra commit and
   * `react-hooks/set-state-in-effect` is right to object.
   */
  if (signal !== seen) {
    setSeen(signal)
    setStalled(false)
  }

  useEffect(() => {
    if (signal === null) return
    const timer = setTimeout(() => setStalled(true), afterMs)
    return () => clearTimeout(timer)
  }, [signal, afterMs])

  return signal === null ? false : stalled
}
