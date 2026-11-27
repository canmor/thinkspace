import assert from 'node:assert/strict'
import {readdir,readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {preview} from 'vite'
import {chromium} from '@playwright/test'
import {disposition} from '../v2/provider.mjs'
import {replay} from '../browser.mjs'
const [outDir,dir,report]=process.argv.slice(2)
const server=await preview({build:{outDir},preview:{host:'127.0.0.1',port:0}})
const browser=await chromium.launch(),rows=[]
try{
 const page=await browser.newPage()
 for(const file of (await readdir(dir)).filter(n=>/\.attempt\d+\.json$/.test(n)).sort()){
  const a=JSON.parse(await readFile(join(dir,file)))
  const d=disposition(JSON.parse(a.rawResponse))
  let result
  if(d.raw){
   assert.equal(d.raw,a.raw)
   const url=new URL('replay.html',server.resolvedUrls.local[0])
   if(file.includes('-chart.'))url.searchParams.set('profile','chart-experiment')
   result=await replay(page,file.includes('-oui-')?'oui':'json',d.raw,url.href,'structured')
  }else result={status:d.status,diagnostic:d.diagnostic}
  assert.deepEqual(result,a.result,file)
  rows.push({file,status:result.status})
 }
}finally{await writeFile(report,JSON.stringify(rows,null,2)+'\n');await browser.close();await server.close()}
