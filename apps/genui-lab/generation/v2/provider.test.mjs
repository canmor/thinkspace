import test from 'node:test'
import assert from 'node:assert/strict'
import {disposition} from './provider.mjs'
test('only complete non-refused output can enter replay',()=>{
 for(const [reason,message,status] of [['length',{content:'partial'},'truncated'],['stop',{content:'',refusal:'declined'},'refused'],['content_filter',{content:''},'refused'],['stop',{},'provider-error']]){
  const r=disposition({choices:[{finish_reason:reason,message}]});assert.equal(r.status,status);assert.equal(r.raw,undefined)
 }
 assert.deepEqual(disposition({choices:[{finish_reason:'stop',message:{content:'complete'}}]}),{raw:'complete'})
})
