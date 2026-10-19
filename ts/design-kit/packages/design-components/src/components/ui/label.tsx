/**
 * Vendored from shadcn/ui (MIT), inherited through sysop-ui.
 * Copyright (c) 2023 shadcn
 * Upstream: apps/v4/styles/base-nova/ui/label.tsx
 * Source:   https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/label.tsx
 * Version:  base-nova reference @ 36139f6 (2026-05-14); attribution audited 2026-10-02
 * History:  first recorded in sysop-ui fe8493c (2026-05-17).
 *           Original generator revision/copy date unrecorded; Source is a comparison reference.
 * Divergences: Local cn import; client directive removal.
 */
import * as React from "react"

import { cn } from "../../lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
