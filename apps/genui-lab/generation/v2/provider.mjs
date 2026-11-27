import {readFile} from 'node:fs/promises'
const schema=JSON.parse(await readFile(new URL('./schema.json',import.meta.url)))
export function disposition(reply){
 const c=reply.choices?.[0]
 if(!c)return {status:'provider-error',diagnostic:'Missing completion choice'}
 if(c.message?.refusal||c.finish_reason==='content_filter')return {status:'refused',diagnostic:c.message?.refusal||'Provider content filter'}
 if(c.finish_reason!=='stop')return {status:'truncated',diagnostic:'Incomplete output: '+c.finish_reason}
 if(typeof c.message?.content!=='string')return {status:'provider-error',diagnostic:'Missing output content'}
 return {raw:c.message.content}
}
export async function request(arm,messages,seed,token,signal){
 const start=performance.now(),body={model:arm.model,max_tokens:arm.tokens,temperature:0.35,top_p:0.9,seed,store:false,stream:false,messages}
 if(arm.wire==='structured')body.response_format={type:'json_schema',json_schema:{name:'restricted_blocks_v2',strict:true,schema}}
 const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(150000)]),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const chunks=[];let length=0
 const reader=response.body.getReader()
 try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>65536)throw Error('Provider body size limit');chunks.push(value)}}finally{await reader.cancel()}
 const rawResponse=Buffer.concat(chunks).toString('utf8'),latencyMs=Math.round(performance.now()-start)
 if(!response.ok)return {rawResponse,latencyMs,status:'provider-error',diagnostic:'HTTP '+response.status}
 let reply
 try{reply=JSON.parse(rawResponse)}catch{return {rawResponse,latencyMs,status:'provider-error',diagnostic:'Malformed provider JSON'}}
 return {rawResponse,latencyMs,usage:reply.usage,...disposition(reply)}
}
