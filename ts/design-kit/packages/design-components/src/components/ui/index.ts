/**
 * The vendored primitives, in one barrel.
 *
 * These are shadcn components on Base UI (`@base-ui/react`), a peer.
 * Some bind Base UI components; Badge and ButtonGroupText use useRender.
 * Others are substrate-independent (table, textarea, card) or wrap their
 * existing peers (command/cmdk, sonner).
 *
 * `export *` is safe for tree-shaking here: the package declares
 * `sideEffects: ["**\/*.css"]` and the build preserves modules, so a consumer
 * importing one Button gets one Button.
 */
export * from './alert-dialog'
export * from './badge'
export * from './button'
export * from './button-group'
export * from './collapsible'
export * from './card'
export * from './checkbox'
export * from './command'
export * from './dialog'
export * from './dropdown-menu'
export * from './hover-card'
export * from './input'
export * from './input-group'
export * from './label'
export * from './popover'
export * from './scroll-area'
export * from './select'
export * from './separator'
export * from './sheet'
export * from './skeleton'
export * from './sonner'
export * from './switch'
export * from './table'
export * from './tabs'
export * from './textarea'
export * from './tooltip'
