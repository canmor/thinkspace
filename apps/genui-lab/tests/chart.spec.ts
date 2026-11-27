import {test,expect} from "@playwright/test";
import {admit} from "../src/admission/session";
const props = {title:"Depth", xLabel:"Hour (h)", yLabel:"Depth (m)", x:[0,1,2],
  series:[{label:"Reading",values:[2,4,3]}], selected:[1], decimals:1};
const json = (p:unknown) => JSON.stringify({root:"r",elements:{
  r:{type:"Stack",props:{},children:["plot"]},plot:{type:"Chart",props:p}}});
const oui = 'root = Stack([plot])\nplot = Chart("Depth","Hour (h)","Depth (m)",[0,1,2],[{label:"Reading",values:[2,4,3]}],[1],1)';
test("Chart is opt-in in both protocol adapters",()=>{
  for(const [protocol,source] of [["oui",oui],["json",json(props)]] as const){
    expect(()=>admit(protocol,source)).toThrow();
    expect(admit(protocol,source,undefined,true).initial.items[0].props).toEqual(props);
  }
});
test("Experimental chart checks domains, formatting and nested data",()=>{
  for(const bad of [{x:[1,1,2]},{x:[0,2,1]},{selected:[3]},{decimals:4},
    {series:[]},{series:Array(4).fill(props.series[0])},{series:[...props.series,...props.series]},
    {series:[{label:"a",values:[0,1]}]},{series:[{label:"a",values:[0,null,2]}]},
    {x:Array.from({length:41},(_,i)=>i)},{formatter:"currency"},{src:"external"}])
    expect(()=>admit("json",json({...props,...bad}),undefined,true)).toThrow();
});
test("Chart browser renders complete accessible data in the isolated replay",async({page})=>{
  await page.goto("/replay.html?profile=chart-experiment");
  await page.getByLabel("Envelope").selectOption("legacy");
  await page.getByLabel("Protocol").selectOption("oui");
  await page.getByLabel("Complete model output").fill("UI\n"+oui);
  await page.getByRole("button",{name:"Replay",exact:true}).click();
  await expect(page.getByRole("img",{name:"Depth"})).toBeVisible();
  await page.getByText("Data table",{exact:true}).click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(4);
  await expect(page.getByRole("cell",{name:"4.0"})).toBeVisible();
});
test("aggregate chart cap applies across components in one evaluated frame",()=>{
  const x=Array.from({length:40},(_,i)=>i), base=JSON.parse(json({
    ...props,x,series:["a","b","c"].map(label=>({label,values:x}))
  }));
  expect(admit("json",JSON.stringify(base),undefined,true).initial.items).toHaveLength(1);
  base.elements.extra={type:"Chart",props};
  base.elements.r.children.push("extra");
  expect(()=>admit("json",JSON.stringify(base),undefined,true)).toThrow(/Aggregate chart data budget/);
});
