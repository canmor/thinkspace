import {readFile,writeFile} from 'node:fs/promises'
import {preview} from 'vite'
import {chromium} from '@playwright/test'
import {replay} from '../browser.mjs'
import {interactive,probe} from './oracles.mjs'
const dir='evidence/goal-2b1',path=dir+'/baseline-v2.json'
const baseline=JSON.parse(await readFile(path)),server=await preview({preview:{host:'127.0.0.1',port:0}})
const browser=await chromium.launch()
try{
 const page=await browser.newPage(),url=new URL('replay.html',server.resolvedUrls.local[0]).href
 for(const r of baseline.results){
  const [task,,protocol]=r.id.split('-')
  if(!interactive.has(task)||r.status.specification!=='pass')continue
  const base='evidence/goal-2a'+(r.cohort==='openai'?'/openai':'')
  const e=JSON.parse(await readFile(base+'/episodes/'+r.id+'.json')),a=e.attempts.at(-1)
  const live=await replay(page,protocol,a.raw,url,'legacy')
  const evidence=await probe(page,task,live.frame)
  r.v2Probe=evidence;r.status.behavior=evidence.behavior;r.status.domain=evidence.domain
 }
 await writeFile(path,JSON.stringify(baseline,null,2)+'\n')
}finally{await browser.close();await server.close()}
