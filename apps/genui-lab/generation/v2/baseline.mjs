// Re-interpret frozen 2A judgments; never import this module into the generator.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {tasks} from '../harness.mjs'
const root='evidence/goal-2b1'
await mkdir(root+'/review',{recursive:true})
const load=async p=>JSON.parse(await readFile(p,'utf8'))
const results=[],cases=[],key=[],sources=[]
for(const cohort of ['openai','local']){
 const dir='evidence/goal-2a'+(cohort==='openai'?'/openai':'')
 const annotation=await readFile(dir+'/semantic-review.json')
 sources.push({cohort,source:dir+'/semantic-review.json',sha256:createHash('sha256').update(annotation).digest('hex'),sourceVersion:'2a.1',remap:'rubric-2.0',assessor:'assistant; independent human assessment pending'})
 const reviews=new Map(JSON.parse(annotation).map(r=>[r.id,r]))
 for(const audit of await load(dir+'/audit.json')){
  const episode=await load(dir+'/episodes/'+audit.id+'.json'),a=episode.attempts.at(-1),old=reviews.get(audit.id)
  const delivered=['accepted','text'].includes(a.status),interactive=['B03','B04'].includes(audit.task)
  const content=a.raw?.trim()||''
  let transport=false,ui=false
  if(a.finish==='stop'){
   if(content.startsWith('TEXT\n'))transport=Boolean(content.slice(5).trim())
   if(content.startsWith('UI\n')){
    ui=true;transport=true
    if(content.startsWith('UI\nSTATE ')){try{const v=JSON.parse(content.split('\n')[1].slice(6));transport=v!==null&&typeof v==='object'&&!Array.isArray(v)}catch{transport=false}}
   }
  }
  const copy=old?.reason.includes('duration converter'),repeat=old?.reason.includes('Restates')||old?.reason.includes('repair instruction')
  const status={transport:transport?'pass':'fail',specification:!transport?'NE':ui?(a.status==='accepted'?'pass':'fail'):'NA',intent:!delivered?'NE':copy||repeat||(interactive&&!a.frame)?'fail':'pass',domain:!delivered?'NE':old?.semanticCorrect?'pass':'fail',behavior:!interactive?'NA':!a.frame?'NE':audit.functional?.pass?'pass':'fail',presentation:!delivered?'NE':old?.presentationIssue?'fail':'NE',modality:!delivered?'NE':((interactive&&!a.frame)||(audit.task==='B06'&&a.frame)||copy)?'fail':'pass'}
  // These two responses describe the supplied policy accurately but cannot perform it.
  if(cohort==='openai'&&episode.task==='B04'&&a.status==='text')status.domain='pass'
  if(repeat)status.domain='NE'
  // Missing delivery already prevents success. Avoid treating unobserved content as wrong.
  results.push({cohort,id:audit.id,status,prior:old??null,behaviorEvidence:audit.functional})
  if(delivered){
   const blind=createHash('sha256').update('review-v2/'+cohort+audit.id).digest('hex').slice(0,12)
   cases.push({case:blind,request:tasks[episode.task],visibleText:a.text,orderedItems:a.frame?.items,initialState:a.frame?.state,replaySource:a.raw,protocol:episode.protocol})
   key.push({case:blind,cohort,id:audit.id})
  }
 }
}
cases.sort((a,b)=>a.case.localeCompare(b.case))
const save=(f,v)=>writeFile(root+'/'+f,JSON.stringify(v,null,2)+'\n')
await save('baseline-v2.json',{rubric:'2.0',sources,results})
await save('review/key.json',key)
await save('review/cases.json',cases)
await save('review/blank-scorecard.json',cases.map(c=>({case:c.case,reviewer:null,transport:null,specification:null,intent:null,domain:null,behavior:null,presentation:null,modality:null,rationale:null})))
await writeFile(root+'/review/README.md','Review the '+cases.length+' delivered Goal 2A cases in case-ID order. Open cases.json and a copy of blank-scorecard.json. Use [Rubric v2](../../../generation/v2/rubric.md). For interactive items use /replay.html, choose Legacy lines and the indicated protocol, and paste replaySource. Record pass, fail, NA or NE with a concrete observation for each axis. Keep key.json and prior annotations closed until scores are submitted. No independent human assessments have been collected.\n\nFor the new experiment, use new-cases.json and a copy of new-blank-scorecard.json. Choose the indicated wire format and protocol and paste raw to replay a case. Keep new-key.json closed until submission. Cases are presented in opaque case-ID order. The wire format is visible to reviewers, so blinding does not conceal every treatment.\n')
