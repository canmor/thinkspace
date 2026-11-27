import {readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'

const dir=process.argv[2]??'evidence/goal-2b1-sol-default'
const read=async path=>JSON.parse(await readFile(path,'utf8'))
const current=(await read(join(dir,'evaluation-reviewed.json'))).results
const previous=(await read('evidence/goal-2b1/evaluation-reviewed.json')).results.filter(r=>r.arm==='F')
const delivered=c=>['accepted','text'].includes(c.status)
function count(rows) {
 const calls=rows.flatMap(r=>r.checks)
 return {episodes:rows.length,first:rows.filter(r=>delivered(r.checks[0])).length,
  final:rows.filter(r=>delivered(r.checks.at(-1))).length,success:rows.filter(r=>r.corePass).length,
  behavioralPass:rows.filter(r=>r.status.behavior==='pass').length,
  repairs:calls.length-rows.length,truncated:calls.filter(c=>c.status==='truncated').length,
  inputTokens:calls.reduce((sum,c)=>sum+c.input,0),outputTokens:calls.reduce((sum,c)=>sum+c.output,0)}
}
const groups={}
for(const [name,rows] of [['sol',current],['gpt41',previous]]){
 groups[name]={}
 for(const group of ['core','holdout',...new Set(rows.map(r=>r.task))]){
  groups[name][group]=count(rows.filter(r=>group==='core'?r.task.startsWith('B'):group==='holdout'?r.task.startsWith('T'):r.task===group))
 }
}
await writeFile(join(dir,'comparison-reviewed.json'),JSON.stringify(groups,null,2)+'\n')
console.log(groups.sol.core,groups.sol.holdout)
