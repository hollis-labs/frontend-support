/** Deterministic robot identity harvested from Tachyon; color comes from the active theme. */
function sprite(identity: string) {
  let seed = 2166136261
  for (const c of identity) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619)
  const palette = ['text-status-doing','text-status-done','text-status-review','text-status-blocked','text-status-paused','text-status-todo']
  const tone = palette[(seed >>> 0) % palette.length]
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0x100000000}
  const half:boolean[][]=Array.from({length:8},()=>Array(4).fill(false))
  half[0][3]=true;if(next()>.5)half[0][0]=true
  for(let r=1;r<=4;r++)for(let c=1;c<4;c++)half[r][c]=true
  if(next()>.5)half[2][0]=half[3][0]=true
  for(let r=5;r<8;r++){half[r][3]=half[r][2]=true;half[r][1]=next()>.35;half[r][0]=next()>.55}
  return {tone,half}
}

export function IdentityAvatar({ identity, size = 'default' }: { identity: string; size?: 'small' | 'definition' | 'default' | 'large' | 'detail' }) {
  const {tone,half}=sprite(identity)
  return <svg viewBox="0 0 8 8" shapeRendering="crispEdges" role="img" aria-label="Robot identity" className={`${tone} ${size==='small'?'dash-identity-small':size==='definition'?'dash-identity-definition':size==='detail'?'size-18':size==='large'?'dash-identity-large':'size-10'} shrink-0`}>
    {half.flatMap((row,r)=>[...row,...[...row].reverse()].map((on,c)=>on&&!(r===2&&(c===2||c===5))?<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="currentColor" opacity={r>=5?.6:1}/>:null))}
    <path d="M2 2h1v1H2z M5 2h1v1H5z" className="fill-bg" />
  </svg>
}
