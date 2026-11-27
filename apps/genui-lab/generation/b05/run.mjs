import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {parseEnv} from 'node:util'
import {execFileSync} from 'node:child_process'
import {chromium} from '@playwright/test'
import {preview} from 'vite'
import {request} from '../v2/provider.mjs'
import {arms,prompt} from '../v2/plan.mjs'
import {replay} from '../browser.mjs'
import {changes} from './plan.mjs'
const resume=process.argv.includes('--resume')
const offline=process.argv.includes('--offline'),dir=resolve(process.argv[2]??'runs/b05-'+Date.now())
await mkdir(dir,{recursive:true})
const save=(f,v)=>writeFile(join(dir,f),JSON.stringify(v,null,2)+'\n')
const load=async f=>JSON.parse(await readFile(f))
const arm={...arms.at(-1),model:'gpt-6.2-sol'}
if(!offline){
 if(!resume)await writeFile(join(dir,'manifest.json'),JSON.stringify({baseline:'38060a5',arm,seeds:[1701,1702],changes,temperature:1,top_p:'provider default',repairs:1}),{flag:'wx'})
 execFileSync('npm',['run','build'],{stdio:'inherit'})
 execFileSync('npm',['test'],{stdio:'inherit',env:{...process.env,GENUI_PROVIDER_PREFLIGHT:'openai',GENUI_REPORT:join(dir,'preflight.json')}})
 const stats=(await load(join(dir,'preflight.json'))).stats
 if(stats.expected<23||stats.skipped||stats.flaky||stats.unexpected)throw Error('Incomplete preflight')
}
const key=offline?null:parseEnv(await readFile('../../.env','utf8')).OPENAI_TOKEN
const cancel=new AbortController()
process.once('SIGINT',()=>cancel.abort());process.once('SIGTERM',()=>cancel.abort())
const server=await preview({preview:{host:'127.0.0.1',port:0}})
const url=new URL('replay.html',server.resolvedUrls.local[0]).href
const browser=await chromium.launch()
async function lane(protocol,seed){
 const context=await browser.newContext({viewport:{width:1024,height:800}})
 let page=await context.newPage()
 const stem=protocol+'-'+seed
 const baseline=(await load('evidence/goal-2b1-sol-default/episodes/G-B04-'+stem+'.json')).attempts.at(-1)
 let current=await replay(page,protocol,baseline.raw,url,'structured')
 const messages=[...prompt(arm,protocol,'B04'),{role:'assistant',content:baseline.raw}]
 async function select(rx,index){
  const controls=current.frame.items.filter(i=>i.type==='Control')
  const i=controls.findIndex(c=>rx.test(c.props.label+' '+c.binding))
  if(i<0)return
  const c=controls[i],el=page.locator('.stack label').nth(i).locator('input,select')
  const n=typeof index==='number'?index:c.props.choices.findIndex(x=>index.test(x))
  if(n<0)return
  if(c.props.choices.length)await el.selectOption(String(n));else await el.fill(String(n))
  await page.waitForFunction(({k,n})=>JSON.parse(document.querySelector('#result').textContent).frame?.state[k]===n,{k:c.binding,n})
  current=JSON.parse(await page.locator('#result').textContent())
 }
 await select(/status|gold|member/i,1);await select(/weight/i,38)
 for(const [i,change] of changes.entries()){
  const file=stem+'-turn'+(i+1)+'.json',before=current.frame
  messages.push({role:'user',content:change+' Return the full revised response. Current visible controls: '+JSON.stringify(before.items.filter(x=>x.type==='Control').map(x=>x.props))})
  const saved=(offline||resume)?await load(join(dir,file)).catch(e=>{if(!offline&&e.code==='ENOENT')return null;throw e}):null
  const row=saved??{protocol,seed,turn:i+1,before,attempts:[]}
  if(offline)assert.deepEqual(before,row.before,file+' prior state')
  const candidate=await context.newPage()
  let result
  for(let n=0;n<=1;n++){
   const recorded=row.attempts[n]
   if(offline&&!recorded)throw Error('Missing recorded attempt')
   const a=recorded??await request(arm,messages,seed+i*10+n,key,cancel.signal)
   if(!recorded){a.messages=structuredClone(messages);row.attempts.push(a);await save(file,row)}
   result=a.raw?await replay(candidate,protocol,a.raw,url,'structured'):{status:a.status,diagnostic:a.diagnostic}
   if(offline&&JSON.stringify(a.result)!==JSON.stringify(result))throw Error('Replay mismatch '+file)
   a.result=result
   messages.push({role:'assistant',content:a.raw??''})
   if(n===0&&['rejected','truncated'].includes(result.status)){messages.push({role:'user',content:'Complete revision rejected: '+result.diagnostic+'. Return one complete corrected response.'});continue}
   break
  }
  if(result.frame){
   await page.close();page=candidate;current=result
   // Capture only rendered response content, including prose around the UI.
   const bounds=await page.locator('main > p, main > .stack').evaluateAll(nodes=>nodes.map(e=>e.getBoundingClientRect().toJSON()))
   if(!offline)await page.screenshot({path:join(dir,file+'.png'),fullPage:true,...(bounds.length?{clip:{x:Math.max(0,Math.floor(Math.min(...bounds.map(b=>b.x)))),y:Math.floor(bounds[0].y),width:Math.ceil(Math.max(...bounds.map(b=>b.width))),height:Math.ceil(bounds.at(-1).bottom-bounds[0].y)}}:{})})
  }else{
   await candidate.close()
   messages.push({role:'user',content:'The revision did not replace the live calculator. The preceding usable artifact remains active.'})
  }
  if(offline)assert.deepEqual(current.frame,row.after,file+' retained state')
  if(!offline){row.after=current.frame;row.delivery=result.status;await save(file,row)}
  if(i===0)await select(/route|international|domestic/i,/international/i)
 }
 await context.close()
}
try{await Promise.all(['oui','json'].flatMap(p=>[1701,1702].map(s=>lane(p,s))))}finally{cancel.abort();await browser.close();await server.close()}
