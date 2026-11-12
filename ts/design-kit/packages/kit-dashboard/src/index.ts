/**
 * @hollis-labs/kit-dashboard — the System Operations idiom.
 *
 * Layer 3+4 of the Hollis Labs frontend layering, bundled: the dense-operations
 * look, and the components that carry it.
 *
 * WHAT THIS PACKAGE IS NOT. It is not where a Button lives. Idiom-free
 * primitives are `@hollis-labs/design-components`, transport is
 * `@hollis-labs/design-app-runtime`, and the token contract is
 * `@hollis-labs/design-tokens`. This package depends on all three and re-exports
 * none of them — taking the dashboard should be a choice, not a side effect of
 * wanting a Button.
 *
 * The canonical theme ships as raw CSS; import it once in your app:
 *   import '@hollis-labs/kit-dashboard/theme.css'
 */
export * from './ui'
