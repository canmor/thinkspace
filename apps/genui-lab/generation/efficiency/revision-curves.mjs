import assert from 'node:assert/strict'
// Each scale was transcribed independently from the committed graphic's labeled
// ticks. Uncalibrated encodings are explicitly unverified.
const scales={
 'baggage-oui-1701-full-turn3':[40,13,110,0.3],
 'baggage-oui-1701-full-turn2':[40,13,102,1/3],
 'baggage-oui-1701-patch-turn2':[40,12,105,1/3],
 'baggage-oui-1701-patch-turn3':[40,12,105,1/3],
 'baggage-oui-1702-patch-turn2':[36,13,103,1/3],
 'water-oui-1701-full-turn2':[40,64,110,4],
 'water-oui-1701-patch-turn2':[60,60,104,4],
 'water-oui-1702-full-turn2':[60,55,106,3],
 'water-oui-1702-patch-turn2':[65,55,108,4],
}
export function checkRevisionCurve(file,chart,state,task){
 const scale=scales[file.replace('.json','')]
 if(!scale)return 'unverified scale'
 const [origin,step,zero,factor]=scale,bag=task==='baggage',first=bag?10:0,last=bag?40:6
 const marks=chart.props.items.flatMap(m=>m.kind==="group"?m.items:[m]), path=marks.filter(m=>m.kind==='path').slice(1)
 const points=[]
 for(let x=first;x<=last;x++){
  const n=bag?(/new fee/i.test(chart.props.label)?20:15)*Math.max(0,x-(state.business?32:23)-5*state.gold-2*state.international):Math.max(0,24-state.rate*x)
  points.push([origin+(x-first)*step,zero-n*factor])
 }
 const close=(a,b)=>Math.abs(a-b)<0.001
 const dots=marks.filter(m=>m.kind==='circle')
 for(const d of dots)assert.ok(points.some(([x,y])=>close(d.cx,x)&&close(d.cy,y)),'Off-curve dot')
 if(dots.length>=points.length||!path.length)
  for(const [x,y] of points)assert.ok(dots.some(d=>close(d.cx,x)&&close(d.cy,y)),'Missing curve point')
 assert.ok(path.length<=1,'Unexpected path')
 if(path.length){
  const tokens=path[0].d.match(/[A-Za-z]|-?(?:\d+(?:\.\d+)?|\.\d+)/g),v=[]
  while(tokens.length){const op=tokens.shift();assert.ok(['M','L','H'].includes(op));v.push([Number(tokens.shift()),op==='H'?v.at(-1)[1]:Number(tokens.shift())])}
  assert.equal(v[0][0],origin);assert.equal(v.at(-1)[0],points.at(-1)[0])
  for(const [x,y] of points){
   const j=v.findIndex(([xx])=>xx>=x);const [bx,by]=v[j],[ax,ay]=v[Math.max(0,j-1)]
   assert.ok(close(bx===ax?by:ay+(by-ay)*(x-ax)/(bx-ax),y),'Incorrect displayed line')
  }
 }
 return 'pass'
}
