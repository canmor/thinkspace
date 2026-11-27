import {createRoot} from "react-dom/client";
import {flushSync} from "react-dom";
import {ArtifactTransaction} from "./admission/transaction";
import {ArtifactBoundary,Surface} from "./surface";
import type {Protocol} from "./admission/policy";
import "./style.css";

// Independent host vocabulary scoped to one synthetic task per browser session.
const vocabulary:Record<string,Record<string,RegExp>>={
 baggage:{fare:/cabin|fare|economy|business/i,member:/gold|status|member/i,route:/route|international|domestic/i,weight:/weight|mass/i},
 tickets:{count:/count|quantity|number of tickets|ticket[s]? purchased/i,category:/adult|child|category|type/i},
 water:{time:/elapsed|minutes|time/i,rate:/drain rate|litres per minute|liters per minute|outflow/i},
 fabric:{count:/panel count|number of panels|quantity/i,hem:/hem/i},
};
const root=createRoot(document.getElementById("root")!);
let session:ArtifactTransaction;
let renderError:string|undefined;
function render(){
  const live=session.current!;
  flushSync(()=>root.render(<ArtifactBoundary key={live.artifact+live.revision} onFailure={m=>{renderError=m}}>
    <Surface frame={live.frame} change={(k,v)=>{void api.change(k,v)}}/>
  </ArtifactBoundary>));
  if(renderError)throw Error(renderError);
}
const api={
 async open(task:string,artifact:string,protocol:Protocol,raw:string){
   session?.close();
   const roles=vocabulary[task];
   if(!roles)throw Error("Unknown experimental task");
   session=new ArtifactTransaction(c=>{
     const matches=Object.entries(roles).filter(([,pattern])=>pattern.test(c.props.label));
     return matches.length===1?matches[0][0]:undefined;
   });
   renderError=undefined;
   await session.open(artifact,protocol,raw);render();return api.snapshot();
 },
 async change(key:string,value:number){await session.change(key,value);render();return api.snapshot()},
 async revise(artifact:string,base:number,raw:string,mode:"full"|"patch"){
   const result=await session.revise(artifact,base,raw,mode);render();return result;
 },
 snapshot(){const {artifact,revision,raw,frame}=session.current!;return {artifact,revision,raw,frame}},
};
Object.assign(window,{revisionLab:api});
