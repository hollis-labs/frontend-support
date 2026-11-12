import { RADIUS_TOKENS } from '../../../design-tokens/src/index.ts'
import { Button, Input, Card, Select, SelectTrigger, SelectValue } from '../../src/index.ts'
export function Matrix() { return <main className="space-y-4 p-4 text-fg">
  <h1>Radius primitive matrix</h1>
  <div className="flex flex-wrap gap-2">{(['default','xs','sm','lg','icon','icon-xs','icon-sm','icon-lg'] as const).map(size=><Button key={size} size={size} aria-label={'size '+size}>{size.startsWith('icon') ? '+' : size}</Button>)}</div>
  <div data-slot="button-group"><Button size="sm">Grouped small</Button></div>
  {RADIUS_TOKENS.map(alias=><div key={alias} className="space-y-2">
    <Button className={'rounded-'+alias}>{alias} override button</Button>
    <Input aria-label={alias+' override input'} className={'rounded-'+alias} />
    <Card className={'rounded-'+alias}>{alias} override card</Card>
    <Button className={'rounded-'+alias+' rounded-lg'}>{alias} then lg</Button>
  </div>)}
  <Select><SelectTrigger size="sm"><SelectValue placeholder="Small select" /></SelectTrigger></Select>
</main> }
