import assert from 'node:assert/strict'
import {readFile,readdir,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
const [dir,report]=process.argv.slice(2)
function envelope(raw,protocol){
 const blocks=JSON.parse(raw).blocks,source=blocks.find(b=>b.type==='ui').source
 const entries=protocol==='json'?Object.entries(JSON.parse(source).elements).map(([k,v])=>[k,JSON.stringify(v)]):
  source.trim().split(/\r?\n/).filter(l=>l.trim()).map(l=>{const m=/^\s*(\$?\w+)\s*=\s*(.*?)\s*$/.exec(l);return [m[1],m[2]]})
 return {declarations:new Map(entries),prose:blocks.filter(b=>b.type==='text').map(b=>b.text),bytes:Buffer.byteLength(source)}
}
const rows=[]
for(const file of (await readdir(dir)).filter(n=>/turn[123]\.json$/.test(n)).sort()){
 const r=JSON.parse(await readFile(join(dir,file))),before=envelope(r.before.raw,r.protocol),after=envelope(r.after.raw,r.protocol)
 const keys=new Set([...before.declarations.keys(),...after.declarations.keys()])
 const modified=[...keys].filter(k=>before.declarations.get(k)!==after.declarations.get(k))
 if(r.delivery!=='accepted')assert.deepEqual(r.before,r.after)
 // Changing presentation is explicitly requested in ticket turn 3. These stable
 // business formulas can still be verified independently across every input.
 const proseChanged=JSON.stringify(before.prose)!==JSON.stringify(after.prose)
 rows.push({file,mode:r.mode,delivery:r.delivery,beforeBytes:before.bytes,afterBytes:after.bytes,
  modifiedDeclarations:modified,proseChanged,rollback:r.delivery==='accepted'?null:true})
}
await writeFile(report,JSON.stringify(rows,null,2)+'\n')
