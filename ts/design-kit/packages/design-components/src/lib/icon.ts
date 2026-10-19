/**
 * THE SHAPE AN ICON PROP TAKES, and the rule for choosing between the two.
 *
 * This survived a reversal and is the part of that work worth keeping. The icons
 * themselves were briefly vendored as inline SVG; review round 3 overturned that
 * and `lucide-react` is a peer dependency again, so a consumer picks the library
 * and its major version. The PROP SHAPE was never what that decision was about.
 *
 * THE RULE — two shapes look like inconsistency until you know the seam:
 *
 *   If the component sizes it   -> `IconComponent`, and the component renders
 *                                  `<Icon className="size-4" />`.
 *   If the consumer composes it -> `ReactNode`, and the component wraps it and
 *                                  sizes descendants.
 *
 * `IconComponent` is the default, and the reason is the one rule. Size is scale.
 * A `ReactNode` icon prop forces the component either to `cloneElement` — fragile,
 * and it silently drops the consumer's own className — or to trust the caller to
 * size it, which puts a SCALE DECISION AT EVERY CALL SITE in every consuming app.
 * A prop shape that relocates a scale decision to consumers is a hole in the thing
 * this package exists to close.
 *
 * `ReactNode` is kept only where the slot is documented as arbitrary content
 * rather than an icon — `Callout.icon`, which also accepts `null` to mean "omit",
 * and `OverflowAction.icon`. Both already wrap and size their slot.
 */
export type IconComponent = (props: { className?: string }) => React.ReactNode
