import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import assert from 'node:assert/strict'
import {preview} from 'vite'
import {chromium} from '@playwright/test'
import {replay} from '../browser.mjs'
import {probe,interactive} from './oracles.mjs'
import {axes,delivered} from './score.mjs'
import {disposition} from './provider.mjs'
const dir=resolve(process.argv[2]||'evidence/goal-2b1')
const manifest=JSON.parse(await readFile(join(dir,'manifest.json'))),jobs=[...manifest.jobs]
const server=await preview({preview:{host:'127.0.0.1',port:0}}),url=new URL('replay.html',server.resolvedUrls.local[0]).href
const browser=await chromium.launch(),results=[]
await mkdir(join(dir,'review'),{recursive:true})
try{
 async function lane(){
  const page=await browser.newPage()
  for(let j;(j=jobs.shift());){
   const episode=JSON.parse(await readFile(join(dir,'episodes',j.id+'.json')))
   const arm=manifest.arms.find(a=>a.id===j.arm),checks=[]
   for(const a of episode.attempts){
    // A transport error has no executable response to replay.
    const d=a.status==='provider-error'?{status:a.status,diagnostic:a.diagnostic}:disposition(JSON.parse(a.rawResponse))
    const observed=d.raw!==undefined?await replay(page,j.protocol,d.raw,url,arm.wire):d
    assert.equal(observed.status,a.status,j.id);if(observed.frame)assert.deepEqual(observed.frame,a.frame);if(observed.text)assert.equal(observed.text,a.text)
    if(a.diagnostic)assert.equal(observed.diagnostic,a.diagnostic)
    const usage=a.usage,cached=usage?.prompt_tokens_details?.cached_tokens??0,scale=j.arm==='F'?5:1
    const cost=usage&&j.arm!=='G'?scale*((usage.prompt_tokens-cached)*0.4+cached*0.1+usage.completion_tokens*1.6)/1e6:null
    checks.push({status:a.status,transport:delivered(a)||a.transport===true,category:delivered(a)?null:a.status==='rejected'?(a.transport?'specification':'envelope'):a.status,diagnostic:a.diagnostic,latencyMs:a.latencyMs,input:usage?.prompt_tokens,output:usage?.completion_tokens,cost})
   }
   const a=episode.attempts.at(-1),behavior=interactive.has(j.task)&&a.frame?await probe(page,j.task,a.frame):null
   results.push({...j,checks,behavior,...axes(j.task,a,behavior)})
  }
 }
 await Promise.all(Array.from({length:4},lane))
 results.sort((a,b)=>a.id.localeCompare(b.id));await writeFile(join(dir,'evaluation-reviewed.json'),JSON.stringify({version:'2.1',assessor:'deterministic checks and assistant review; human review pending',results},null,2)+'\n')
 console.log('Offline replay verified for',results.length,'episodes;',results.reduce((n,r)=>n+r.checks.length,0),'attempts')
}finally{await browser.close();await server.close()}
