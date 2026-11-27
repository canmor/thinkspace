import {messages as baseline,tasks} from '../harness.mjs'
export const version='2b1.1'
export const core=tasks
export const holdout={
 T11:'Build a greenhouse tray planner. Rows range from 1 to 4, columns from 2 to 6, initially 2 rows and 3 columns. Each cell holds one seedling and needs 0.25 litres of water. Show the seedling count and water needed as both dimensions change.',
 T12:'Build a locker credit calculator. Small lockers cost 2 credits per block, Large cost 5. A visit lasts 1 to 8 whole blocks. Start on Small for 1 block. Show total credits; there are no other charges or locker sizes.',
 T13:'What is a gutter in a two-page book layout? Answer in one sentence.'
}
const mini='gpt-4.1-mini-2025-04-14'
export const arms=[
 {id:'A',wire:'legacy',tokens:768,ground:false,examples:false,model:mini},
 {id:'B',wire:'structured',tokens:768,ground:false,examples:false,model:mini},
 {id:'C',wire:'structured',tokens:2048,ground:false,examples:false,model:mini},
 {id:'D',wire:'structured',tokens:2048,ground:true,examples:false,model:mini},
 {id:'E',wire:'structured',tokens:2048,ground:true,examples:true,model:mini},
 {id:'F',wire:'structured',tokens:2048,ground:true,examples:true,model:'gpt-4.1-2025-04-14'}
]
export const seeds=[1701,1702]
const grounding='Treat the request as the complete source of domain rules. Include exactly its input dimensions, options, units, defaults and ranges. Check that each input changes the intended outputs. Do not invent extra tiers, exceptions or fees. Interpret terminology in its application context. Provide an actual interaction when requested. Do not claim a visible control exists in prose alone.'
const exampleText={version:'2b1',blocks:[{type:'text',text:'A glossary lists terms and their meanings.'}]}
const exampleSource={
 oui:'root = Stack([choice,result])\n$n = 1\nchoice = Control("Chimes", 1, 5, [], $n)\nresult = Metric("Beats", $n * 3)',
 json:'{"root":"layout","elements":{"layout":{"type":"Stack","props":{},"children":["choice","result"]},"choice":{"type":"Control","props":{"label":"Chimes","min":1,"max":5,"choices":[],"value":{"$bindState":"/n"}}},"result":{"type":"Metric","props":{"label":"Beats","value":{"$computed":"Multiply","args":{"a":{"$state":"/n"},"b":3}}}}}}'
}
export function prompt(arm,protocol,task,prior){
 const m=baseline(protocol,'H1',task)
 m[1].content=core[task]??holdout[task]
 if(arm.wire==='structured'){
  const s=m[0].content
  m[0].content='Return a complete version 2b1 ordered block envelope using the supplied JSON schema. Use text blocks for prose. At most one ui block contains only the requested protocol source and initial integer state entries (empty uses defaults). No fences. '+s.slice(s.indexOf('No JavaScript')).replace('unless STATE supplies every binding','unless the envelope initial state supplies every binding').replace('Choose TEXT','Choose text')
 }
 if(arm.ground)m[0].content+='\n'+grounding
 if(arm.examples)m[0].content+='\nUnrelated response-shape examples. Derive the actual content from the user request.\n'+JSON.stringify(exampleText)+'\n'+JSON.stringify({version:'2b1',blocks:[{type:'text',text:'Each chime has three beats.'},{type:'ui',source:exampleSource[protocol],state:[]}]})
 if(prior)m.push({role:'assistant',content:prior.raw},{role:'user',content:'The complete response was rejected: '+prior.diagnostic+'. Return one complete corrected response.'})
 return m
}
