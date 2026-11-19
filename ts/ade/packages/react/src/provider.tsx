import type { Hub } from "@hollis-labs/ade-core"
import type { ReactNode } from "react"
import { HubContext } from "./hooks.js"

/** Gives the hub to everything beneath it. */
export function AdeProvider({ hub, children }: { hub: Hub; children: ReactNode }) {
  return <HubContext.Provider value={hub}>{children}</HubContext.Provider>
}
