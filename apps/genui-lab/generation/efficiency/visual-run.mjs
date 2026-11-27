import {mkdir,readFile,writeFile,access} from 'node:fs/promises'
import {join} from 'node:path'
import {parseEnv} from 'node:util'
import {preview} from 'vite'
import {chromium} from '@playwright/test'
import {replay} from '../browser.mjs'
import {request} from '../v2/provider.mjs'
import {arms,prompt} from '../v2/plan.mjs'
import {visualizations} from './tasks.mjs'

const dir=process.argv[2]
if(!dir)throw Error('Supply an output directory')
const arm={...arms.at(-1),model:'gpt-6.2-sol'}
const seeds=[1701,1702]
const chartGuide='Use the experimental Chart line component for this plot. Its exact positional arguments (json-render prop names in order) are title, xLabel, yLabel, x, series, selected, decimals. Axis labels include units. x is an increasing numeric array (2–40 values). series is 1–3 objects with distinct label strings and numeric values arrays aligned to x. selected is [] or [one x value]. decimals is a fixed integer 0–3. Include complete requested data. No new functions.'
const svgGuide='Use the existing Graphic component for this plot. Include complete requested data.'
await mkdir(dir,{recursive:true})
const save=(name,data)=>writeFile(join(dir,name),JSON.stringify(data,null,2)+'\n')
const key=parseEnv(await readFile('../../.env','utf8')).OPENAI_TOKEN
if(!key)throw Error('Missing configured provider credential')
const preflight=JSON.parse(await readFile('evidence/goal-2b3/chart-preflight.json')).stats
if(preflight.expected<26||preflight.unexpected||preflight.flaky||preflight.skipped)throw Error('Incomplete preflight')
const manifest={tasks:visualizations,arm,seeds,chartGuide,svgGuide,oracleCommit:'a3cb62a',repairs:1,control:'default',experiment:'chart-experiment'}
const manifestPath=join(dir,'manifest.json')
try{await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'})}
catch(e){if(e.code!=='EEXIST'||JSON.stringify(JSON.parse(await readFile(manifestPath)))!==JSON.stringify(manifest))throw e}
const server=await preview({preview:{host:'127.0.0.1',port:0}})
const browser=await chromium.launch()
const signal=new AbortController()
async function lane(protocol,seed){
 for(const [i,[task,user]] of Object.entries(visualizations).entries()){
  const order=(seed+i)%2?['svg','chart']:['chart','svg']
  for(const mode of order){
   const name=[task,protocol,seed,mode].join('-')
   try{await access(join(dir,name+'.json'));continue}catch(e){if(e.code!=='ENOENT')throw e}
   const messages=prompt(arm,protocol,'B04')
   messages[1].content=user
   messages[0].content+='\n'+(mode==='chart'?chartGuide:svgGuide)
   const page=await browser.newPage({viewport:{width:1024,height:800}})
   const start=performance.now(),attempts=[]
   try{
    for(let n=0;n<2;n++){
     const file=name+'.attempt'+n+'.json'
     let recorded
     try{recorded=JSON.parse(await readFile(join(dir,file)))}catch(e){if(e.code!=='ENOENT')throw e}
     const a=recorded??await request(arm,messages,seed+n,key,signal.signal).catch(e=>({status:'provider-error',diagnostic:e.name+': '+e.message}))
     const t=performance.now()
     const url=new URL('replay.html',server.resolvedUrls.local[0])
     if(mode==='chart')url.searchParams.set('profile','chart-experiment')
     const result=a.raw?await replay(page,protocol,a.raw,url.href,'structured'):{status:a.status,diagnostic:a.diagnostic}
     const replayMs=performance.now()-t
     attempts.push({...a,messages:structuredClone(messages),result,replayMs})
     if(!recorded)await save(file,attempts.at(-1))
     if(n||!['rejected','truncated'].includes(result.status))break
     messages.push({role:'assistant',content:a.raw??''},{role:'user',content:'Complete response rejected: '+result.diagnostic+'. Return one complete corrected response.'})
    }
    const endToEndMs=performance.now()-start
    if(attempts.at(-1).result.frame)await page.locator('.stack').first().screenshot({path:join(dir,name+'.png')})
    await save(name+'.json',{protocol,task,seed,mode,endToEndMs,attempts:attempts.length,delivery:attempts.at(-1).result.status})
   }finally{await page.close()}
  }
 }
}
try{await Promise.all(['oui','json'].flatMap(p=>seeds.map(s=>lane(p,s))))}
finally{signal.abort();await browser.close();await server.close()}
