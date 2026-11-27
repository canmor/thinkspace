import test from 'node:test'
import assert from 'node:assert/strict'
import {generate} from './provider.mjs'
test('cloud port uses the fixed origin, caps output and requests no tools or storage',async t=>{
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/chat/completions')
  const body=JSON.parse(options.body)
  assert.equal(body.stream,false);assert.equal(body.store,false);assert.equal(body.max_tokens,768);assert.equal(body.tools,undefined)
  assert.equal(options.redirect,'error')
  return Response.json({choices:[{message:{content:'TEXT\nDone'},finish_reason:'stop'}],usage:{total_tokens:10},model:body.model})
 })
 assert.equal((await generate([],1701,'test-only',new AbortController().signal,true)).raw,'TEXT\nDone')
})
test('oversized provider response is cancelled before JSON decoding',async t=>{
 let cancelled=false
 t.mock.method(globalThis,'fetch',async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(65537))},cancel(){cancelled=true}})))
 await assert.rejects(generate([],1,'test-only',new AbortController().signal,true),/exceeds/)
 assert.equal(cancelled,true)
})
test('explicit cancellation propagates to the in-flight HTTP request',async t=>{
 t.mock.method(globalThis,'fetch',(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true})))
 const control=new AbortController(),pending=generate([],1,'test-only',control.signal,true)
 control.abort(new Error('cancelled by operator'));await assert.rejects(pending,/cancelled by operator/)
})
