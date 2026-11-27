import {test} from 'node:test'
import assert from 'node:assert/strict'
import {design} from './oracles.mjs'
const control=(binding,min,max,choices=[])=>({type:'Control',binding,props:{label:'Input',min,max,choices}})
test('neutral labels still resolve fare by options and weight by range; extra option is a domain failure',()=>{
 const frame={state:{a:0,b:0,c:23},items:[control('c',10,40),control('a',0,2,['Economy','Business','First']),control('b',0,1,['No','Yes'])]}
 const d=design('B04',frame)
 assert.deepEqual(d.units.map(x=>x.c?.binding),['a','b','c']);assert.equal(d.cases.length,124);assert.match(d.issues.join(),/First/)
})
test('tray roles use numeric domains and defaults independently of order and IDs',()=>{
 const d=design('T11',{state:{x:3,y:2},items:[control('x',2,6),control('y',1,4)]})
 assert.deepEqual(d.units.map(x=>x.c.binding),['y','x']);assert.deepEqual(d.issues,[]);assert.deepEqual(d.cases.at(-1),{inputs:[4,6],outputs:[24,6]})
})

import {axes} from './score.mjs'
const tray={status:'accepted',frame:{items:[
 {...control('r',1,4),props:{label:'Rows'}},{...control('c',2,6),props:{label:'Columns'}},
 {type:'Metric',props:{label:'Seedlings'}},{type:'Metric',props:{label:'Water'}}
]}}
const tested={domain:'pass',behavior:'pass',issues:[],roleBindings:['r','c']}
test('matching required mappings cannot certify swapped control labels, contradictory prose or an extra incorrect metric',()=>{
 assert.equal(axes('T11',tray,tested).status.domain,'pass')
 for(const alter of [
  a=>{a.frame.items[0].props.label='Columns';a.frame.items[1].props.label='Rows'},
  a=>{a.text='Each seedling needs 50 litres.'},
  a=>{a.frame.items.push({type:'Metric',props:{label:'Total seedlings',value:-1}})}
 ]){
  const a=structuredClone(tray);alter(a)
  const result=axes('T11',a,tested)
  assert.equal(result.status.domain,'NE');assert.equal(result.status.behavior,'pass');assert.equal(result.corePass,false)
 }
})
test('initial weights alone do not identify anonymous ranking dimensions',()=>{
 const result=design('B03',{state:{x:40,y:25,z:35},items:['x','y','z'].map(k=>control(k,0,100))})
 assert.ok(result.units.every(u=>!u.c))
})
test('conceptual keywords cannot certify false explanations',()=>{
 for(const [task,text] of [['B01','The dot product is a projection. Perpendicular vectors have negative cosine with zero length.'],['B02','The conversation interface coordinates history, references, and budget. The orchestrator stores every message and the context does nothing.']]){
  const r=axes(task,{status:'text',text},null)
  assert.equal(r.status.domain,'NE');assert.equal(r.corePass,false)
 }
})
