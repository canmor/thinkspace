import assert from 'node:assert/strict'
import {readdir,readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {preview} from 'vite'
import {chromium} from '@playwright/test'
import {replay} from '../browser.mjs'
const [outDir,dir,report]=process.argv.slice(2)
const server=await preview({build:{outDir},preview:{host:'127.0.0.1',port:0}})
const browser=await chromium.launch(),rows=[]
try{
 const page=await browser.newPage({viewport:{width:1024,height:800}})
 for(const file of (await readdir(dir)).filter(f=>/-(chart|svg)\.json$/.test(f)).sort()){
  const run=JSON.parse(await readFile(join(dir,file)))
  if(run.delivery!=='accepted')continue
  const attempt=JSON.parse(await readFile(join(dir,file.replace('.json','.attempt'+(run.attempts-1)+'.json'))))
  const url=new URL('replay.html',server.resolvedUrls.local[0])
  if(run.mode==='chart')url.searchParams.set('profile','chart-experiment')
  const durations=[]
  for(let i=0;i<3;i++){
   const r=await replay(page,run.protocol,attempt.raw,url.href,'structured')
   assert.deepEqual(r.frame,attempt.result.frame)
   const ms=await page.evaluate(()=>performance.getEntriesByName('artifact-surface-render').at(-1)?.duration)
   assert.ok(Number.isFinite(ms));durations.push(ms)
  }
  rows.push({file,renderToLayoutEffectMs:durations})
 }
}finally{await writeFile(report,JSON.stringify(rows,null,2)+'\n');await browser.close();await server.close()}
