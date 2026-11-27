import {RestrictedClient} from "./client";
import {decodeEnvelope} from "../envelope";
import {migrate} from "./migration";
import {check,type Frame,type Protocol} from "./policy";

type Live={artifact:string; revision:number; protocol:Protocol; raw:string; frame:Frame; client:RestrictedClient};
export class ArtifactTransaction {
  private epoch=0;
  private live?:Live;
  get current(){return this.live;}
  constructor(private identify:Parameters<typeof migrate>[2]){}
  async open(artifact:string,protocol:Protocol,raw:string){
    check(!this.live,"Artifact already open");
    const ticket=++this.epoch,env=decodeEnvelope(raw);
    check(env.view,"Missing UI");
    const client=new RestrictedClient();
    try{
      const frame=await client.request({kind:"open",protocol,source:env.view.source,state:env.state});
      check(ticket===this.epoch,"Superseded open");
      this.live={artifact,revision:0,protocol,raw,frame,client};
      return frame;
    }catch(e){client.close();throw e;}
  }
  async change(key:string,value:number){
    const live=this.live;
    check(live,"No active artifact");
    ++this.epoch;
    const frame=await live.client.request({kind:"change",key,value});
    check(this.live===live,"Superseded interaction");
    ++this.epoch;
    live.frame=frame;
    return frame;
  }
  async revise(artifact:string,base:number,raw:string,mode:"full"|"patch"){
    const live=this.live;
    check(live && live.artifact===artifact && live.revision===base,"Wrong artifact or stale revision");
    const ticket=++this.epoch;
    const client=new RestrictedClient("revision-experiment");
    try{
      if(mode==="patch"){
        const env=decodeEnvelope(live.raw);
        check(env.view,"Missing base UI");
        env.view.source=(await client.request({kind:"reconstruct",protocol:live.protocol,source:env.view.source,raw,artifact,base})).source;
        env.view.state=[];
        raw=JSON.stringify({version:"2b1",blocks:env.blocks});
      }
      const env=decodeEnvelope(raw);
      check(env.view,"Missing revised UI");
      const open={kind:"open",protocol:live.protocol,source:env.view.source};
      const candidate=await client.request({...open,state:env.state});
      const {state,decisions}=migrate(live.frame,candidate,this.identify);
      const frame=await client.request({...open,state});
      check(this.live===live && ticket===this.epoch,"Superseded revision");
      env.view.state=Object.entries(state).map(([name,value])=>({name,value}));
      const published=JSON.stringify({version:"2b1",blocks:env.blocks});
      decodeEnvelope(published);
      this.live={...live,raw:published,revision:base+1,frame,client};
      live.client.close();
      return {raw:published,frame,decisions};
    }catch(e){client.close();throw e;}
  }
  close(){++this.epoch;this.live?.client.close();this.live=undefined;}
}
