import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {chromium} from '@playwright/test'
import {preview} from 'vite'
import {origin} from './origins.mjs'
const [outDir,report]=process.argv.slice(2)
if(!outDir||!report)throw Error('Supply a build directory and report path')
const server=await preview({build:{outDir},preview:{host:'127.0.0.1',port:0}})
const browser=await chromium.launch(), cases=[]
try{
 for(const protocol of ['oui','json']){
  const page=await browser.newPage()
  await page.goto(new URL('revision.html',server.resolvedUrls.local[0]).href)
  const raw=await origin('tickets',protocol,1701)
  const invoke=(method,...args)=>page.evaluate(async({method,args})=>window.revisionLab[method](...args),{method,args})
  await invoke('open','tickets','probe',protocol,raw)
  await invoke('change','count',4)
  const before=await invoke('snapshot'),source=JSON.parse(raw).blocks[0].source
  const input= protocol==='oui'?source.split('\n').find(s=>s.startsWith('input =')).split(' = ')[1]:JSON.stringify(JSON.parse(source).elements.input)
  const replace=(key,value)=>({op:'replace',key,value})
  const packet=(operations,extra={})=>JSON.stringify({artifact:'probe',base:0,operations,...extra})
  const same=replace('input',input)
  const invalid=[
   ['unknown operation',packet([{...same,op:'evaluate'}])],['missing target',packet([replace('missing','1')])],
   ['wrong artifact',packet([same],{artifact:'elsewhere'})],['stale base',packet([same],{base:1})],
   ['overlapping edits',packet([same,same])],['oversized patch',packet([replace('input','x'.repeat(8300))])],
   ['duplicate identifier',packet([{...same,op:'add'}])],
   ['invalid reference',packet([replace('result',protocol==='oui'?'Metric("x", missing)':JSON.stringify({type:'Metric',props:{label:'x',value:{$state:'/missing'}}}))])],
   ['cycle',packet([replace(protocol==='oui'?'result':'layout',protocol==='oui'?'result':JSON.stringify({type:'Stack',props:{},children:['layout']}))])],
   ['unauthorized component',packet([replace('result',protocol==='oui'?'Unknown("x")':JSON.stringify({type:'Unknown',props:{}}))])],
   ['unauthorized function',packet([replace('result',protocol==='oui'?'Metric("x", Unknown(1))':JSON.stringify({type:'Metric',props:{label:'x',value:{$computed:'Unknown',args:{}}}}))])],
   ['invalid reconstructed document',packet([{key:'input',op:'remove',value:''}])],
   ['changed domain excludes selected value',packet([replace('input',input.replace(protocol==='oui'?', 5,':'"max":5',protocol==='oui'?', 3,':'"max":3'))])],
   ['resource budget',packet([replace('result',protocol==='oui'?'Metric("x",1000000000 * 2)':JSON.stringify({type:'Metric',props:{label:'x',value:1000000001}}))])],
  ]
  for(const [name,patch] of invalid){
   let diagnostic
   try{await invoke('revise','probe',0,patch,'patch')}catch(e){diagnostic=e.message.split('\n')[0]}
   assert.ok(diagnostic,name);assert.deepEqual(await invoke('snapshot'),before,name+' rollback')
   cases.push({protocol,name,diagnostic,rollback:true})
  }
  const pair=await page.evaluate(async patch=>Promise.allSettled([0,1].map(()=>window.revisionLab.revise('probe',0,patch,'patch'))).then(rows=>rows.map(r=>r.status)),packet([same]))
  assert.deepEqual(pair,['rejected','fulfilled'])
  const final=await invoke('snapshot')
  assert.equal(final.revision,1);assert.equal(final.frame.state.count,4)
  cases.push({protocol,name:'concurrent publication',pair,state:final.frame.state})
  await page.close()
 }
}finally{await writeFile(report,JSON.stringify(cases,null,2)+'\n');await browser.close();await server.close()}
