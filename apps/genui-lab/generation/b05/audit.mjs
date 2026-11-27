import {readFile,writeFile,readdir} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {preview} from 'vite'
import {chromium} from '@playwright/test'
import {replay} from '../browser.mjs'
const dir=process.argv[2]??'evidence/goal-2b2'
const output=process.argv[3]
if(!output || resolve(output)===resolve(dir))throw Error("Supply a separate, existing audit output directory")
const server=await preview({preview:{host:'127.0.0.1',port:0}})
const url=new URL('replay.html',server.resolvedUrls.local[0]).href,browser=await chromium.launch()
// Calibrations read from the rendered axis ticks of these three saved charts.
function curveMatches(file,items,kg,excess){
 const graphic=items.find(x=>x.type==='Graphic')
 if(!graphic)return null
 const marks=graphic.props.items
 if(file==='oui-1701-turn2.json'||file==='oui-1702-turn2.json'){
  const first=file.includes('1701'),x=(first?42:40)+(kg-10)*(first?12:13)
  const y=(first?105:106)-excess*5
  return marks.some(m=>m.kind==='circle'&&m.r===2&&m.cx===x&&m.cy===y)
 }
 if(file==='oui-1702-turn3.json'){
  const series=marks.filter(m=>m.kind==='path').slice(1)
  if(series.length!==2)return null
  return series.every((s,i)=>{
   const points=/^M 40 106 H ([0-9.]+) L 430 ([0-9.]+)$/.exec(s.d)
   if(!points)return false
   const knee=Number(points[1]),x=40+(kg-10)*13
   const y=x<=knee?106:106+(x-knee)*(Number(points[2])-106)/(430-knee)
   return Math.abs((106-y)*5-excess*(i?20:15))<0.001
  })
 }
 return null
}
const results=[]
try{
 for(const task of ['B01','B02','B04']){
  const ep=JSON.parse(await readFile('evidence/goal-2b1-sol-default/episodes/G-'+task+'-oui-1701.json'))
  const page=await browser.newPage({viewport:{width:1024,height:800}})
  await replay(page,'oui',ep.attempts.at(-1).raw,url,'structured')
  const clip=await page.locator('main > p, main > .stack').evaluateAll(nodes=>{
   const boxes=nodes.map(el=>el.getBoundingClientRect())
   return {x:Math.floor(boxes[0].x),y:Math.floor(boxes[0].y),width:Math.ceil(Math.max(...boxes.map(b=>b.width))),height:Math.ceil(boxes.at(-1).bottom-boxes[0].y)}
  })
  await page.screenshot({path:join(output,'lab-'+task+'.png'),fullPage:true,clip})
  await page.close()
 }
 for(const file of (await readdir(dir)).filter(x=>/turn[123]\.json$/.test(x)).sort()){
  const d=JSON.parse(await readFile(join(dir,file))),a=d.attempts.at(-1)
  const row={file,delivery:d.delivery,calls:d.attempts.length,checked:0,continuity:'NE',numeric:'NE',curve:'NA',curveValues:'NA'}
  results.push(row)
  if(d.delivery!=='accepted'){if(d.turn>=2){row.curve='NE';row.curveValues='NE'}continue}
  const page=await browser.newPage()
  let {frame}=await replay(page,d.protocol,a.raw,url,'structured')
  const inputs=f=>f.items.filter(x=>x.type==='Control')
  const roles=[/cabin|fare|business/i,/gold|status|member/i,/route|international/i,/weight/i]
  const select=(f,re)=>inputs(f).filter(c=>re.test(c.props.label+' '+c.binding))
  const categories=[['Economy','Business'],['No Gold','Gold'],['Domestic','International']]
  function domain(c,i){
   if(c.props.min!==(i===3?10:0)||c.props.max!==(i===3?40:1))return null
   if(i===3)return c.props.choices.length===0?[]:null
   const options=c.props.choices
   if(options.length)return options.length===2&&categories[i].every(v=>options.includes(v))?options:null
   return categories[i].every((v,n)=>c.props.label.includes(n+' = '+v))?categories[i]:null
  }
  const semantic=(c,f,i)=>domain(c,i)?.[f.state[c.binding]]??(i===3&&domain(c,i)?f.state[c.binding]:null)
  const state=f=>roles.map((re,i)=>{const cs=select(f,re);return cs.length===1?semantic(cs[0],f,i):null})
  row.before=state(d.before);row.after=state(frame)
  row.continuity=row.before.every((v,i)=>v===null?i===2&&d.turn===1&&row.after[i]==='Domestic':v===row.after[i])?'pass':'fail'
  const priorCounts=roles.map(re=>select(d.before,re).length)
  row.priorRoles=priorCounts.map((n,i)=>n===1?'identified':n>1?'ambiguous':i===2&&d.turn===1?'new':'missing')
  if(row.priorRoles.some(r=>r==='ambiguous'||r==='missing'))row.continuity='unverified'
  const cs=roles.map(re=>select(frame,re)[0])
  if(cs.some(c=>!c)){await page.close();continue}
  row.domains=cs.every((c,i)=>select(frame,roles[i]).length===1 && domain(c,i)!==null)?'pass':'fail'
  const metrics=frame.items.filter(x=>x.type==='Metric')
  const find=re=>metrics.filter(x=>re.test(x.props.label))
  const fee=d.turn===3?find(/old|original|15/i):find(/fee|charge/i)
  const targets=[find(/allow/i),fee,...(d.turn===3?[find(/new|20/i),find(/difference|increase/i)]:[])]
  if(targets.some(xs=>xs.length!==1)){row.reason='Ambiguous output role';await page.close();continue}
  const labels=targets.map(xs=>xs[0].props.label)
  row.curve=d.turn===1?'NA':frame.items.some(x=>x.type==='Graphic')?'present':'absent'
  row.curveValues=row.curve==='present'?'NE':'NA'
  for(let cabin=0;cabin<2;cabin++)for(let gold=0;gold<2;gold++)for(let route=0;route<2;route++)for(let weight=10;weight<=40;weight++){
   const values=[cabin,gold,route,weight]
   for(const [i,c] of cs.entries()){
    const pos=values[i],options=c.props.choices
    const pat=[[/economy/i,/business/i],[/no|standard|none/i,/^gold$|^yes$/i],[/domestic/i,/international/i]][i]
    const n=options.length&&pat?options.findIndex(x=>pat[pos].test(x)):pos
    if(n<0)throw Error('Unidentified option '+file)
    if(frame.state[c.binding]===n)continue
    const el=page.locator('.stack label').nth(inputs(frame).findIndex(x=>x.binding===c.binding)).locator('input,select')
    if(options.length)await el.selectOption(String(n));else await el.fill(String(n))
    const h=await page.waitForFunction(({k,n})=>{const r=JSON.parse(document.querySelector('#result').textContent);return r.frame?.state[k]===n&&r.frame},{k:c.binding,n},{polling:5,timeout:3000})
    frame=await h.jsonValue();await h.dispose()
   }
   const allowance=(cabin?32:23)+5*gold+2*route,excess=Math.max(0,weight-allowance)
   const expected=[allowance,15*excess,...(d.turn===3?[20*excess,5*excess]:[])]
   const actual=labels.map(l=>frame.items.find(x=>x.type==='Metric'&&x.props.label===l)?.props.value)
   if(!row.counterexample&&actual.some((v,i)=>v!==expected[i]))row.counterexample={values,expected,actual}
   if(row.curve==='present'){
    const marks=frame.items.find(x=>x.type==='Graphic').props.items
    const expectedDots=file.includes('turn2')?31:0
    const match=marks.filter(m=>m.kind==='circle'&&m.r===2).length===expectedDots && Array.from({length:31},(_,i)=>i+10).every(kg=>curveMatches(file,frame.items,kg,Math.max(0,kg-allowance))===true)
    if(match===true)row.verifiedCurveSamples=(row.verifiedCurveSamples??0)+1
    if(match===false&&!row.curveCounterexample)row.curveCounterexample={values,excess}
   }
   row.checked++
  }
  if(row.curve==='present')row.curveValues=row.curveCounterexample?'fail':row.verifiedCurveSamples===248?'pass':'NE'
  row.numeric=row.counterexample?'fail':'pass'
  await page.close()
 }
 await writeFile(join(output,'behavior.json'),JSON.stringify(results,null,2)+'\n')
}finally{await browser.close();await server.close()}
