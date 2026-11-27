import {readFile} from 'node:fs/promises'
const origins={
 tickets:['count','Ticket count',1,5,2,'Total ($)',8],
 water:['minutes','Elapsed time (minutes)',0,6,2,'Remaining (litres)',3],
 fabric:['count','Panel count',1,4,2,'Total (metres)',3],
}
export async function origin(task,protocol,seed){
 if(task==='baggage'){
  const saved=JSON.parse(await readFile('evidence/goal-2b1-sol-default/episodes/G-B04-'+protocol+'-'+seed+'.json'))
  return saved.attempts.at(-1).raw
 }
 const [key,label,min,max,initial,output,rate]=origins[task]
 let source
 if(protocol==='oui'){
  const product='$'+key+' * '+rate
  source=['root = Stack([input,result])','$'+key+' = '+initial,
   'input = Control('+JSON.stringify(label)+', '+min+', '+max+', [], $'+key+')',
   'result = Metric('+JSON.stringify(output)+', '+(task==='water'?'24 - ('+product+')':product)+')'].join('\n')
 }else{
  const product={$computed:'Multiply',args:{a:{$state:'/'+key},b:rate}}
  const value=task==='water'?{$computed:'Excess',args:{a:24,b:product}}:product
  source=JSON.stringify({root:'layout',elements:{layout:{type:'Stack',props:{},children:['input','result']},
   input:{type:'Control',props:{label,min,max,choices:[],value:{$bindState:'/'+key}}},
   result:{type:'Metric',props:{label:output,value}}}})
 }
 return JSON.stringify({version:'2b1',blocks:[{type:'ui',source,state:[{name:key,value:initial}]}]})
}
