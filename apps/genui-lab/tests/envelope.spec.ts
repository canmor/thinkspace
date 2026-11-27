import {test,expect} from '@playwright/test'
import {decodeEnvelope} from '../src/envelope'
const ui={type:'ui',source:'root = Stack([x])\nx = Metric("Area", 12)',state:[]}
const wire=(blocks:unknown[])=>JSON.stringify({version:'2b1',blocks})
test('structural envelope rejects malformed, unknown, duplicate, empty and over-budget content',()=>{
 for(const raw of ['{}','{',wire([]),wire([{type:'script',text:'x'}]),wire([ui,ui]),wire([{...ui,state:[{name:'n',value:1},{name:'n',value:2}]}]),wire([{type:'text',text:' '}]),wire([{type:'text',text:'字'.repeat(6000)}]),wire([{type:'text',text:'x'.repeat(65000)}])])expect(()=>decodeEnvelope(raw)).toThrow()
})
test('ordered blocks share the existing admission gate; invalid UI publishes no partial response',async({page})=>{
 await page.goto('/replay.html')
 const send=async(raw:string)=>{await page.getByLabel('Complete model output').fill(raw);await page.getByRole('button',{name:'Replay',exact:true}).click()}
 await send(wire([{type:'text',text:'Before'},ui,{type:'text',text:'After'}]))
 await expect(page.locator('main > p,.stack strong')).toHaveText(['Before','12','After'])
 await send(wire([{type:'text',text:'unpublished'},{...ui,source:'root = Unknown()'}]))
 await expect(page.getByRole('alert')).toContainText('Stack')
 await expect(page.getByText('unpublished',{exact:true})).toHaveCount(0)
})
