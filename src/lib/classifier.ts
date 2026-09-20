import { GESTURES } from './gestures'
import type { Point, Profile } from './types'

const clamp=(v:number)=>Math.max(0,Math.min(1,v))
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0))
const angle=(a:Point,b:Point,c:Point)=>{
  const u=[a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0)],v=[c.x-b.x,c.y-b.y,(c.z??0)-(b.z??0)]
  return Math.acos(Math.max(-1,Math.min(1,u.reduce((sum,n,i)=>sum+n*v[i],0)/(Math.hypot(...u)*Math.hypot(...v)||1))))*180/Math.PI
}
/** Joint angles and length ratios make these features translation/scale invariant. */
export function fingerExtension(points: Point[], start: number) {
  const [a,b,c,d]=points.slice(start,start+4)
  if(start!==1){
    const bend=.65*(180-angle(a,b,c))+.35*(180-angle(b,c,d))
    const direction={x:a.x+(a.x-points[0].x),y:a.y+(a.y-points[0].y),z:(a.z??0)+((a.z??0)-(points[0].z??0))}
    const mcpAngle=angle(b,a,direction)
    return clamp(1-(.70*bend+.30*Math.max(0,mcpAngle-20))/90)
  }
  const straight=(angle(a,b,c)+angle(b,c,d))/360
  const reach=distance(a,d)/(distance(a,b)+distance(b,c)+distance(c,d)||1)
  return clamp(straight*.45+reach*.55)
}
export function describePose(p: Point[]): number[] {
  if (p.length!==21) return []
  const scale=Math.max(distance(p[5],p[17]),distance(p[0],p[9]),.00001)
  const tips=[4,8,12,16,20], result=tips.map((_,i)=>fingerExtension(p,i*4+1))
  for(let i=0;i<tips.length;i++)for(let j=i+1;j<tips.length;j++) result.push(distance(p[tips[i]],p[tips[j]])/scale)
  return result
}
/** A heuristic match score, not a calibrated statistical probability. Reject ambiguity. */
export function classifyGesture(p: Point[], imagePoints=p, profiles: Profile[]=[], presence=1): {id:string;name:string;confidence:number} | null {
  if(p.length!==21 || p.some(v=>!Number.isFinite(v.x)||!Number.isFinite(v.y)||!Number.isFinite(v.z??0)))return null
  if(distance(p[0],p[9])<1e-8||distance(p[5],p[17])<1e-8)return null
  const features=describePose(p), [thumb,index,middle,ring,pinky]=features
  const palm=Math.max(distance(p[5],p[17]),distance(p[0],p[9]),.00001)
  const smooth=(low:number,high:number,v:number)=>{const t=clamp((v-low)/(high-low));return t*t*(3-2*t)}
  const extended=(v:number)=>smooth(.68,.88,v)
  const curled=(v:number)=>1-smooth(.18,.45,v)
  const partial=(v:number)=>smooth(.27,.43,v)*(1-smooth(.72,.86,v))
  const fit=(...values:number[])=>Math.min(...values)*.65+values.reduce((a,b)=>a+b,0)/values.length*.35
  const touch=clamp((.42-distance(p[4],p[8])/palm)/.25)
  const upward=clamp((imagePoints[2].y-imagePoints[4].y)/(Math.hypot(imagePoints[4].x-imagePoints[2].x,imagePoints[4].y-imagePoints[2].y)||1))
  const scores:[string,number][]=[
    ['ok',fit(touch,extended(middle),extended(ring),extended(pinky))],
    ['open',fit(Math.max(extended(thumb),clamp((distance(p[4],p[5])/palm-.35)/.4)),extended(index),extended(middle),extended(ring),extended(pinky),1-touch)],
    ['thumbs-up',fit(extended(thumb),curled(index),curled(middle),curled(ring),curled(pinky),upward)],
    ['peace',fit(extended(index),extended(middle),curled(ring),curled(pinky),clamp(distance(p[8],p[12])/palm/.45))],
    ['rock',fit(extended(index),curled(middle),curled(ring),extended(pinky))],
    ['point',fit(extended(index),curled(middle),curled(ring),curled(pinky))],
    ['fist',fit(curled(index),curled(middle),curled(ring),curled(pinky),1-extended(thumb)*upward)],
    ['palm-close',fit(partial(index),partial(middle),partial(ring),partial(pinky))],
  ]
  for(const profile of profiles) {
    const error=Math.sqrt(features.reduce((sum,v,i)=>sum+(v-profile.descriptor[i])**2,0)/features.length)
    // Exact captured poses can deliberately override a built-in gesture.
    if(error<.19)scores.push([profile.id,clamp(1-error*2.5)])
  }
  scores.sort((a,b)=>b[1]-a[1]||(Number(b[0].startsWith('custom-'))-Number(a[0].startsWith('custom-'))))
  const [id,score]=scores[0], custom=profiles.find(v=>v.id===id)
  if(score<.40)return null
  // Surface uncertain best matches below the threshold so users can adjust their pose.
  // A close runner-up receives a small penalty instead of hiding the tracked hand.
  const ambiguity=!custom&&score-scores[1][1]<.07?.85:1
  return {id,name:custom?.name??GESTURES.find(g=>g.id===id)!.name,confidence:Math.round(clamp(score)*clamp(presence)*ambiguity*100)}
}
export function classifyRobust(geometry:Point[],pixels:Point[],profiles:Profile[]=[],presence=1){
  const spatial=classifyGesture(geometry,pixels,profiles,presence)
  // World landmarks can be noisy when fingers occlude one another; the screen
  // landmarks offer an independent second geometry estimate for built-in poses.
  const planar=classifyGesture(pixels,pixels,[],presence)
  if(spatial?.id.startsWith('custom-'))return spatial
  return !spatial||((planar?.confidence??0)>spatial.confidence)?planar:spatial
}
