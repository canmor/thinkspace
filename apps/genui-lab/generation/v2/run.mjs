import {readFile,mkdir,writeFile,rename,readdir} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {parseEnv} from 'node:util'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {preview} from 'vite'
import {chromium} from '@playwright/test'
import {version,arms,core,holdout,prompt,seeds} from './plan.mjs'
import {request} from './provider.mjs'
import {replay} from '../browser.mjs'
const out=resolve(process.argv[2]||'runs/2b1-'+Date.now());await mkdir(join(out,'episodes'),{recursive:true})
if((await readdir(join(out,'episodes'))).length)throw Error('Use a fresh experiment directory')
execFileSync('npm',['run','build'],{stdio:'inherit'})
execFileSync('npm',['test'],{stdio:'inherit',env:{...process.env,GENUI_PROVIDER_PREFLIGHT:'openai',GENUI_REPORT:join(out,'preflight.json')}})
const stats=JSON.parse(await readFile(join(out,'preflight.json'))).stats
if(stats.unexpected||stats.skipped||stats.flaky||stats.expected<23)throw Error('Security preflight incomplete')
const key=parseEnv(await readFile('../../.env','utf8')).OPENAI_TOKEN
if(!key)throw Error('Missing OPENAI_TOKEN')
const hashes={}
for(const file of ['generation/v2/plan.mjs','generation/v2/schema.json','generation/v2/rubric.md','generation/harness.mjs','package-lock.json'])hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex')
const jobs=[]
for(const seed of seeds)for(const task of [...Object.keys(core),...Object.keys(holdout)])for(const protocol of ['oui','json'])for(const arm of arms){
 if(task in holdout&&!['D','E','F'].includes(arm.id))continue
 jobs.push({id:[arm.id,task,protocol,seed].join('-'),task,protocol,seed,arm:arm.id})
}
await writeFile(join(out,'manifest.json'),JSON.stringify({version,arms,seeds,jobs,hashes,sourceBaseline:'dcd0701',catalog:'1.1',policy:'1.5.0',protocols:{oui:'1.2.0',json:'0.23.2'},node:process.version,chromium:'1255',repairLimit:1,temperature:.35,top_p:.9},null,2))
const server=await preview({preview:{host:'127.0.0.1',port:0}}),url=new URL('replay.html',server.resolvedUrls.local[0]).href
const browser=await chromium.launch(),cancel=new AbortController()
process.once('SIGINT',()=>cancel.abort());process.once('SIGTERM',()=>cancel.abort())
try{
 async function lane(){
  const page=await browser.newPage()
  for(let j;(j=jobs.shift());){
   cancel.signal.throwIfAborted()
   const arm=arms.find(a=>a.id===j.arm),attempts=[],path=join(out,'episodes',j.id+'.json')
   const persist=async()=>{await writeFile(path+'.tmp',JSON.stringify({...j,attempts},null,2));await rename(path+'.tmp',path)}
   for(let n=0;n<2;n++){
    const messages=prompt(arm,j.protocol,j.task,attempts.at(-1))
    let a
    try{a=await request(arm,messages,j.seed+n*100,key,cancel.signal)}catch(e){a={status:'provider-error',diagnostic:String(e)}}
    a.messages=messages;attempts.push(a);await persist()
    if(!a.status){
     const r=await replay(page,j.protocol,a.raw,url,arm.wire)
     Object.assign(a,r);await persist()
    }
    if(a.status==='provider-error')throw Error('Provider failure preserved in '+j.id+': '+a.diagnostic)
    if(!['truncated','rejected'].includes(a.status))break
    if(a.raw===undefined)a.raw=JSON.parse(a.rawResponse).choices?.[0]?.message?.content??''
   }
   console.log(j.id,attempts.at(-1).status)
  }
 }
 await Promise.all(Array.from({length:6},lane))
}finally{cancel.abort();await browser.close();await server.close()}
