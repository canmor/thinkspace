// Evaluation-only module. The provider/harness has no dependency on this file.
import {ranking,baggageCases} from '../../tests/oracles.mjs'
const integerRange=(min,max)=>Array.from({length:max-min+1},(_,i)=>min+i)
export const interactive=new Set(['B03','B04','T11','T12'])
const near=(a,b)=>typeof a==='number'&&Math.abs(a-b)<0.00501
const closeName=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'')
const one=(xs,pred)=>{const found=xs.filter(pred);return found.length===1?found[0]:undefined}
const combined=c=>c.props.label+' '+c.binding
function category(c,rx){return c?.props.choices.findIndex(x=>rx.test(x.trim()))??-1}
const standard=/^(none|normal|standard|regular|basic|no|no gold|non[- ]?gold|non[- ]?member|not gold|no membership|non[- ]?status|no status)$/i
const gold=/^(gold|yes|gold member(ship)?|gold status)$/i
export function design(task,frame){
 const cs=frame.items.filter(i=>i.type==='Control')
 const issues=[],units=[],cases=[]
 const range=(a,b)=>c=>!c.props.choices.length&&c.props.min===a&&c.props.max===b
 const named=(re)=>c=>re.test(combined(c))
 const choose=(...preds)=>preds.map(p=>one(cs,p)).find(Boolean)
 const add=(name,c,lo,hi,initial)=>{
  units.push({name,c})
  if(!c){issues.push('Missing or ambiguous input: '+name);return}
  if(lo!=null&&(c.props.min!==lo||c.props.max!==hi))issues.push(name+' has domain '+c.props.min+'..'+c.props.max+', expected '+lo+'..'+hi)
  if(initial!=null&&frame.state[c.binding]!==initial)issues.push(name+' has incorrect default')
 }
 function options(c,patterns,name){
  const indices=patterns.map(rx=>category(c,rx))
  if(c&&(indices.includes(-1)||new Set(indices).size!==patterns.length||c.props.choices.length!==patterns.length))issues.push(name+' options: '+JSON.stringify(c.props.choices))
  return indices
 }
 let roles
 if(task==='B03'){
  const start=[40,25,35],names=[/native/i,/light|runtime/i,/delivery|efficien/i]
  names.forEach((rx,i)=>{const c=choose(named(rx));add(['native','runtime','delivery'][i],c,null,null,start[i]);if(c&&(c.props.min!==0||c.props.max<start[i]||c.props.choices.length))issues.push('Weight domain excludes requested inputs')})
  for(const weights of [[40,25,35],[1,0,0],[0,1,0],[0,0,1],[0,0,0],[1,0,2],[13,7,19],[2,2,2],[0,9,3],[17,4,0]])cases.push({inputs:weights,ranking:ranking(weights)})
 }else if(task==='B04'){
  const fare=choose(c=>category(c,/economy/i)>=0,named(/fare|class/i)),member=choose(c=>category(c,gold)>=0&&c!==fare,named(/gold|member|status/i)),weight=choose(range(10,40),named(/weight|mass|kg/i))
  add('fare',fare);add('membership',member);add('weight',weight,10,40)
  const fares=options(fare,[/^economy$/i,/^business$/i],'Fare'),members=options(member,[standard,gold],'Membership')
  for(const c of baggageCases())cases.push({inputs:[fares[Number(c.fare==='Business')],members[Number(c.membership==='Gold')],c.weight],outputs:[c.allowance,c.fee]})
  roles=[/allow|limit|free.*kg/i,/fee|charge|cost|dollar|\$/i]
 }else if(task==='T11'){
  add('rows',choose(range(1,4),named(/row/i)),1,4,2);add('columns',choose(range(2,6),named(/col/i)),2,6,3)
  for(const r of integerRange(1,4))for(const c of integerRange(2,6))cases.push({inputs:[r,c],outputs:[r*c,r*c/4]})
  roles=[/seed|plant|count|cells/i,/water|litre|liter/i]
 }else if(task==='T12'){
  const size=choose(c=>category(c,/small/i)>=0,named(/size|type/i)),blocks=choose(range(1,8),named(/block|duration/i))
  const indices=options(size,[/^small$/i,/^large$/i],'Size')
  add('size',size,null,null,indices[0]);add('blocks',blocks,1,8,1)
  for(const n of integerRange(1,8))for(const [i,rate] of [2,5].entries())cases.push({inputs:[indices[i],n],outputs:[n*rate]})
  roles=[/credit|cost|total/i]
 }
 if(cs.length!==units.length)issues.push('Unexpected input count '+cs.length+' vs '+units.length)
 if(new Set(units.map(u=>u.c?.binding)).size!==units.length)issues.push('Input roles are not independent')
 return {issues,units,cases,roles}
}
function rankingMatches(values,expected){
 if(values.length!==expected.length||new Set(values.map(v=>closeName(v.label))).size!==expected.length)return false
 return values.every((v,i)=>{const ref=expected.find(e=>closeName(e.name)===closeName(v.label));return ref&&near(v.score,ref.score)&&(i===0||values[i-1].score>=v.score)})
}
export async function probe(page,task,frame){
 const {issues,units,cases,roles}=design(task,frame),controls=frame.items.filter(x=>x.type==='Control'),state={...frame.state}
 const report={roleBindings:units.map(u=>u.c?.binding??null),domain:units.some(u=>!u.c)?'NE':issues.length?'fail':'pass',issues,behavior:'NE',tested:0,required:cases.length,observations:[]}
 if(units.some(u=>!u.c)||cases.some(c=>c.inputs.includes(-1))){report.reason='Required input cannot be identified or selected';return report}
 const indexes=units.map(u=>controls.indexOf(u.c)),candidates=roles?.map(rx=>{
  const metrics=frame.items.map((x,i)=>({x,i})).filter(({x})=>x.type==='Metric')
  const labeled=metrics.filter(({x})=>rx.test(x.props.label))
  return new Set((labeled.length?labeled:metrics).map(v=>v.i))
 })
 let tables=new Set(frame.items.flatMap((x,i)=>x.type==='Table'?[i]:[]))
 try{
  for(const sample of cases){
   for(const [i,n] of sample.inputs.entries()){
    const c=units[i].c
    if(n<c.props.min||n>c.props.max){report.reason='Requested input outside admitted bounds';return report}
    if(state[c.binding]===n)continue
    const el=page.locator('.stack label').nth(indexes[i]).locator('input,select')
    if(c.props.choices.length)await el.selectOption(String(n));else await el.fill(String(n))
    await page.waitForFunction(({k,n})=>{const r=JSON.parse(document.querySelector('#result').textContent);return r.status==='runtime-error'||r.frame?.state[k]===n},{k:c.binding,n},{timeout:2500})
    state[c.binding]=n
   }
   const r=JSON.parse(await page.locator('#result').textContent())
   if(r.status!=='accepted')throw Error('Runtime: '+r.diagnostic)
   const items=r.frame.items
   if(sample.ranking){
    tables=new Set([...tables].filter(i=>rankingMatches(items[i].props.values,sample.ranking)))
   }else sample.outputs.forEach((v,j)=>{for(const i of candidates[j])if(Math.abs(items[i].props.value-v)>1e-9)candidates[j].delete(i)})
   report.tested++
   const mismatch=sample.ranking?!tables.size:candidates.some(s=>!s.size)
   if(mismatch||report.tested===1||report.tested===cases.length)report.observations.push({sample,actual:items.filter(x=>['Table','Metric'].includes(x.type)).map(x=>x.props)})
   if(mismatch){report.behavior='fail';report.reason='No stable observable output matches the independent mapping';return report}
  }
  report.behavior='pass'
 }catch(e){report.behavior=String(e).includes('Runtime:')?'fail':'NE';report.reason=String(e).slice(0,300)}
 return report
}
