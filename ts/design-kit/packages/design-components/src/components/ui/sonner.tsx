/**
 * Vendored from shadcn/ui (MIT), inherited through sysop-ui.
 * Copyright (c) 2023 shadcn
 * Upstream: apps/v4/styles/base-nova/ui/sonner.tsx
 * Source:   https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/sonner.tsx
 * Version:  base-nova reference @ 36139f6 (2026-05-14); attribution audited 2026-10-02
 * History:  first recorded in sysop-ui 4bc6303 (2026-05-15).
 *           Original generator revision/copy date unrecorded; Source is a comparison reference.
 * Divergences: Theme prop default; next-themes and icon overrides removed; contract CSS variables.
 */
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = (props: ToasterProps) => {
  return (
    <Sonner
      // `system`, decided in review round 2, on the same reasoning as the raised
      // Card and Dialog: the generic primitive gets the conventional behaviour and
      // the dense-ops opinion stays with the idiom that wants it. sysop-ui
      // hardcoded `dark`, so a light app got a dark toaster. kit-dashboard passes
      // `theme="dark"` if it wants one — `{...props}` spreads last.
      theme="system"
      className="toaster group"
      // NO `icons` OVERRIDE, and removing it is a pure subtraction. sonner ships
      // its own SuccessIcon / ErrorIcon / WarningIcon / InfoIcon / Loader
      // (verified in sonner/dist/index.mjs); sysop-ui overrode all five with
      // lucide, which is 5 of the 19 icons this package would otherwise have had
      // to vendor. A consumer who wants different ones passes `icons` through the
      // spread below.
      style={
        {
          // A REPAIR, NOT A PORT. sysop-ui reached for shadcn's stock raw
          // variables here — `var(--popover)`, `var(--popover-foreground)`,
          // `var(--border)` — and NONE OF THE THREE IS DECLARED ANYWHERE in that
          // codebase. shadcn's v4 template declares both a raw `--popover` and
          // `--color-popover: var(--popover)`; sysop-ui rebuilt the value layer as
          // `--theme-color-*` and kept only the `--color-*` half, so the raw names
          // the vendored component reaches for were never created. An invalid
          // custom property is invalid at computed-value time, so sonner falls back
          // to its own defaults: the toast renders and has simply never been
          // themed. Invisible to every instrument in this epic, all of which read
          // className strings rather than inline styles.
          //
          // `var(--radius)` DID resolve there, and would stop here: the contract
          // does not override Tailwind's radius scale and declares no bare
          // `--radius` — only `--radius-panel` and `--radius-control`.
          //
          // These name contract tokens through sonner's documented theming
          // surface. Still "a component may name a token, never a value".
          "--normal-bg": "var(--color-bg-elevated)",
          "--normal-text": "var(--color-fg)",
          "--normal-border": "var(--color-border)",
          "--border-radius": "var(--radius-control)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
