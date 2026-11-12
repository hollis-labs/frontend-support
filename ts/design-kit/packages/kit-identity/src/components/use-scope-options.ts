import { useMemo, useState } from 'react'
import type { ApiTokenScope } from '@hollis-labs/kit-account'
import { useIdentity } from '../client/identity-context'

const VALID_SCOPE = /^\S+$/

/**
 * The server has no scope catalogue and lets a caller grant only scopes it holds. So the options are the caller's own
 * scopes (known after sign-in; "*" is dropped as it is not grantable by name), the host's suggestions, and anything typed.
 */
export function useScopeOptions(suggestions: readonly string[] = []) {
  const { profile } = useIdentity()
  const [extra, setExtra] = useState<readonly string[]>([])
  const options = useMemo<readonly ApiTokenScope[]>(() => {
    const own = (profile?.scopes ?? []).filter((scope) => scope !== '*')
    return [...new Set([...own, ...suggestions, ...extra])].map((id) => ({ id, label: id }))
  }, [profile, suggestions, extra])
  const add = (raw: string): boolean => {
    const scope = raw.trim()
    if (!VALID_SCOPE.test(scope)) return false
    setExtra((current) => (current.includes(scope) ? current : [...current, scope]))
    return true
  }
  return { options, add }
}
