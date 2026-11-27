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
