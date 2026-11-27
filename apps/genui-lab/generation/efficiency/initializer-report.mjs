import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
const root=process.argv[2]
const load=async file=>JSON.parse(await readFile(join(root,file+'.json')))
const audited=await load('behavior'), rows=[]
for(const seed of [1701,1702]){
 const data=await Promise.all(['full','patch-v2'].map(mode=>load('paired-fixed/water-json-'+seed+'-'+mode+'-turn1')))
 assert.deepEqual(data[0].before,data[1].before,'Mismatched trajectory origins')
 for(const mode of ['full','patch-v2']){
  const interaction=await load('paired-fixed/water-json-'+seed+'-'+mode+'-turn1.selection')
  assert.ok(interaction.selected,'Mismatched requested rate interaction')
 }
}
for(const mode of ['full','patch-v2'])for(const seed of [1701,1702])for(const turn of [1,2,3]){
 const stem='water-json-'+seed+'-'+mode+'-turn'+turn, row=await load('paired-fixed/'+stem)
 const audit=audited.find(r=>r.file===stem+'.json')
 assert.ok(audit)
 const attempts=[]
 for(let n=0;n<row.attempts;n++)attempts.push(await load('paired-fixed/'+stem+'.attempt'+n))
 const texts=raw=>JSON.parse(raw).blocks.filter(b=>b.type==='text').map(b=>b.text)
 if(mode==='patch-v2')assert.deepEqual(texts(row.before.raw),texts(row.after.raw),'Unexpected patch prose modification')
 if(row.delivery!=='accepted')assert.deepEqual(row.after,row.before,'Failed publication changed artifact')
 const correct=audit.behavior==='pass'&&audit.introducedDefault!==false&&(turn!==2||audit.curve==='pass')
 rows.push({mode,seed,turn,correct,publication:row.delivery==='accepted',firstPassCorrect:correct&&row.attempts===1,
  attempts:row.attempts,ms:row.endToEndMs,input:attempts.reduce((n,a)=>n+a.usage.prompt_tokens,0),
  completion:attempts.reduce((n,a)=>n+a.usage.completion_tokens,0),beforeProse:texts(row.before.raw),afterProse:texts(row.after.raw)})
}
const byMode={}
for(const mode of ['full','patch-v2']){
 const rs=rows.filter(r=>r.mode===mode),correct=rs.filter(r=>r.correct).length
 const sum=k=>rs.reduce((n,r)=>n+r[k],0)
 byMode[mode]={turns:rs.length,published:rs.filter(r=>r.publication).length,correct,firstPassCorrect:rs.filter(r=>r.firstPassCorrect).length,
  correctTrajectories:[1701,1702].filter(seed=>rs.filter(r=>r.seed===seed).every(r=>r.correct)).length,
  inputTokens:sum('input'),completionTokens:sum('completion'),attempts:sum('attempts'),totalMs:sum('ms'),
  inputPerCorrect:sum('input')/correct,completionPerCorrect:sum('completion')/correct,msPerCorrect:sum('ms')/correct}
}
await writeFile(join(root,'comparison.json'),JSON.stringify({byMode,rows},null,2)+'\n')
