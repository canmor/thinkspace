// Host-side answer keys. Never include these functions in model context.
const whole = (lo,hi) => Array.from({length:hi-lo+1},(_,i)=>lo+i)
export function expectedSeries(task, state) {
 if(task==='fee'||task==='policies'){
  const allowance=(state.business?32:23)+(state.gold?5:0)+(state.international?2:0)
  return (task==='fee'?[15]:[15,20]).map(rate=>whole(10,40).map(x=>[x,rate*Math.max(0,x-allowance)]))
 }
 if(task==='tide')return [[2,3,5,4,2,1].map((y,x)=>[x,y+state.adjustment])]
 if(task==='kiln')return [30,20].map(rate=>whole(0,6).map(x=>[x,20+rate*Math.min(3,x)]))
 if(task==='archive')return [whole(0,8).map(x=>[x,Math.max(0,30-x*state.pace)])]
 throw Error('Unknown task')
}
export function expectedMetrics(task,turn,s){
 if(task==='tickets'){
  const price=s.child&&turn>0?(turn===1?5:4):8
  return {total:s.count*price,...(turn>=2?{savings:s.count*(8-price)}:{})}
 }
 if(task==='water'){
  const drained=Math.min(24,s.minutes*(turn?s.rate:3))
  return {remaining:24-drained,...(turn===3?{drained}:{})}
 }
 if(task==='fabric'){
  const metres=s.count*(3+(turn?s.hem:0))
  return {metres,...(turn>=2?{cost:metres*(turn===3&&metres>=12?5:6)}:{})}
 }
 if(task==='baggage'){
  const allowance=(s.business?32:23)+(s.gold?5:0)+(turn&&s.international?2:0)
  const excess=Math.max(0,s.weight-allowance)
  return {allowance,fee:15*excess,...(turn===3?{newFee:20*excess,increase:5*excess}:{})}
 }
 throw Error('Unknown trajectory')
}
