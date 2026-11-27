// Aggregate only reviewed scores. Historical scores and human assessments are separate.
import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {core,holdout} from './plan.mjs'
const load=async path=>JSON.parse(await readFile(path))
const save=(path,obj)=>writeFile(path,JSON.stringify(obj,null,2)+'\n')
const main='evidence/goal-2b1',sol='evidence/goal-2b1-sol-default'
const summary={},packet=[]
for(const dir of [main,sol]){
 const {results}=await load(dir+'/evaluation-reviewed.json')
 for(const r of results){
  const k=r.arm+'/'+(r.task.startsWith('T')?'holdout':'core')
  const s=summary[k]??={episodes:0,confirmed:0,domainPending:0,mappingPass:0,delivered:0,callLatencyMs:[]}
  s.episodes++
  s.confirmed+=Number(r.corePass)
  s.domainPending+=Number(r.status.domain==='NE'&&r.status.transport==='pass'&&['NA','pass'].includes(r.status.specification))
  s.mappingPass+=Number(r.status.behavior==='pass')
  s.callLatencyMs.push(...r.checks.map(c=>c.latencyMs))
  if(!['accepted','text'].includes(r.checks.at(-1).status))continue
  s.delivered++
  if(r.arm==='G'){
   const ep=await load(dir+'/episodes/'+r.id+'.json'),a=ep.attempts.at(-1)
   packet.push({case:createHash('sha256').update('review-sol/'+r.id).digest('hex').slice(0,12),request:core[r.task]??holdout[r.task],protocol:r.protocol,wire:'structured',raw:a.raw})
  }
 }
}
for(const s of Object.values(summary)){
 const xs=s.callLatencyMs.sort((a,b)=>a-b),i=Math.floor(xs.length/2)
 s.medianCallMs=xs.length%2?xs[i]:(xs[i-1]+xs[i])/2;delete s.callLatencyMs
}
await save(main+'/summary-reviewed.json',{rubric:'2.1',independentHumanRatings:0,summary})
await save(sol+'/review-cases.json',packet.sort((a,b)=>a.case.localeCompare(b.case)))
console.table(summary)
