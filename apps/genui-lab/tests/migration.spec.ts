import {test,expect} from "@playwright/test";
import {migrate} from "../src/admission/migration";
import type {Frame} from "../src/admission/policy";
const input=(binding:string,label:string,value:number,max=5,choices:string[]=[]):Frame=>({
 items:[{type:"Control",binding,props:{label,value,min:0,max,choices}}],state:{[binding]:value}
});
const role=(c:{props:{label:string}})=>({"Ticket count":"count","Ticket quantity":"count","Elapsed minutes":"time","Ticket class":"class"})[c.props.label];
test("host roles preserve a renamed valid field and report a changed domain",()=>{
 const result=migrate(input("n","Ticket count",4),input("qty","Ticket quantity",1,4),role);
 expect(result.state).toEqual({qty:4});
 expect(result.decisions[0]).toMatchObject({action:"renamed",domainChanged:true,from:"n",key:"qty"});
});
test("reusing a name for a different host role records removal and introduction",()=>{
 const result=migrate(input("n","Ticket count",4),input("n","Elapsed minutes",1),role);
 expect(result.state).toEqual({n:1});expect(result.decisions.map(d=>d.action)).toEqual(["introduced","removed"]);
});
test("choice migration preserves meaning after option reorder",()=>{
 const result=migrate(input("tier","Ticket class",1,1,["Adult","Child"]),input("tier","Ticket class",1,1,["Child","Adult"]),role);
 expect(result.state).toEqual({tier:0});
});
test("ambiguous roles, removed choices and incompatible values reject",()=>{
 const a=input("n","Ticket count",4);
 expect(()=>migrate(a,input("n","Ticket quantity",1,3),role)).toThrow(/Incompatible/);
 expect(()=>migrate(a,input("n","Unknown",1),role)).toThrow(/Ambiguous/);
 expect(()=>migrate(a,{...a,items:[...a.items,...a.items]},role)).toThrow(/Ambiguous/);
 expect(()=>migrate(input("c","Ticket class",1,1,["Adult","Child"]),input("c","Ticket class",0,1,["Adult","Other"]),role)).toThrow(/removed choice/);
});
