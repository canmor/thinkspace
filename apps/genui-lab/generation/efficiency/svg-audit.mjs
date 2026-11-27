import assert from 'node:assert/strict'
// Strip-chart calibrations transcribed from the visible axis ticks and glyph alignment.
// Entries are [first x, horizontal step, y at zero, vertical units-to-pixels, axis paths].
const calibration={
 archive:[[55,46,116,3,1],[54,46,104,3,1],[60,44,104,3,1],[50,44,108,3,1]],
 tide:[[55,70,110,15,1],[72,68,108,15,1],[55,70,108,14,1],[58,70,105,14,2]],
 kiln:[[54,57,129,1,1],[50,48,124,.8,1],[54,41,110,.8,1],[55,48,124,1,1]],
};
export function auditSvg(run,frame,expected,units){
 const g=frame.items.filter(i=>i.type==='Graphic');assert.equal(g.length,1,'Expected one plot')
 const index=(run.protocol==='oui'?2:0)+run.seed-1701
 const [x0,dx,y0,dy,axes]=calibration[run.task][index]
 const marks=g[0].props.items
 const labels=[g[0].props.label,...marks.filter(m=>m.kind==='text').map(m=>m.text)].join(' ')
 assert.ok(units.every(re=>re.test(labels)),'SVG axis units')
 const pixels=expected.map(series=>series.map(([x,y])=>[x0+x*dx,y0-y*dy]))
 const last=pixels[0].at(-1)[0]
 const data=marks.filter(m=>m.kind==='circle'||m.kind==='rect').map(m=>m.kind==='circle'?[m.cx,m.cy]:[m.x+m.width/2,m.y+m.height/2]).filter(([x])=>x<=last)
 const paths=marks.filter(m=>m.kind==='path').slice(axes)
 assert.ok(data.length||paths.length,'No data marks')
 for(const point of data)assert.ok(pixels.flat().some(([x,y])=>x===point[0]&&y===point[1]),'Unexpected data mark '+point)
 if(data.length&&!paths.length)assert.equal(data.length,pixels.flat().length,'Wrong number of data marks')
 if(!paths.length||data.length>=pixels[0].length*2-1)
  for(const point of pixels.flat())assert.ok(data.some(([x,y])=>x===point[0]&&y===point[1]),'Missing data mark '+point)
 if(paths.length){
  assert.equal(paths.length,pixels.length,'Unexpected data paths')
  for(const [i,p] of paths.entries()){
   const tokens=p.d.trim().split(/\s+/),vertices=[]
   while(tokens.length){
    const op=tokens.shift();assert.ok(['M','L','H'].includes(op),'Unrecognized path')
    const x=Number(tokens.shift()),y=op==='H'?vertices.at(-1)[1]:Number(tokens.shift())
    vertices.push([x,y])
   }
   const target=pixels[i]
   assert.equal(vertices[0][0],target[0][0]);assert.equal(vertices.at(-1)[0],last)
   for(const [x,y] of vertices)assert.ok(target.some(([tx,ty])=>tx===x&&ty===y),'Off-grid path vertex')
   for(const [x,y] of target){
    const j=vertices.findIndex(([vx])=>vx>=x);assert.ok(j>=0)
    const [bx,by]=vertices[j],[ax,ay]=vertices[Math.max(0,j-1)]
    assert.equal(bx===ax?by:ay+(by-ay)*(x-ax)/(bx-ax),y,'Incorrect line interpolation')
   }
  }
 }
}
