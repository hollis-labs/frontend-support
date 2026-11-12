import { useIdentity } from '../client'

export function Probe() {
  const { badge } = useIdentity()
  return <p data-testid="badge">{badge.state}</p>
}
