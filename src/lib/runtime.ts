import type { DesktopAction } from './desktop'

export type RuntimeState = {
  cursor: { x: number; y: number }
  clicks: number
  rightClicks: number
  doubleClicks: number
  scroll: number
  volume: number
  window: number
  playing: boolean
  detailOpen: boolean
  contextOpen: boolean
  selected: number
  pulse: number
  lastAction: string
}
export const INITIAL_RUNTIME: RuntimeState = {
  cursor:{x:.5,y:.5},clicks:0,rightClicks:0,doubleClicks:0,scroll:0,volume:45,
  window:0,playing:false,detailOpen:false,contextOpen:false,selected:0,pulse:0,lastAction:'Ready for an action',
}
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n))
export function applyRuntimeAction(state:RuntimeState,action:DesktopAction):RuntimeState {
  const next={...state,pulse:state.pulse+1,lastAction:action.replaceAll('-',' ')}
  switch(action){
    case 'left-click':return {...next,clicks:state.clicks+1,selected:Math.min(2,Math.floor(state.cursor.x*3)),contextOpen:false}
    case 'right-click':return {...next,rightClicks:state.rightClicks+1,contextOpen:true}
    case 'double-click':return {...next,doubleClicks:state.doubleClicks+1,detailOpen:true,contextOpen:false}
    case 'scroll-up':return {...next,scroll:clamp(state.scroll-1,0,5)}
    case 'scroll-down':return {...next,scroll:clamp(state.scroll+1,0,5)}
    case 'volume-up':return {...next,volume:clamp(state.volume+10,0,100)}
    case 'volume-down':return {...next,volume:clamp(state.volume-10,0,100)}
    case 'next-window':return {...next,window:(state.window+1)%3}
    case 'previous-window':return {...next,window:(state.window+2)%3}
    case 'play-pause':return {...next,playing:!state.playing}
    case 'escape':return {...next,detailOpen:false,contextOpen:false,playing:false}
    default:return state
  }
}
export function moveRuntimePointer(state:RuntimeState,x:number,y:number):RuntimeState {
  if(!Number.isFinite(x)||!Number.isFinite(y))return state
  return {...state,cursor:{x:clamp(x,0,1),y:clamp(y,0,1)}}
}
