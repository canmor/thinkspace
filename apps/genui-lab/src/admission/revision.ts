import {z} from "zod";
import {bytes, check, limits, safeKey, type Protocol} from "./policy";
import {checkUniqueJsonMembers} from "./json";

const identifier=z.string().refine(s=>safeKey(s.replace(/^\$/,"")));
const operation=z.object({
  op:z.enum(["add","replace","remove"]), key:identifier, value:z.string()
}).strict();
const schema=z.object({
  artifact:z.string().min(1).max(80), base:z.number().int().nonnegative(),
  operations:z.array(operation).min(1).max(32)
}).strict();
const initializer = z.object({role:z.string().refine(safeKey),value:z.number().int().safe()}).strict();
const explicitSchema = schema.extend({version:z.literal(2),initializers:z.array(initializer).max(limits.components)});
export type Initializer = z.infer<typeof initializer>;
export type Reconstruction = {source:string; initializers?:Initializer[]};
export function reconstruct(protocol:Protocol, source:string, raw:string, artifact:string, revision:number,explicit=false):Reconstruction{
  check(bytes(raw)<=8192,"Revision byte budget");
  checkUniqueJsonMembers(raw);
  const input=JSON.parse(raw);
  const packetV2=explicit?explicitSchema.parse(input):undefined;
  const patch=packetV2??schema.parse(input);
  check(patch.artifact===artifact && patch.base===revision,"Wrong artifact or stale revision");
  const declarations=new Map<string,string>();
  let root:string|undefined;
  if(protocol==="oui"){
    for(const line of source.trim().split(/\r?\n/).filter(s=>s.trim())){
      const match=/^\s*(\$?\w+)\s*=\s*(.+?)\s*$/.exec(line);
      check(match,"Invalid base declaration");
      declarations.set(match[1],match[2]);
    }
  }else{
    const doc=JSON.parse(source);
    root=doc.root;
    for(const [k,v] of Object.entries(doc.elements))declarations.set(k,JSON.stringify(v));
  }
  const touched=new Set<string>();
  for(const {op,key,value} of patch.operations){
    check(!touched.has(key),"Conflicting revision operations");
    touched.add(key);
    check(op==="add"?!declarations.has(key):declarations.has(key),"Invalid operation target");
    if(op==="remove"){
      check(value==="","Remove takes an empty value");
      declarations.delete(key);
    }else{
      check(value.trim().length>0,"Empty replacement");
      if(protocol==="oui")check(!/[\r\n]/.test(value),"Expected one declaration expression");
      else {check(safeKey(key),"Invalid element key");checkUniqueJsonMembers(value);JSON.parse(value);}
      declarations.set(key,value);
    }
  }
  const candidate=protocol==="oui"?Array.from(declarations,([k,v])=>k+" = "+v).join("\n"):
    JSON.stringify({root,elements:Object.fromEntries(Array.from(declarations,([k,v])=>[k,JSON.parse(v)]))});
  check(bytes(candidate)<=limits.sourceBytes,"Reconstructed source budget");
  return {source:candidate,initializers:packetV2?.initializers};
}
