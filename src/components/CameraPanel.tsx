import { useEffect, useRef, type RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, CameraOff, Expand, FlipHorizontal2, LoaderCircle, Pause, Scan, ShieldCheck, Sparkles, Video, Waypoints } from 'lucide-react'
import { CONNECTIONS, demoPoints } from '../lib/gestures'
import { drawHands } from '../lib/drawing'
import type { Detection, GestureId, Settings } from '../lib/types'
import type { CameraStatus } from '../hooks/useCamera'

export type CameraPanelProps={
  videoRef:RefObject<HTMLVideoElement>;frameRef:React.MutableRefObject<Detection[]>;stageRef:RefObject<HTMLDivElement>;
  status:CameraStatus;error:string;demo:boolean;playback:boolean;detection:Detection|undefined;settings:Settings;
  metrics:{fps:number;inferenceMs:number;handCount:number;runtime:string};burst:number;recording:boolean;remaining:number;combo:string;
  onStart:()=>void;onDemo:()=>void;onStop:()=>void;onSetting:(key:'mirror'|'skeleton',value:boolean)=>void;onScreenshot:()=>void;onFullscreen:()=>void;
}
export function CameraPanel(p:CameraPanelProps){
  const canvasRef=useRef<HTMLCanvasElement>(null),live=p.status==='live',busy=p.status==='loading'||p.status==='permission'
  const sample=p.detection?.points??demoPoints('peace'),recognized=p.detection&&p.detection.id!=='unknown'&&p.detection.confidence>=p.settings.threshold
  useEffect(()=>{
    let raf=0
    const render=()=>{
      const canvas=canvasRef.current,video=p.videoRef.current
      if(canvas&&video){
        const width=video.videoWidth||640,height=video.videoHeight||480
        if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
        const ctx=canvas.getContext('2d')
        if(ctx){ctx.clearRect(0,0,width,height);if(p.settings.skeleton&&live)drawHands(ctx,width,height,p.frameRef.current,p.settings.heatmap)}
      }
      raf=requestAnimationFrame(render)
    }
    if(live)raf=requestAnimationFrame(render)
    return()=>cancelAnimationFrame(raf)
  },[live,p.settings.skeleton,p.settings.heatmap,p.videoRef,p.frameRef])
  return <section className={`camera-card ${recognized?'is-detecting':''}`} ref={p.stageRef} aria-label="Gesture camera"><div className="panel-heading"><span><Scan size={17}/>Live recognition</span><span className={`pill ${live?'pill-live':''}`}>{live?<><span className="tiny-dot"/>CAMERA LIVE</>:p.playback?'PLAYBACK':p.demo?'DEMO MODE':'DEMO PREVIEW'}</span></div><div className={`camera-stage ${live?'is-live':''}`}><div className="stage-grid"/><video ref={p.videoRef} playsInline muted autoPlay aria-label="Live camera feed" className={`camera-video ${p.settings.mirror?'mirrored':''} ${!live?'hidden-video':''}`}/><canvas ref={canvasRef} aria-hidden="true" className={`camera-overlay ${p.settings.mirror?'mirrored':''} ${!live?'hidden-video':''}`}/><span className="frame-corner corner-tl"/><span className="frame-corner corner-tr"/><span className="frame-corner corner-bl"/><span className="frame-corner corner-br"/>
      <div className="stage-top"><span className="stage-tag"><span className={`tiny-dot ${live?'live-dot':''}`}/>{live?`${p.metrics.handCount} ${p.metrics.handCount===1?'hand':'hands'} tracked`:p.playback?'Sequence playback':p.demo?'Simulated landmarks':'Ready when you are'}</span><span className="fps-label">{live?<><strong>{p.metrics.fps}</strong> FPS</>:<><Scan size={12}/>ON-DEVICE AI</>}</span></div>
      {!live&&!busy&&p.status!=='error'&&<><svg className={`demo-hand ${p.demo||p.playback?'demo-active':''}`} viewBox="0 0 400 400" role="img" aria-label={`${p.detection?.name??'Peace'} hand landmark illustration`}><defs><radialGradient id="palm-glow"><stop stopColor="#54e4e7" stopOpacity=".14"/><stop offset="1" stopColor="#54e4e7" stopOpacity="0"/></radialGradient></defs><circle cx="200" cy="230" r="140" fill="url(#palm-glow)" style={{stroke:'none'}}/>{p.settings.skeleton&&<>{CONNECTIONS.map(([a,b])=><line key={`${a}-${b}`} x1={sample[a].x*400} y1={sample[a].y*400} x2={sample[b].x*400} y2={sample[b].y*400}/>)}{sample.map((v,i)=><circle key={i} cx={v.x*400} cy={v.y*400} r={i===0?6:4}/>)}</>}{!p.settings.skeleton&&<text x="200" y="220" textAnchor="middle" fontSize="95">{p.detection?.id==='peace'?'✌️':'✋'}</text>}</svg><div className="preview-label"><span className="tiny-dot"/>{p.demo||p.playback?`${p.detection?.name??'Waiting'} · ${p.playback?'recorded':'simulated'} pose`:'21 landmarks · infinite possibilities'}</div>{!p.demo&&!p.playback&&<div className="camera-empty-actions"><button className="primary-button" onClick={p.onDemo}><Sparkles size={17}/>Try interactive demo</button><span>Or enable your camera to make your first move</span></div>}</>}
      {busy&&<div className="stage-message"><LoaderCircle className="spinning" size={34}/><h3>{p.status==='permission'?'Let’s meet your camera':'Warming up the AI'}</h3><p>{p.status==='permission'?'Allow camera access in your browser to get started.':'Loading the hand model securely on your device…'}</p><button className="text-button" onClick={p.onStop}>Cancel</button></div>}
      {p.status==='error'&&<div className="stage-message"><CameraOff size={32}/><h3>A small pause in the flow</h3><p role="alert">{p.error}</p><div className="inline-actions"><button className="primary-button" onClick={p.onStart}><Camera size={16}/>Try again</button><button className="secondary-button" onClick={p.onDemo}>Try demo</button></div></div>}
      {live&&p.metrics.handCount===0&&<div className="hand-guide"><Scan size={50}/><span>Bring your hand into the frame</span></div>}
      {(live||p.demo||p.playback)&&<div className="stage-bottom"><div className={`detection-chip ${recognized?'matched':''}`}><span className="tiny-dot"/>{recognized?p.detection!.name:p.detection?.id!=='unknown'&&p.detection?`${p.detection.name} · below ${p.settings.threshold}% threshold`:live&&p.metrics.handCount?'Hand tracked · adjust your pose':'Looking for your next move'}{p.detection&&p.detection.id!=='unknown'&&<strong>{p.detection.confidence}%</strong>}</div>{!p.playback&&<button className="stage-control" onClick={p.onStop} title="Stop session (Space)" aria-label="Stop session"><Pause size={16}/></button>}</div>}
      {p.recording&&<div className="recording-badge"><span/>{p.remaining.toFixed(1)}s · RECORDING</div>}
      <AnimatePresence>{p.combo&&<motion.div className="combo-toast" initial={{y:-30,opacity:0}} animate={{y:0,opacity:1}} exit={{opacity:0}}><Sparkles size={15}/>{p.combo} combo!</motion.div>}</AnimatePresence>
      <AnimatePresence>{p.burst>0&&recognized&&p.detection!.confidence>85&&<motion.div key={p.burst} className="particles" aria-hidden="true" initial={{opacity:1}} animate={{opacity:0}} transition={{duration:1.1}}>{Array.from({length:12},(_,i)=><motion.i key={i} initial={{x:0,y:0,scale:1}} animate={{x:Math.cos(i*Math.PI/6)*135,y:Math.sin(i*Math.PI/6)*110,scale:0}} transition={{duration:1,ease:'easeOut'}}/>)}</motion.div>}</AnimatePresence>
    </div><div className="camera-controls"><div className="control-group"><button className={`icon-button ${p.settings.mirror?'is-on':''}`} aria-label="Mirror camera" aria-pressed={p.settings.mirror} title="Mirror camera (M)" onClick={()=>p.onSetting('mirror',!p.settings.mirror)}><FlipHorizontal2 size={17}/></button><button className={`icon-button ${p.settings.skeleton?'is-on':''}`} aria-label="Skeleton overlay" aria-pressed={p.settings.skeleton} title="Skeleton overlay (S)" onClick={()=>p.onSetting('skeleton',!p.settings.skeleton)}><Waypoints size={18}/></button><span className="control-divider"/><span className="control-label">{live?'Live camera':p.playback?'Recorded landmarks':'Preview studio'}</span></div><div className="control-group"><button className="icon-button" aria-label="Take screenshot" title="Save pose screenshot (P)" disabled={!(live||p.demo||p.playback)} onClick={p.onScreenshot}><Camera size={17}/></button><button className="icon-button" aria-label="Full screen camera" title="Full screen (F)" onClick={p.onFullscreen}><Expand size={17}/></button></div></div><div className="camera-footer"><span><ShieldCheck size={14}/>Your camera stays yours. 100% on-device.</span><span><Video size={12}/>{live?`${p.metrics.runtime} · ${p.metrics.inferenceMs} ms inference`:'MediaPipe + TensorFlow.js'}</span></div></section>
}
export const simulatedDetection=(id:GestureId):Detection=>({id,name:({'open':'Open Hand','fist':'Fist','thumbs-up':'Thumbs Up','peace':'Peace','ok':'OK Sign','rock':'Rock Hand','point':'Point Index','palm-close':'Palm Close'} as const)[id],confidence:97,hand:'Right',points:demoPoints(id)})
