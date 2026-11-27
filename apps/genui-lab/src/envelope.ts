import {z} from 'zod'
import {bytes,check,limits,safeKey} from './admission/policy'
const text=z.object({type:z.literal('text'),text:z.string().min(1)}).strict()
const ui=z.object({type:z.literal('ui'),source:z.string().min(1),state:z.array(z.object({name:z.string(),value:z.number().int()}).strict()).max(limits.components)}).strict()
const schema=z.object({version:z.literal('2b1'),blocks:z.array(z.discriminatedUnion('type',[text,ui])).min(1).max(8)}).strict()
export function decodeEnvelope(raw:string){
 check(raw.length<=limits.envelopeBytes&&bytes(raw)<=limits.envelopeBytes,'Envelope byte budget')
 const {blocks}=schema.parse(JSON.parse(raw))
 const interfaces=blocks.filter(x=>x.type==='ui')
 check(interfaces.length<=1,'One live UI per artifact')
 let total=0
 for(const b of blocks){
   const content=b.type==='ui'?b.source:b.text
   check(content.trim().length,'Empty block')
   total+=bytes(content)
 }
 check(total<=limits.sourceBytes,'Aggregate block byte budget')
 const view=interfaces[0]
 if(view){
   const keys=new Set<string>()
   for(const {name} of view.state){check(safeKey(name)&&!keys.has(name),'Invalid or duplicate state key');keys.add(name)}
 }
 return {blocks,view,state:view?.state.length?Object.fromEntries(view.state.map(x=>[x.name,x.value])):undefined}
}
