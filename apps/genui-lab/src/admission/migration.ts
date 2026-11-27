import {check,type Frame,type State} from "./policy";
type Control=Extract<Frame["items"][number],{type:"Control"}>;
type Identify=(control:Control)=>string|undefined;
export function migrate(before:Frame, candidate:Frame, identify:Identify) {
  function roles(frame:Frame){
    const found=new Map<string,Control>();
    for(const c of frame.items){
      if(c.type!=="Control")continue;
      const role=identify(c);
      check(role && !found.has(role),"Ambiguous state role: "+c.props.label);
      found.set(role,c);
    }
    return found;
  }
  const prior=roles(before), next=roles(candidate);
  const state:State={...candidate.state}, decisions=[];
  for(const [role,c] of next){
    const from=prior.get(role), key=c.binding!;
    if(!from){decisions.push({role,key,action:"introduced",value:state[key]});continue;}
    const old=before.state[from.binding!];
    const choices=from.props.choices, options=c.props.choices;
    check(Boolean(choices.length)===Boolean(options.length),"Incompatible control representation: "+role);
    let value=old;
    if(choices.length){
      const selected=choices[old];
      check(choices.filter(v=>v===selected).length===1 && options.filter(v=>v===selected).length===1,"Ambiguous or removed choice: "+role);
      value=options.indexOf(selected);
    }
    check(value>=c.props.min && value<=c.props.max,"Incompatible retained value: "+role);
    state[key]=value;
    decisions.push({role,from:from.binding,key,action:from.binding===key?"retained":"renamed",value,
      domainChanged:c.props.min!==from.props.min||c.props.max!==from.props.max||JSON.stringify(choices)!==JSON.stringify(options)});
  }
  for(const [role,c] of prior)if(!next.has(role))decisions.push({role,key:c.binding,action:"removed",value:before.state[c.binding!]});
  return {state,decisions};
}
