import assert from 'node:assert/strict'
import {readFile,readdir,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
const root=process.argv[2]
if(!root)throw Error('Supply evidence root')
const read=async(path)=>JSON.parse(await readFile(path,'utf8'))
const rows=[]
const size=x=>Buffer.byteLength(x,'utf8')
for(const experiment of ['visual','revisions']){
 const dir=join(root,experiment)
 for(const file of (await readdir(dir)).filter(n=>/-(chart|svg|turn[123])\.json$/.test(n)).sort()){
  const run=await read(join(dir,file)),stem=file.slice(0,-5)
  const attempts=[]
  for(let n=0;n<run.attempts;n++){
   const a=await read(join(dir,stem+'.attempt'+n+'.json'))
   const usage=a.usage,reasoning=usage?.completion_tokens_details?.reasoning_tokens
   let reply
   try{reply=JSON.parse(a.rawResponse)}catch{}
   const content=reply?.choices?.[0]?.message?.content
   let specBytes=null
   if(a.raw&&run.mode!=='patch'){
    try{const block=JSON.parse(a.raw).blocks.find(b=>b.type==='ui');if(block)specBytes=size(block.source)}catch{}
   }
   attempts.push({status:a.result.status,providerMs:a.latencyMs??null,replayMs:a.replayMs??null,
    input:usage?.prompt_tokens??null,completion:usage?.completion_tokens??null,reasoning:reasoning??null,
    visibleEstimate:reasoning===undefined?null:usage.completion_tokens-reasoning,outputBytes:typeof content==='string'?size(content):null,
    specBytes,patchBytes:run.mode==='patch'&&a.raw?size(a.raw):null})
  }
  rows.push({experiment,task:run.task,protocol:run.protocol,seed:run.seed,mode:run.mode,turn:run.turn??null,
   endToEndMs:run.endToEndMs,delivery:run.delivery,attempts})
 }
}
const metric=values=>{
 const measured=values.filter(Number.isFinite).sort((a,b)=>a-b),n=measured.length
 return {n,total:n?measured.reduce((a,b)=>a+b,0):null,median:n?(measured[(n-1)>>1]+measured[n>>1])/2:null}
}
const byMode={}
for(const mode of ['svg','chart','full','patch']){
 const rs=rows.filter(r=>r.mode===mode),as=rs.flatMap(r=>r.attempts),repairs=rs.flatMap(r=>r.attempts.slice(1))
 byMode[mode]={episodes:rs.length,calls:as.length,firstPass:rs.filter(r=>r.attempts[0].status==='accepted').length,
  delivered:rs.filter(r=>r.delivery==='accepted').length,truncatedCalls:as.filter(a=>a.status==='truncated').length,
  repairCalls:repairs.length,repairCompletion:metric(repairs.map(a=>a.completion)),endToEndMs:metric(rs.map(r=>r.endToEndMs)),
  ...Object.fromEntries(['input','completion','reasoning','visibleEstimate','outputBytes','specBytes','patchBytes','providerMs','replayMs'].map(k=>[k,metric(as.map(a=>a[k]))]))}
}
assert.equal(new Set(rows.map(r=>JSON.stringify([r.mode,r.task,r.protocol,r.seed,r.turn]))).size,rows.length)
await writeFile(join(root,'measurements.json'),JSON.stringify({byMode,rows},null,2)+'\n')
