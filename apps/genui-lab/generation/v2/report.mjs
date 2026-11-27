import {readFile,writeFile} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {core,holdout} from './plan.mjs'
import {visible,delivered} from './score.mjs'
const dir=resolve(process.argv[2]||'evidence/goal-2b1'),load=async f=>JSON.parse(await readFile(join(dir,f)))
const {results}=await load('evaluation.json'),manifest=await load('manifest.json'),baseline=await load('baseline-v2.json')
const adjustments=await load('annotation-review.json').catch(e=>{if(e.code==='ENOENT')return [];throw e})
for(const row of adjustments){
 const r=results.find(r=>r.id===row.id)
 if(!r)throw Error('Unknown annotation id '+row.id)
 Object.assign(r.status,row.axes);r.notes.push(row.rationale);r.corePass=r.status.intent==='pass'&&r.status.domain==='pass'&&['pass','NA'].includes(r.status.behavior)
}
const successful=c=>['accepted','text'].includes(c.status)
function totals(rs){
 const all=rs.flatMap(r=>r.checks),repairs=rs.flatMap(r=>r.checks.slice(1)),first=rs.map(r=>r.checks[0]),last=rs.map(r=>r.checks.at(-1))
 const hist=xs=>Object.fromEntries([...new Set(xs)].map(x=>[x,xs.filter(y=>x===y).length]))
 const usage=xs=>{const sum=k=>xs.reduce((n,x)=>n+(x[k]??0),0),sorted=xs.map(x=>x.latencyMs).filter(Number.isFinite).sort((a,b)=>a-b)
  return {calls:xs.length,input:sum('input'),output:sum('output'),costUSD:sum('cost'),medianMs:sorted.length?sorted[Math.floor(sorted.length/2)]:null}}
 return {n:rs.length,firstTransport:first.filter(c=>c.transport).length,firstDelivered:first.filter(successful).length,finalDelivered:last.filter(successful).length,corePass:rs.filter(r=>r.corePass).length,exampleCopy:rs.filter(r=>r.exampleCopy).length,axes:Object.fromEntries(Object.keys(results[0].status).map(k=>[k,hist(rs.map(r=>r.status[k]))])),failures:hist(all.filter(c=>c.category).map(c=>c.category)),usage:usage(all),repairs:usage(repairs)}
}
const output={core:{},holdout:{},contrasts:[],baseline:{},byProtocol:{},byTask:{},confirmedHumanAssessments:0}
const isCore=r=>Object.hasOwn(core,r.task)
for(const [name,part] of [['core',results.filter(isCore)],['holdout',results.filter(r=>!isCore(r))]]){
 for(const {id} of manifest.arms){const group=part.filter(r=>r.arm===id);if(!group.length)continue
  output[name][id]=totals(group)
  for(const p of ['oui','json'])output.byProtocol[[name,id,p].join('/')]=totals(group.filter(r=>r.protocol===p))
  for(const task of new Set(group.map(r=>r.task)))output.byTask[[id,task].join('/')]=totals(group.filter(r=>r.task===task))
 }
 for(const [a,b] of [['A','B'],['B','C'],['C','D'],['D','E'],['E','F']]){
  const pairs=part.filter(r=>r.arm===a).map(x=>[x,part.find(r=>r.arm===b&&r.task===x.task&&r.protocol===x.protocol&&r.seed===x.seed)]).filter(p=>p[1])
  if(!pairs.length)continue
  for(const [metric,get] of [['finalDelivery',r=>successful(r.checks.at(-1))],['coreSuccess',r=>r.corePass]]){
   const wins=pairs.filter(([x,y])=>!get(x)&&get(y)).length,losses=pairs.filter(([x,y])=>get(x)&&!get(y)).length
   output.contrasts.push({split:name,from:a,to:b,metric,pairs:pairs.length,wins,losses,unchanged:pairs.length-wins-losses,net:wins-losses})
  }
 }
}
for(const cohort of ['openai','local']){
 const rs=baseline.results.filter(r=>r.cohort===cohort)
 output.baseline[cohort]={n:rs.length,axes:Object.fromEntries(Object.keys(rs[0].status).map(k=>[k,Object.fromEntries(['pass','fail','NA','NE'].map(v=>[v,rs.filter(r=>r.status[k]===v).length]))])),corePass:rs.filter(r=>r.status.intent==='pass'&&r.status.domain==='pass'&&['pass','NA'].includes(r.status.behavior)).length}
}
const blind=[],key=[],sheet=[]
for(const r of results.filter(r=>successful(r.checks.at(-1)))){
 const d=await load('episodes/'+r.id+'.json'),a=d.attempts.at(-1),id=createHash('sha256').update('2b1review/'+r.id).digest('hex').slice(0,12)
 blind.push({case:id,request:core[r.task]??holdout[r.task],wire:r.arm==='A'?'legacy':'structured',protocol:r.protocol,orderedBlocks:a.blocks??null,text:visible(a),frame:a.frame,raw:a.raw})
 key.push({case:id,id:r.id})
 sheet.push({case:id,reviewer:null,...Object.fromEntries(Object.keys(r.status).map(k=>[k,null])),rationale:null})
}
const save=(f,v)=>writeFile(join(dir,f),JSON.stringify(v,null,2)+'\n')
await save('summary.json',output);await save('review/new-cases.json',blind.sort((a,b)=>a.case.localeCompare(b.case)));await save('review/new-key.json',key);await save('review/new-blank-scorecard.json',sheet.sort((a,b)=>a.case.localeCompare(b.case)))
await save('scored-v2.json',{rubric:'2.0',adjustments:'annotation-review.json',results})
console.log(JSON.stringify({core:Object.entries(output.core).map(([arm,s])=>({arm,n:s.n,first:s.firstDelivered,final:s.finalDelivered,success:s.corePass,cost:s.usage.costUSD})),holdout:Object.entries(output.holdout).map(([arm,s])=>({arm,n:s.n,final:s.finalDelivered,success:s.corePass}))}))
