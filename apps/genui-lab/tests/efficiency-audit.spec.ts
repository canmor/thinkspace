import {test,expect} from "@playwright/test";
import {readdirSync,readFileSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {admit} from "../src/admission/session";
import {decodeEnvelope} from "../src/envelope";
import {expectedMetrics} from "../generation/efficiency/oracles.mjs";

const range=(lo:number,hi:number)=>Array.from({length:hi-lo+1},(_,i)=>lo+i);
const domains={
 baggage:{business:[/cabin|fare/i,["Economy","Business"]],gold:[/status|gold|member/i,["No Gold","Gold"]],international:[/route|trip type/i,["Domestic","International"]],weight:[/weight/i,range(10,40)]},
 tickets:{count:[/count|quantity|number of tickets/i,range(1,5)],child:[/category|type|adult|child/i,["Adult","Child"]]},
 water:{minutes:[/elapsed|time/i,range(0,6)],rate:[/rate|outflow/i,range(2,5)]},
 fabric:{count:[/panel count|number of panels|quantity/i,range(1,4)],hem:[/hem/i,range(0,2)]},
};
const metricRoles={allowance:/allowance/i,fee:/fee|charge/i,newFee:/new/i,increase:/increase|difference/i,total:/total|cost/i,savings:/sav/i,remaining:/remaining|left/i,drained:/drained/i,metres:/total|length|metres needed/i,cost:/cost|price/i};
function mapControls(task,frame){
 const inputs=frame.items.filter(c=>c.type==="Control"),map={};
 for(const [role,[pattern,domain]] of Object.entries(domains[task])){
  const matches=inputs.filter(c=>pattern.test(c.props.label));
  if(!matches.length)continue;
  expect(matches).toHaveLength(1);
  const c=matches[0];
  const positions=domain.map((v,i)=>{
   if(typeof v==="number")return c.props.choices.length?c.props.choices.findIndex(s=>Number(s)===v):v;
   if(c.props.choices.length)return c.props.choices.findIndex(s=>s.toLowerCase()===v.toLowerCase());
   expect(c.props.label.toLowerCase()).toContain(i+" = "+v.toLowerCase());return i;
  });
  expect([...positions].sort((a,b)=>a-b)).toEqual(range(c.props.min,c.props.max));
  map[role]={key:c.binding,positions,values:typeof domain[0]==="string"?range(0,domain.length-1):domain};
 }
 expect(new Set(Object.values(map).map(x=>x.key)).size).toBe(inputs.length);
 return map;
}
const root=process.env.EFFICIENCY_AUDIT_DIR;
test("independent generated revision behavior and rollback audit",()=>{
 test.skip(!root,"Requires collected revision evidence");
 const results=[];
 for(const file of readdirSync(root).filter(n=>/-turn[123]\.json$/.test(n)).sort()){
  const row=JSON.parse(readFileSync(join(root,file),"utf8")),r={file,status:row.delivery,checked:0};
  results.push(r);
  if(row.delivery!=="accepted"){expect(row.after).toEqual(row.before);r.rollback=true;continue;}
  try{
   const {view,state}=decodeEnvelope(row.after.raw);
   const session=admit(row.protocol,view.source,state);
   let frame=session.initial;expect(frame).toEqual(row.after.frame);
   const old=mapControls(row.task,row.before.frame),now=mapControls(row.task,frame);
   for(const [key,prior] of Object.entries(old)){
    const next=now[key];expect(next,"prior field "+key).toBeDefined();
    expect(next.positions.indexOf(frame.state[next.key])).toBe(prior.positions.indexOf(row.before.frame.state[prior.key]));
   }
   r.continuity=true;
   expect(Object.keys(now).sort()).toEqual(Object.keys(domains[row.task]).sort());
   const states=Object.entries(now).reduce((rows,[role,c])=>rows.flatMap(s=>c.values.map((v,i)=>({...s,[role]:[v,c.positions[i]]}))),[{}]);
   for(const s of states){
    for(const [role,[,value]] of Object.entries(s)){
     const key=now[role].key;if(frame.state[key]!==value)frame=session.change(key,value);
    }
    const values=Object.fromEntries(Object.entries(s).map(([k,[v]])=>[k,v]));
    const metrics=frame.items.filter(x=>x.type==="Metric");
    for(const [role,want] of Object.entries(expectedMetrics(row.task,row.turn,values))){
     const pattern=role==="fee"&&row.turn===3?/old|original/i:role==="metres"&&row.turn>=2?/metre|meter|length/i:metricRoles[role];
     const found=metrics.filter(x=>pattern.test(x.props.label));
     expect(found,role+" at "+JSON.stringify(values)).toHaveLength(1);expect(found[0].props.value).toBe(want);
    }
    if(row.task==="tickets"&&row.turn===3){expect(metrics[0].props.label).toBe("Group savings ($)");}
    const charts=frame.items.filter(x=>x.type==="Graphic");
    if((row.task==="baggage"&&row.turn>=2)||(row.task==="water"&&row.turn===2))expect(charts.length).toBeGreaterThan(0);
    if(row.task==="water"&&row.turn===3)expect(charts).toHaveLength(0);
    r.checked++;
   }
   r.behavior="pass";
  }catch(e){r.behavior="failed or unverified";r.diagnostic=e.message.replace(/\x1b\[[0-9;]*m/g,"").slice(0,900);}
 }
 writeFileSync(process.env.EFFICIENCY_AUDIT_REPORT,JSON.stringify(results,null,2)+"\n");
});
