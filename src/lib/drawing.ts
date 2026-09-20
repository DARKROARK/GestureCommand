import { CONNECTIONS } from './gestures'
import type { Detection } from './types'
export function drawHands(ctx:CanvasRenderingContext2D,width:number,height:number,detections:Detection[],heatmap=false) {
  const colors=['#54e4e7','#be9bff']
  detections.forEach((hand,index)=>{
    const p=hand.points,color=colors[index%colors.length]
    if(p.length!==21)return
    ctx.lineWidth=2;ctx.lineCap='round';ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=7
    for(const [a,b] of CONNECTIONS){ctx.beginPath();ctx.moveTo(p[a].x*width,p[a].y*height);ctx.lineTo(p[b].x*width,p[b].y*height);ctx.stroke()}
    p.forEach((point,i)=>{
      const confidence=point.score??hand.confidence/100
      ctx.fillStyle=heatmap?(confidence>.75?'#68ddb0':confidence>=.5?'#f4c378':'#ff8194'):(i===0?'#fff':color)
      ctx.beginPath();ctx.arc(point.x*width,point.y*height,Math.max(2.5,(i%4===0?4:3)*confidence),0,Math.PI*2);ctx.fill()
    });ctx.shadowBlur=0
  })
}
