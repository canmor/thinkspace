import assert from 'node:assert/strict'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {parseEnv} from 'node:util'
import {preview} from 'vite'
import {chromium} from '@playwright/test'
import {origin} from './origins.mjs'
import {revisions} from './tasks.mjs'
import {prompt,arms} from '../v2/plan.mjs'
import {request} from '../v2/provider.mjs'

const [outDir,dir]=process.argv.slice(2)
const offline=process.argv.includes("--offline")
if(!outDir||!dir)throw Error('Supply build and output directories')
const schema={type:'object',additionalProperties:false,required:['artifact','base','operations'],properties:{
 artifact:{type:'string'},base:{type:'integer'},operations:{type:'array',items:{type:'object',additionalProperties:false,
 required:['op','key','value'],properties:{op:{type:'string',enum:['add','replace','remove']},key:{type:'string'},value:{type:'string'}}}}}}
const arm={...arms.at(-1),model:'gpt-6.2-sol'}
const guide='Return only the strict revision packet. Copy artifact and base from context. Each operation adds, replaces or removes one named declaration (OpenUI) or one named elements entry (json-render). value is the RHS expression or the JSON element encoded as a string. Remove uses an empty string. Touch a key at most once. Include root/layout updates when children change. No change is made to surrounding prose.'
const seeds=[1701,1702], key=offline?null:parseEnv(await readFile('../../.env','utf8')).OPENAI_TOKEN
if(!offline)assert.ok(key);assert.equal(JSON.parse(await readFile('evidence/goal-2b3/revision-preflight.json')).length,30)
if(!offline)await mkdir(dir,{recursive:true})
const save=(name,value)=>writeFile(join(dir,name+'.json'),JSON.stringify(value,null,2)+'\n')
const load=async name=>{try{return JSON.parse(await readFile(join(dir,name+'.json')))}catch(e){if(e.code==='ENOENT')return null;throw e}}
const manifest={arm,seeds,revisions,schema,guide,repairs:1,context:'current artifact, prior user requirements, and host selections; same in both arms',origin:'matched hand-authored fresh tasks and historical B04'}
const oldManifest=await load('manifest')
if(offline)assert.ok(oldManifest);
if(oldManifest)assert.deepEqual(oldManifest,manifest);else await save('manifest',manifest)
const server=await preview({build:{outDir},preview:{host:'127.0.0.1',port:0}})
const browser=await chromium.launch(),signal=new AbortController()
async function lane(protocol,seed){
 for(const [i,[task,trajectory]] of Object.entries(revisions).entries()){
  for(const mode of (i+seed)%2?['full','patch']:['patch','full']){
   const artifact=task+'-'+protocol+'-'+seed,name=artifact+'-'+mode
   const page=await browser.newPage({viewport:{width:1024,height:800}})
   const invoke=(method,...args)=>page.evaluate(async({method,args})=>window.revisionLab[method](...args),{method,args})
   try{
    await page.goto(new URL('revision.html',server.resolvedUrls.local[0]).href)
    const initial=await origin(task,protocol,seed)
    let current=await invoke('open',task,artifact,protocol,initial)
    async function select(pattern,value){
     const cs=current.frame.items.filter(c=>c.type==='Control'&&pattern.test(c.props.label))
     if(cs.length!==1)return false
     const c=cs[0]
     let n=value
     if(typeof value==='string'){
      n=c.props.choices.indexOf(value)
      if(n<0&&!c.props.choices.length&&c.props.label.toLowerCase().includes('1 = '+value.toLowerCase()))n=1
     }
     if(n<c.props.min||n>c.props.max)return false
     current=await invoke('change',c.binding,n);return true
    }
    if(task==='baggage'){assert.ok(await select(/status|gold|member/i,1));assert.ok(await select(/weight/i,38))}
    else assert.ok(await select(/count|elapsed/i,task==='water'?4:3))
    for(const [turn,change] of trajectory.changes.entries()){
     const stem=name+'-turn'+(turn+1),before=current,attempts=[]
     const messages=prompt(arm,protocol,'B04')
     if(mode==='patch'){
      messages[0].content=messages[0].content.slice(messages[0].content.indexOf('No JavaScript')).split('Unrelated response-shape examples.')[0]+'\n'+guide
     }
     messages[1].content=JSON.stringify({artifact,base:before.revision,original:task==='baggage'?prompt(arm,protocol,'B04')[1].content:trajectory.origin,
      previousRequests:trajectory.changes.slice(0,turn),currentArtifact:before.raw,controls:before.frame.items.filter(x=>x.type==='Control'),request:change})
     const started=performance.now()
     for(let n=0;n<=1;n++){
      const record=stem+'.attempt'+n,saved=await load(record)
      if(offline)assert.ok(saved,"Missing "+record);
      const a=saved??await request(arm,messages,seed+turn*10+n,key,signal.signal,mode==='patch'?schema:undefined).catch(e=>({status:'provider-error',diagnostic:e.message}))
      let result
      try{
       if(!a.raw)throw Error(a.diagnostic??a.status)
       const revised=await invoke('revise',artifact,before.revision,a.raw,mode)
       result={status:'accepted',...revised}
      }catch(e){result={status:a.status??'rejected',diagnostic:String(e.message).split('\n')[0]}}
      attempts.push(result)
      if(!saved)await save(record,{...a,messages:structuredClone(messages),result})
      else assert.deepEqual(result,saved.result)
      if(n||!['rejected','truncated'].includes(result.status))break
      messages.push({role:'assistant',content:a.raw??''},{role:'user',content:'Revision rejected: '+result.diagnostic+'. Return a corrected response.'})
     }
     const endToEndMs=performance.now()-started
     current=await invoke('snapshot')
     const delivery=attempts.at(-1).status
     if(delivery!=='accepted')assert.deepEqual(current,before)
     const recorded=await load(stem)
     if(offline){
      assert.ok(recorded,stem);assert.deepEqual(before,recorded.before);assert.deepEqual(current,recorded.after)
      assert.equal(delivery,recorded.delivery);assert.equal(attempts.length,recorded.attempts)
     }
     if(!recorded){
      await page.locator('#root').screenshot({path:join(dir,stem+'.png')})
      await save(stem,{task,protocol,seed,mode,turn:turn+1,before,after:current,delivery,endToEndMs,attempts:attempts.length})
     }
     if(turn===0){
      const selections={baggage:[/route|international|domestic/i,'International'],tickets:[/adult|child|category|type/i,'Child'],water:[/drain rate|litres per minute|liters per minute/i,4],fabric:[/hem/i,1]}
      const selected=await select(...selections[task])
      const outcome={selected,state:current.frame.state}
      if(offline)assert.deepEqual(outcome,await load(stem+'.selection'));else await save(stem+'.selection',outcome)
     }
    }
   }finally{await page.close()}
  }
 }
}
try{await Promise.all(['oui','json'].flatMap(p=>seeds.map(s=>lane(p,s))))}
finally{signal.abort();await browser.close();await server.close()}
