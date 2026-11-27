import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {migrate} from "../src/admission/migration";
import type {Frame} from "../src/admission/policy";

const record=(stem:string)=>JSON.parse(readFileSync("evidence/goal-2b3/revisions/"+stem+".json","utf8"));
for(const seed of [1701,1702]){
 test("replay archived JSON water counterexample and v2 counterpart "+seed,async({page})=>{
  const id="water-json-"+seed, stem=id+"-patch-turn1", saved=record(stem);
  const legacy=record(stem+".attempt"+(saved.attempts-1)).raw;
  await page.goto("/revision.html");
  const call=(method:string,...args:unknown[])=>page.evaluate(({method,args})=>window.revisionLab[method](...args),{method,args});
  async function reset(){await call("open","water",id,"json",saved.before.raw);await call("change","minutes",4);}
  await reset();
  await call("revise",id,0,legacy,"patch");
  expect(JSON.parse(JSON.stringify(await call("snapshot")))).toEqual(saved.after);
  expect(saved.after.frame.state.drainRate).toBe(2);
  await reset();
  const before=await call("snapshot");
  const packet={...JSON.parse(legacy),version:2,initializers:[{role:"rate",value:3}]};
  const incorrect: [string,unknown,RegExp][]=[
   ["missing packet version",JSON.parse(legacy),/version/i],
   ["missing initializer array",{...JSON.parse(legacy),version:2},/initializers/i],
   ["unsupported packet version",{...packet,version:3},/version/i],
   ["missing initializer", {...packet,initializers:[]},/Missing initializer/i],
   ["extra initializer",{...packet,initializers:[...packet.initializers,{role:"unknown",value:2}]},/Unexpected or duplicate initializer/i],
   ["retained override",{...packet,initializers:[...packet.initializers,{role:"time",value:2}]},/Unexpected or duplicate initializer/i],
   ["duplicate initializer",{...packet,initializers:[...packet.initializers,...packet.initializers]},/Unexpected or duplicate initializer/i],
   ["outside domain",{...packet,initializers:[{role:"rate",value:6}]},/Invalid initializer/i],
   ["fractional",{...packet,initializers:[{role:"rate",value:3.5}]},/expected int/i],
   ["stale base",{...packet,base:1},/stale revision/i],
  ];
  for(const [name,p,reason] of incorrect){
   await expect(call("revise",id,0,JSON.stringify(p),"patch-v2"),String(name)).rejects.toThrow(reason);
   expect(await call("snapshot")).toEqual(before);
  }
  // A legal integer can still contradict the requested default. The business
  // oracle must catch this independently of the structural admission check.
  const inRange={...packet,initializers:[{role:"rate",value:2}]};
  const semanticallyWrong=await call("revise",id,0,JSON.stringify(inRange),"patch-v2");
  expect(semanticallyWrong.frame.state.drainRate).not.toBe(3);
  await reset();
  const results=await page.evaluate(async({id,packet})=>Promise.allSettled([0,1].map(()=>window.revisionLab.revise(id,0,JSON.stringify(packet),"patch-v2"))).then(r=>r.map(x=>x.status)),{id,packet});
  expect(results).toEqual(["rejected","fulfilled"]);
  const after=await call("snapshot");
  expect(after.revision).toBe(1);expect(after.frame.state).toEqual({minutes:4,drainRate:3});
  expect(after.frame.items.find(i=>i.type==="Metric").props.value).toBe(12);
  await expect(call("revise",id,0,JSON.stringify(packet),"patch-v2")).rejects.toThrow();
  expect(await call("snapshot")).toEqual(after);
 });
}
test("exact initializer coverage excludes renamed and removed roles, including reordered choices",()=>{
 const before:Frame={items:[{type:"Control",binding:"tier",props:{label:"class",min:0,max:1,choices:["Adult","Child"],value:1}}],state:{tier:1}};
 const after:Frame={items:[{type:"Control",binding:"category",props:{label:"class",min:0,max:1,choices:["Child","Adult"],value:1}}],state:{category:1}};
 const role=c=>c.props.label;
 expect(migrate(before,after,role,[]).state).toEqual({category:0});
 expect(()=>migrate(before,after,role,[{role:"class",value:1}])).toThrow(/Unexpected/);
 expect(()=>migrate(before,{state:{},items:[]},role,[{role:"class",value:0}])).toThrow(/Unexpected/);
});
test("OpenUI v2 uses the explicit new role value and preserves a renamed numeric control",async({page})=>{
 const id="water-oui-v2";
 await page.goto("/revision.html");
 const frame=await page.evaluate(async(id)=>{
  const raw=JSON.stringify({version:"2b1",blocks:[{type:"ui",source:'root = Stack([time])\n$t = 4\ntime = Control("Elapsed minutes",0,6,[],$t)',state:[]}]});
  await window.revisionLab.open("water",id,"oui",raw);
  const ops=[
   ["remove","$t",""],["add","$elapsed","1"],["replace","time",'Control("Elapsed minutes",0,6,[],$elapsed)'],
   ["add","$drain","2"],["add","speed",'Control("Drain rate",2,5,[],$drain)'],["replace","root","Stack([time,speed])"]
  ].map(([op,key,value])=>({op,key,value}));
  const patch=JSON.stringify({version:2,artifact:id,base:0,operations:ops,initializers:[{role:"rate",value:3}]});
  return (await window.revisionLab.revise(id,0,patch,"patch-v2")).frame;
 },id);
 expect(frame.state).toEqual({elapsed:4,drain:3});
});
