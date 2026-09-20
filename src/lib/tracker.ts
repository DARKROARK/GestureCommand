import type { Detection } from './types'

/** Log a stable pose once per hand, rearming after a change or a 650 ms absence. */
export class GestureTracker {
  private hands=new Map<string,{id:string;count:number;logged:boolean;seen:number}>()
  private previousFrame:Detection[]|null=null
  clear(){this.hands.clear();this.previousFrame=null}
  update(frame:Detection[],threshold:number,now:number):Detection[]{
    // A stalled video must never count the same inference as multiple confirmations.
    if(frame===this.previousFrame)return []
    this.previousFrame=frame
    const valid=frame.filter(d=>d.id!=='unknown'&&d.confidence>=threshold)
    for(const [hand,state] of this.hands){
      if(now-state.seen>650)this.hands.delete(hand)
      else if(!valid.some(d=>d.hand===hand)&&!state.logged)state.count=0
    }
    const accepted:Detection[]=[]
    for(const detection of valid){
      let state=this.hands.get(detection.hand)
      if(!state||state.id!==detection.id){state={id:detection.id,count:0,logged:false,seen:now};this.hands.set(detection.hand,state)}
      state.count++;state.seen=now
      if(state.count>=3&&!state.logged){state.logged=true;accepted.push(detection)}
    }
    return accepted
  }
}
