import assert from 'node:assert/strict'
import {readFile,readdir,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {preview} from 'vite'
import {chromium} from '@playwright/test'
import {replay} from '../browser.mjs'
import {expectedSeries} from './oracles.mjs'
const [outDir,dir,report]=process.argv.slice(2)
if(!report)throw Error('Supply build directory, record directory and report path')
const range=(lo,hi)=>Array.from({length:hi-lo+1},(_,i)=>lo+i)
const baggage={
 business:[/cabin|fare|economy|business/i,[/economy/i,/business/i]],
 gold:[/gold|status|member/i,[/not? gold|standard|regular|none|^no$/i,/^gold$|^yes$/i]],
 international:[/route|trip type|domestic|international/i,[/domestic|non-international/i,/^international$/i]],
 weight:[/weight|mass/i,range(10,40)]}
const contracts={fee:baggage,policies:baggage,tide:{adjustment:[/datum|adjust|offset/i,range(-1,1)]},kiln:{},archive:{pace:[/pace|daily|per day/i,range(3,6)]}}
const units={fee:[/kg|kilogram/i,/\$|USD|dollar/i],policies:[/kg|kilogram/i,/\$|USD|dollar/i],
 tide:[/hour|\(h\)/i,/metre|meter|\(m\)/i],kiln:[/min/i,/celsius|°C/i],archive:[/day/i,/page/i]}
const server=await preview({build:{outDir},preview:{host:'127.0.0.1',port:0}})
const browser=await chromium.launch(),results=[]
try{
 for(const f of (await readdir(dir)).filter(n=>/-(svg|chart)\.json$/.test(n)).sort()){
  const run=JSON.parse(await readFile(join(dir,f)))
  const row={f,delivery:run.delivery,checked:0}
  results.push(row)
  if(run.delivery!=='accepted')continue
  const page=await browser.newPage()
  try{
   const attempt=JSON.parse(await readFile(join(dir,f.replace('.json','.attempt'+(run.attempts-1)+'.json'))))
   const url=new URL('replay.html',server.resolvedUrls.local[0])
   if(run.mode==='chart')url.searchParams.set('profile','chart-experiment')
   let {frame}=await replay(page,run.protocol,attempt.raw,url.href,'structured')
   assert.deepEqual(frame,attempt.result.frame,'Replay differs from recorded frame')
   const controls=frame.items.filter(x=>x.type==='Control'),axes=Object.entries(contracts[run.task])
   assert.equal(controls.length,axes.length,'Control count')
   const bindings=axes.map(([role,[pattern,domain]])=>{
    const matches=controls.filter(c=>pattern.test(c.props.label+' '+c.props.choices.join(' ')))
    assert.equal(matches.length,1,'Control role '+role)
    const c=matches[0]
    let positions=domain
    if(domain[0] instanceof RegExp){
     assert.equal(c.props.choices.length,2,'Unverified categorical encoding')
     positions=domain.map(re=>c.props.choices.findIndex(o=>re.test(o)))
     assert.deepEqual([...positions].sort(),[0,1])
    }else if(c.props.choices.length){
     const numeric=c.props.choices.map(x=>/^[+-]?\d+$/.test(x)?Number(x):NaN)
     assert.deepEqual([...numeric].sort((a,b)=>a-b),domain)
     positions=domain.map(v=>numeric.indexOf(v))
    }
    assert.deepEqual([c.props.min,c.props.max],[Math.min(...positions),Math.max(...positions)])
    return {role,c,positions,semantic:domain[0] instanceof RegExp?[0,1]:domain}
   })
   const states=bindings.reduce((rows,b)=>rows.flatMap(s=>b.positions.map((pos,i)=>({...s,[b.role]:{pos,val:b.semantic[i]}}))),[{}])
   for(const s of states){
    for(const {c,role} of bindings){
     const value=s[role].pos
     if(frame.state[c.binding]===value)continue
     const element=page.locator('.stack label').nth(controls.indexOf(c)).locator('input,select')
     if(c.props.choices.length)await element.selectOption(String(value));else await element.fill(String(value))
     const h=await page.waitForFunction(({k,v})=>{const r=JSON.parse(document.querySelector('#result').textContent);return r.frame?.state[k]===v&&r.frame},{k:c.binding,v:value},{polling:5,timeout:2000})
     frame=await h.jsonValue();await h.dispose()
    }
    const state=Object.fromEntries(Object.entries(s).map(([k,v])=>[k,v.val]))
    const expected=expectedSeries(run.task,state)
    const chart=frame.items.find(c=>c.type==='Chart')
    if(!chart){row.encoding=frame.items.some(c=>c.type==='Graphic')?'SVG requires calibration':'missing plot';break}
    const p=chart.props
    const actual=p.series.map(serie=>p.x.map((x,i)=>[x,serie.values[i]]))
    assert.deepEqual(actual,expected,'Series at '+JSON.stringify(state))
    assert.ok(units[run.task][0].test(p.xLabel)&&units[run.task][1].test(p.yLabel),'Axis units')
    if('weight' in state)assert.deepEqual(p.selected,[state.weight])
    row.checked++
   }
   row.status=row.checked===states.length?'pass':'unverified'
  }catch(e){row.status='failed or unverified';row.diagnostic=e.message.slice(0,1200)}
  finally{await page.close()}
 }
}finally{await writeFile(report,JSON.stringify(results,null,2)+'\n');await browser.close();await server.close()}
