import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyGesture, describePose, fingerExtension } from '../src/lib/classifier'
import type { GestureId, Point } from '../src/lib/types'

// Analytic 3D fixtures exercise geometry, not demo drawing coordinates.
// These cannot establish real-camera accuracy; see docs/VALIDATION.md.
function pose(id:GestureId):Point[]{
  const p:Point[]=Array.from({length:21},()=>({x:0,y:0,z:0}))
  const roots=[[-.42,.82,0],[0,.90,0],[.36,.82,0],[.64,.64,0]],lengths=[1.05,1.2,1.1,.85]
  const extended=id==='open'?[0,1,2,3]:id==='peace'?[0,1]:id==='rock'?[0,3]:id==='point'?[0]:id==='ok'?[1,2,3]:[]
  for(let f=0;f<4;f++){
    const start=f*4+5;p[start]={x:roots[f][0],y:roots[f][1],z:0}
    const angles=extended.includes(f)?[5,9,13]:id==='palm-close'?[25,63,93]:[75,165,235]
    for(let j=0;j<3;j++){
      const theta=angles[j]*Math.PI/180,len=lengths[f]*[.5,.3,.2][j],prev=p[start+j]
      p[start+j+1]={x:prev.x,y:prev.y+Math.cos(theta)*len,z:(prev.z??0)+Math.sin(theta)*len}
    }
  }
  if(id==='open'){
    p[1]={x:-.4,y:.3,z:0};p[2]={x:-.7,y:.5,z:0};p[3]={x:-1,y:.7,z:0};p[4]={x:-1.3,y:.9,z:0}
  }else if(id==='thumbs-up'){
    p[1]={x:-.65,y:.3,z:0};p[2]={x:-.65,y:.7,z:0};p[3]={x:-.65,y:1.1,z:0};p[4]={x:-.65,y:1.5,z:0}
  }else{
    p[1]={x:-.5,y:.3,z:0};p[2]={x:-.6,y:.6,z:0};p[3]={x:-.3,y:.5,z:.1};p[4]={x:.05,y:.3,z:.2}
  }
  if(id==='ok')p[4]={...p[8],x:p[8].x+.025}
  return p
}
const image=(p:Point[])=>p.map(v=>({x:v.x*100+300,y:300-v.y*100}))
const ids:GestureId[]=['open','fist','thumbs-up','peace','ok','rock','point','palm-close']
for(const id of ids){
  test(`recognizes ${id} across 12 scaled / translated / mirrored fixtures`,()=>{
    for(let i=0;i<12;i++){
      const s=[.01,.5,3][i%3],mirror=i%2?-1:1,angle=(i%4)*.14
      const points=pose(id).map(p=>({x:s*(p.x*Math.cos(angle)-(p.z??0)*Math.sin(angle))*mirror+10,y:s*p.y-4,z:s*(p.x*Math.sin(angle)+(p.z??0)*Math.cos(angle))+2}))
      const result=classifyGesture(points,image(points))
      assert.equal(result?.id,id,`variant ${i}, features=${JSON.stringify(points.slice(5,9))}`)
      assert.ok(result.confidence>=70,`${id} confidence ${result.confidence}`)
    }
  })
}
test('partially bent fingers remain distinct from an open hand',()=>{
  const partial=pose('palm-close'),open=pose('open')
  for(let i=5;i<21;i+=4){assert.ok(fingerExtension(partial,i)<.75);assert.ok(fingerExtension(open,i)>.88)}
})
test('exact captured profile takes priority over a built-in match',()=>{
  const points=pose('peace'),profile={id:'custom-test',name:'My move',createdAt:0,descriptor:describePose(points)}
  assert.equal(classifyGesture(points,image(points),[profile])?.id,'custom-test')
})
test('hand presence is included in the confidence score',()=>{
  const p=pose('peace');assert.ok((classifyGesture(p,image(p),[],.4)?.confidence??100)<=40)
})
test('thumbs down does not classify as thumbs up',()=>{
  const p=pose('thumbs-up');assert.notEqual(classifyGesture(p,p)?.id,'thumbs-up')
})
test('invalid or degenerate inputs are rejected',()=>{
  assert.equal(classifyGesture([]),null)
  assert.equal(classifyGesture(Array.from({length:21},()=>({x:0,y:0,z:0}))),null)
  const p=pose('open');p[8].z=NaN;assert.equal(classifyGesture(p),null)
})
