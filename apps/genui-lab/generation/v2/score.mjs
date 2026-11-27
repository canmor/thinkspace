import {interactive} from './oracles.mjs'
const pf=v=>v?'pass':'fail'
export const delivered=a=>a.status==='text'||a.status==='accepted'
export function visible(a){
 const parts=(a.blocks??[]).filter(b=>b.type==='text').map(b=>b.text)
 if(!parts.length&&a.text)parts.push(a.text)
 for(const i of a.frame?.items??[]){
  if(i.type==='Text')parts.push(i.props.text)
  else if(i.type==='Graphic')parts.push(i.props.label, ...i.props.items.flatMap(s=>s.kind==='group'?s.items:[s]).filter(s=>s.kind==='text').map(s=>s.text))
 }
 return parts.join('\n')
}
// Domain checks have no natural-language or arbitrary additional-metric oracle.
export function claimReview(task,a,test,prose){
 const reasons=[]
 if(prose.trim())reasons.push('Independent review required for explanatory claims.')
 const items=a.frame.items, dimensions={
  T11:[/row/i,/col/i],T12:[/size|locker/i,/block|duration/i],
  B04:[/class|fare|cabin/i,/member|gold|status/i,/weight|mass|kg/i],
  B03:[/native/i,/light|runtime/i,/delivery|efficien/i]
 }[task]
 const controls=items.filter(i=>i.type==='Control')
 for(const [i,binding] of (test.roleBindings??[]).entries()){
  const c=controls.find(c=>c.binding===binding)
  if(!c||!dimensions[i].test(c.props.label))reasons.push('Unverified visible input role: '+String(binding))
 }
 const expected={T11:[/seed|plant|count|cell/i,/water|litre|liter/i],T12:[/credit|cost|total/i],B04:[/allow|limit|free/i,/fee|charge|cost/i],B03:[]}[task]
 const metrics=items.filter(i=>i.type==='Metric')
 if(metrics.length!==expected.length||expected.some(rx=>metrics.filter(i=>rx.test(i.props.label)).length!==1))reasons.push('Additional or unverified displayed metric requires review.')
 return reasons
}
export function axes(task,a,test){
 const prose=visible(a),data=prose+' '+JSON.stringify(a.frame?.items??[]),notes=[]
 const tr=delivered(a)||a.transport===true
 const status={transport:a.status==='provider-error'?'NE':pf(tr),specification:!tr?'NE':a.status==='text'?'NA':pf(a.status==='accepted'),intent:'NE',domain:'NE',behavior:interactive.has(task)?'NE':'NA',presentation:'NE',modality:'NE'}
 if(!delivered(a))return {status,notes:[a.diagnostic??a.status],corePass:false,exampleCopy:null}
 const copied=/\b(chimes?|glossary lists terms)\b/i.test(data)
 const has=(...checks)=>checks.every(rx=>rx.test(prose))
 if(interactive.has(task)){
  const topical={B03:/tauri|native hybrid|electron/i,B04:/bag|fare|allowance|economy/i,T11:/tray|seedling|rows|columns/i,T12:/locker|credits/i}[task].test(data)
  status.intent=pf(Boolean(a.frame?.items.some(i=>i.type==='Control'))&&topical)
  status.modality=pf(Boolean(a.frame?.items.some(i=>i.type==='Control')))
  if(test){status.domain=test.domain;status.behavior=test.behavior;notes.push(...test.issues);if(test.reason)notes.push(test.reason)
   const unresolved=claimReview(task,a,test,prose)
   if(unresolved.length){if(status.domain==='pass')status.domain='NE';notes.push(...unresolved)}
   if(test.behavior==='fail')notes.push('Observed mapping differs from independent oracle or evaluation failed; see counterexample.')
  }else notes.push('No admitted interactive controls to exercise.')
 }else{
  status.modality=pf(!['T13','B06'].includes(task)||a.status==='text')
  if(task==='B01'){
   status.intent=pf(/dot product|scalar product/i.test(prose)&&/project/i.test(prose))
   const valid=has(/cos|signed projection/i,/orthogonal|perpendicular/i,/zero|\b0\b/i,/negative|obtuse|opposite/i,/length|magnitude|norm/i)
   notes.push('Checklist candidate: '+valid);notes.push('Geometric checklist: length/cosine or signed projection, perpendicular zero and negative direction. Ambiguous wording requires review.')
  }else if(task==='B02'){
   status.intent=pf(has(/conversation/i,/context/i,/orchestrat/i,/interface|contract|mediat|decoupl|independen/i))
   notes.push('Checklist candidate: '+has(/message/i,/lineage|history/i,/reference/i,/budget/i,/coordinat|workflow/i))
   notes.push('Checked core ownership concepts. Ambiguous authority assignments require content review.')
  }else if(task==='B06'){
   status.intent=pf(/bring your own key/i.test(prose))
   const crypto=/encrypt|cryptographic/i.test(prose),credential=/API key|API credential|inference credential/i.test(prose),billed=/bill|pay|charg|cost|usage.*account/i.test(prose)
   status.domain=pf(credential&&billed&&(!crypto||/not.{0,20}encrypt/i.test(prose)))
   notes.push('Inference credential and provider usage responsibility required; encryption-key custody is a different meaning.')
  }else if(task==='T13'){
   status.intent=pf(/gutter|space|margin/i.test(prose)&&prose.trim().split(/[.!?]+(?:\s|$)/).filter(x=>x.trim()).length===1)
   status.domain=pf(has(/space|margin|area/i,/bind|bound|spine|fold|inner|facing pages/i))
   notes.push('Requires the inner binding margin in a facing-page spread and one sentence.')
  }
 }
 if(copied){status.intent='fail';notes.push('Unrelated demonstration content detected.')}
 const corePass=status.intent==='pass'&&status.domain==='pass'&&(!interactive.has(task)||status.behavior==='pass')
 return {status,notes,corePass,exampleCopy:copied}
}
