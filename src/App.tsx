import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ArrowRight, ArrowUpRight, Camera, Check, CircleHelp, CircleStop, Clapperboard, Download, Keyboard, LoaderCircle, Moon, Pause, Play, Plus, Scan, Settings2, ShieldCheck, Sparkles, Square, Sun, Trash2, Volume2, X } from 'lucide-react'
import { CameraPanel, simulatedDetection } from './components/CameraPanel'
import { Dashboard, type Tab } from './components/Dashboard'
import { Modal } from './components/Modal'
import { useCamera } from './hooks/useCamera'
import { GESTURES, gestureById } from './lib/gestures'
import { csvExport, downloadFile, loadEvents, loadProfiles, loadSequences, loadSettings, saveStored } from './lib/storage'
import { beep, disposeFeedback, enableAudio, speak } from './lib/feedback'
import { drawHands } from './lib/drawing'
import { GestureTracker } from './lib/tracker'
import type { Detection, Frame, GestureEvent, GestureId, Sequence, Settings } from './lib/types'

type Dialog='guide'|'sequences'|'profile'|null
const COMBOS=[{ids:['open','peace','thumbs-up'],name:'Good vibes'},{ids:['fist','open'],name:'Power up'},{ids:['rock','peace'],name:'Rock & peace'}]

export default function App(){
  const [settings,setSettings]=useState(loadSettings),[events,setEvents]=useState(loadEvents),[profiles,setProfiles]=useState(loadProfiles),[sequences,setSequences]=useState(loadSequences)
  const [demo,setDemo]=useState(false),[demoGesture,setDemoGesture]=useState<GestureId>('peace'),[demoEvents,setDemoEvents]=useState<GestureEvent[]>([])
  const [tab,setTab]=useState<Tab>('Stats'),[dialog,setDialog]=useState<Dialog>(null),[tutorialStep,setTutorialStep]=useState(0),[profileName,setProfileName]=useState('')
  const [toast,setToast]=useState(''),[combo,setCombo]=useState(''),[burst,setBurst]=useState(0),[hint,setHint]=useState(()=>{try{return localStorage.getItem('gestureflow:hint')!=='done'}catch{return true}})
  const [recording,setRecording]=useState(false),[remaining,setRemaining]=useState(0),[playback,setPlayback]=useState<Sequence|null>(null),[playing,setPlaying]=useState(false),[playhead,setPlayhead]=useState(0),[playFrame,setPlayFrame]=useState<Detection[]>([])
  const camera=useCamera(profiles),stageRef=useRef<HTMLDivElement>(null),settingsRef=useRef(settings),activeFrames=useRef<Detection[]>([])
  const recordingRef=useRef(false),recordTimer=useRef<ReturnType<typeof setInterval>|null>(null),recordStart=useRef(0),recordFrames=useRef<Frame[]>([]),recordSource=useRef<'camera'|'demo'>('camera')
  const notificationTimer=useRef<ReturnType<typeof setTimeout>|null>(null),comboTimer=useRef<ReturnType<typeof setTimeout>|null>(null),stable=useRef(new GestureTracker()),recent=useRef<GestureEvent[]>([])
  const frozenProfile=useRef<number[]>([]),mappingRef=useRef<(action:string)=>void>(()=>{}),demoSequenceIndex=useRef(0)
  settingsRef.current=settings
  const live=camera.status==='live',busy=camera.status==='permission'||camera.status==='loading',active=live||demo
  const detections=playback?playFrame:demo?[simulatedDetection(demoGesture)]:camera.detections
  activeFrames.current=playback?playFrame:demo?[simulatedDetection(demoGesture)]:camera.frameRef.current
  const detection=detections.find(d=>d.id!=='unknown')??detections[0]
  const currentEvents=demo?demoEvents:events
  const notify=useCallback((message:string)=>{setToast(message);if(notificationTimer.current)clearTimeout(notificationTimer.current);notificationTimer.current=setTimeout(()=>setToast(''),4200)},[])
  const updateSetting=useCallback(<K extends keyof Settings,>(key:K,value:Settings[K])=>setSettings(s=>({...s,[key]:value})),[])

  useEffect(()=>{document.documentElement.dataset.theme=settings.theme;document.documentElement.classList.toggle('dark',settings.theme==='dark');saveStored('settings',settings)},[settings])
  useEffect(()=>{if(!saveStored('events',events))notify('Browser storage is full. Export your session to keep a copy.')},[events,notify])
  useEffect(()=>{if(!saveStored('profiles',profiles))notify('Could not save profiles on this device.')},[profiles,notify])
  useEffect(()=>{if(!saveStored('sequences',sequences))notify('Could not save sequences. Download a copy or remove older recordings.')},[sequences,notify])
  useEffect(()=>()=>{if(recordTimer.current)clearInterval(recordTimer.current);if(notificationTimer.current)clearTimeout(notificationTimer.current);if(comboTimer.current)clearTimeout(comboTimer.current);disposeFeedback()},[])

  const finishRecording=useCallback(()=>{
    if(!recordingRef.current)return
    recordingRef.current=false;setRecording(false);setRemaining(0)
    if(recordTimer.current)clearInterval(recordTimer.current)
    const frames=recordFrames.current, duration=Math.min(Date.now()-recordStart.current,settingsRef.current.duration*1000)
    if(!frames.some(f=>f.detections.length)){notify('No hand landmarks were captured. Try again with your hand in view.');return}
    const sequence:Sequence={id:crypto.randomUUID(),name:`Flow ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`,createdAt:Date.now(),duration,source:recordSource.current,frames}
    setSequences(s=>[sequence,...s].slice(0,8));notify('Sequence saved. Your flow is ready to replay.')
  },[notify])
  const startRecording=useCallback(()=>{
    if(recordingRef.current){finishRecording();return}
    if(!active||playback){notify('Start your camera or the demo before recording a sequence.');return}
    recordingRef.current=true;setRecording(true);recordStart.current=Date.now();recordFrames.current=[];recordSource.current=demo?'demo':'camera';setRemaining(settingsRef.current.duration)
    recordTimer.current=setInterval(()=>{
      const elapsed=Date.now()-recordStart.current
      // Landmark-only recordings contain no camera image or audio; cap samples to 10 Hz.
      if(recordFrames.current.length<110)recordFrames.current.push({time:elapsed,detections:activeFrames.current.map(d=>({...d,points:d.points.map(p=>({x:Math.round(p.x*10000)/10000,y:Math.round(p.y*10000)/10000,score:p.score}))}))})
      setRemaining(Math.max(0,settingsRef.current.duration-elapsed/1000))
      if(elapsed>=settingsRef.current.duration*1000)finishRecording()
    },100)
  },[active,playback,demo,finishRecording,notify])
  const stopSession=useCallback(()=>{finishRecording();setDemo(false);camera.stop();stable.current.clear();recent.current=[]},[camera.stop,finishRecording])
  const startCamera=()=>{stopSession();setPlayback(null);setPlaying(false);if(settings.sound)void enableAudio();void camera.start(settings.hands)}
  const beginDemo=useCallback((id:GestureId='peace')=>{
    finishRecording();camera.stop();setPlayback(null);setPlaying(false);setDemoGesture(id);setDemo(true);stable.current.clear();recent.current=[];demoSequenceIndex.current=GESTURES.findIndex(g=>g.id===id);if(settingsRef.current.sound)void enableAudio()
  },[camera.stop,finishRecording])
  useEffect(()=>{
    if(!demo)return
    const timer=setInterval(()=>{demoSequenceIndex.current=(demoSequenceIndex.current+1)%GESTURES.length;setDemoGesture(GESTURES[demoSequenceIndex.current].id)},3200)
    return()=>clearInterval(timer)
  },[demo])
  useEffect(()=>{
    if(!demo&&!live)return
    const tick=()=>{
      const now=Date.now(),frames=demo?[simulatedDetection(demoGesture)]:camera.frameRef.current
      for(const d of stable.current.update(frames,settingsRef.current.threshold,now)){
        const event:GestureEvent={id:crypto.randomUUID(),gesture:d.id,name:d.name,confidence:d.confidence,timestamp:now,hand:d.hand,source:demo?'demo':'camera'}
        if(demo)setDemoEvents(list=>[...list,event].slice(-500));else setEvents(list=>[...list,event].slice(-5000))
        setBurst(v=>v+1)
        if(settingsRef.current.sound)beep();if(settingsRef.current.voice)speak(d.name)
        recent.current=[...recent.current.filter(e=>now-e.timestamp<6000),event].slice(-8)
        const sameHand=recent.current.filter(e=>e.hand===d.hand&&e.source===event.source)
        const match=COMBOS.find(c=>c.ids.every((id,i)=>sameHand.slice(-c.ids.length)[i]?.gesture===id))
        if(match){setCombo(match.name);if(comboTimer.current)clearTimeout(comboTimer.current);comboTimer.current=setTimeout(()=>setCombo(''),3000)}
        if(!demo)mappingRef.current(settingsRef.current.mappings[d.id]??'none')
      }
    }
    const timer=setInterval(tick,85);return()=>clearInterval(timer)
  },[demo,demoGesture,live,camera.frameRef])

  const screenshot=useCallback(()=>{
    const frames=activeFrames.current,video=camera.videoRef.current
    if(!active&&!playback){notify('Start a session to capture a pose.');return}
    const canvas=document.createElement('canvas');canvas.width=live?(video?.videoWidth||640):800;canvas.height=live?(video?.videoHeight||480):600
    const ctx=canvas.getContext('2d');if(!ctx)return
    ctx.fillStyle='#0b1722';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save()
    if(live&&settingsRef.current.mirror){ctx.translate(canvas.width,0);ctx.scale(-1,1)}
    if(live&&video)ctx.drawImage(video,0,0,canvas.width,canvas.height)
    if(settingsRef.current.skeleton)drawHands(ctx,canvas.width,canvas.height,frames,settingsRef.current.heatmap)
    ctx.restore();ctx.fillStyle='#0b1118cc';ctx.fillRect(0,canvas.height-48,canvas.width,48);ctx.fillStyle='#bdf7f3';ctx.font='16px sans-serif';ctx.fillText(`GestureFlow · ${frames[0]?.name??'Pose'}${demo?' · Demo':playback?' · Playback':''}`,20,canvas.height-19)
    canvas.toBlob(blob=>{if(blob){downloadFile(blob,`gestureflow-pose-${Date.now()}.png`,'image/png');notify('Pose screenshot saved.')}},'image/png')
  },[active,playback,live,demo,camera.videoRef,notify])
  mappingRef.current=action=>{if(action==='screenshot')screenshot();if(action==='record'&&!recordingRef.current)startRecording()}
  const fullscreen=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(stageRef.current?.requestFullscreen)await stageRef.current.requestFullscreen();else notify('Full screen is unavailable in this browser. Rotate your device for a wider view.')}
    catch{notify('Full screen was blocked by your browser. Open the app directly and try again.')}
  }
  const toggleAudio=async()=>{if(settings.sound){updateSetting('sound',false);return}if(await enableAudio()){updateSetting('sound',true);beep()}else notify('Audio notifications are unavailable in this browser.')}
  const exportEvents=(type:'json'|'csv')=>{
    const name=`gestureflow-${demo?'demo':'camera'}-${new Date().toISOString().slice(0,10)}`
    downloadFile(type==='json'?JSON.stringify({version:1,exportedAt:new Date().toISOString(),source:demo?'demo':'camera',events:currentEvents},null,2):csvExport(currentEvents),`${name}.${type}`,type==='json'?'application/json':'text/csv;charset=utf-8')
    notify(`${type.toUpperCase()} export saved.`)
  }
  const clearHistory=()=>{if(demo)setDemoEvents([]);else setEvents([]);recent.current=[];notify(`${demo?'Demo':'Camera'} history cleared.`)}
  const openProfile=()=>{
    if(camera.descriptorRef.current.length!==15){notify('Hold a hand in view before capturing a profile.');return}
    frozenProfile.current=[...camera.descriptorRef.current];setProfileName('');setDialog('profile')
  }
  const saveProfile=()=>{
    const name=profileName.trim()
    if(!name)return
    if(profiles.some(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase())){notify('A profile with that name already exists.');return}
    setProfiles(s=>[...s,{id:`custom-${crypto.randomUUID()}`,name,descriptor:frozenProfile.current,createdAt:Date.now()}]);setDialog(null);notify(`“${name}” is now in your gesture library.`)
  }
  const openPlayback=(sequence:Sequence)=>{stopSession();setPlayback(sequence);setPlayhead(0);setPlayFrame(sequence.frames[0]?.detections??[]);setPlaying(true);setDialog(null)}
  useEffect(()=>{
    if(!playing||!playback)return
    let raf=0;const start=performance.now()-playhead
    const tick=()=>{const elapsed=Math.min(performance.now()-start,playback.duration);setPlayhead(elapsed);setPlayFrame([...playback.frames].reverse().find(f=>f.time<=elapsed)?.detections??playback.frames[0]?.detections??[]);if(elapsed>=playback.duration)setPlaying(false);else raf=requestAnimationFrame(tick)}
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)
    // playhead is read only when playback resumes; restarting on every frame would reset the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,playback])
  const seek=(time:number)=>{setPlaying(false);setPlayhead(time);setPlayFrame([...(playback?.frames??[])].reverse().find(f=>f.time<=time)?.detections??[])}
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.altKey||e.ctrlKey||e.metaKey||dialog||(e.target instanceof HTMLElement&&['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(e.target.tagName)))return
      if(e.code==='Space'){e.preventDefault();if(active||busy)stopSession();else beginDemo()}
      else if(e.key.toLowerCase()==='s')updateSetting('skeleton',!settingsRef.current.skeleton)
      else if(e.key.toLowerCase()==='m')updateSetting('mirror',!settingsRef.current.mirror)
      else if(e.key.toLowerCase()==='r')startRecording()
      else if(e.key.toLowerCase()==='p')screenshot()
      else if(e.key.toLowerCase()==='f')void fullscreen()
      else if(e.key==='?')setDialog('guide')
    }
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)
  })
  const recentSequence=sequences[0]
  return <div className="app-shell"><a className="skip-link" href="#playground">Skip to playground</a><header className="topbar"><a className="brand" href="/" aria-label="GestureFlow home"><span className="brand-mark"><Activity size={25}/></span>Gesture<span>Flow</span><span className="brand-badge">STUDIO</span></a><nav aria-label="Main navigation"><button className={!dialog?'nav-active':''} onClick={()=>{setDialog(null);document.getElementById('playground')?.scrollIntoView({behavior:'smooth'})}}>Playground</button><button className={dialog==='sequences'?'nav-active':''} onClick={()=>setDialog('sequences')}>Sequences{sequences.length>0&&<span className="nav-count">{sequences.length}</span>}</button></nav><div className="header-actions"><button className="icon-button" aria-label="Toggle theme" title="Toggle light/dark theme" onClick={()=>updateSetting('theme',settings.theme==='dark'?'light':'dark')}>{settings.theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button><button className="icon-button" aria-label="Open guide" title="Quick guide (?)" onClick={()=>{setTutorialStep(0);setDialog('guide')}}><CircleHelp size={19}/></button><span className="header-separator"/><span className="local-badge"><ShieldCheck size={14}/>Local & private</span></div></header>
    <main id="playground"><section className="page-heading"><div><span className="eyebrow"><span className="tiny-dot"/>YOUR HANDS, IN CONTROL</span><h1>Gesture playground<span>.</span></h1><p>A little movement. A whole new way to interact.</p></div><div className="heading-actions"><button className="text-button guide-button" onClick={()=>setDialog('guide')}><Play size={13}/>Quick guide</button><button className={`primary-button ${live||busy?'stop-button':''}`} onClick={live||busy?stopSession:startCamera}>{busy?<LoaderCircle className="spinning" size={17}/>:live?<CircleStop size={17}/>:<Camera size={17}/>}<span>{busy?'Cancel camera':live?'Stop camera':'Enable camera'}</span>{!live&&!busy&&<ArrowUpRight size={16}/>}</button></div></section>
    {demo&&<div className="demo-notice"><span><Sparkles size={14}/><strong>You’re in demo mode.</strong> Try a gesture below, or let the demo play.</span><button className="text-button" onClick={startCamera}>Try with your camera<ArrowRight size={13}/></button></div>}
    <div className="workspace"><CameraPanel videoRef={camera.videoRef} frameRef={camera.frameRef} stageRef={stageRef} status={camera.status} error={camera.error} demo={demo} playback={!!playback} detection={detection} settings={settings} metrics={camera.metrics} burst={burst} recording={recording} remaining={remaining} combo={combo} onStart={startCamera} onDemo={()=>beginDemo()} onStop={stopSession} onSetting={updateSetting} onScreenshot={screenshot} onFullscreen={()=>void fullscreen()}/><Dashboard tab={tab} setTab={setTab} events={currentEvents} detection={detection} active={active||!!playback} demo={demo||playback?.source==='demo'} settings={settings} onSetting={updateSetting} onClear={clearHistory} onExport={exportEvents} profiles={profiles} onProfile={openProfile} onDeleteProfile={id=>{setProfiles(s=>s.filter(p=>p.id!==id));notify('Gesture profile removed.')}} onHands={v=>{updateSetting('hands',v);if(live){finishRecording();void camera.start(v)}}} onAudio={()=>void toggleAudio()} handCount={detections.length}/></div>
    {playback&&<div className="playback-bar"><button className="icon-button" aria-label={playing?'Pause playback':'Play sequence'} onClick={()=>{if(playhead>=playback.duration)setPlayhead(0);setPlaying(!playing)}}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><div><strong>{playback.name}</strong><span>{playback.source==='demo'?'Demo sequence':'Landmark sequence'}</span></div><input type="range" aria-label="Playback position" min="0" max={playback.duration} value={playhead} onChange={e=>seek(Number(e.target.value))}/><span>{(playhead/1000).toFixed(1)} / {(playback.duration/1000).toFixed(1)}s</span><button className="icon-button" aria-label="Close playback" onClick={()=>{setPlayback(null);setPlaying(false)}}><X size={17}/></button></div>}
    {hint&&!active&&!playback&&<div className="first-hint"><span><Sparkles size={14}/><strong>New here?</strong> Explore without a camera. Click any gesture below to try it.</span><button className="icon-button" aria-label="Dismiss tip" onClick={()=>{setHint(false);try{localStorage.setItem('gestureflow:hint','done')}catch{/* Device storage may be disabled. */}}}><X size={14}/></button></div>}
    <section className="gesture-library" aria-label="Gesture library"><div className="section-heading"><h2>A language at your fingertips</h2><span>8 gestures to explore <span className="small-divider">/</span> <button className="text-button" onClick={()=>{setTab('Legend');document.querySelector('.dashboard')?.scrollIntoView({behavior:'smooth',block:'nearest'})}}>View guide<ArrowUpRight size={12}/></button></span></div><div className="gesture-grid">{GESTURES.map((g,i)=><button className={`gesture-tile ${detection?.id===g.id?'selected':''}`} key={g.id} onClick={()=>{if(demo){setDemoGesture(g.id);demoSequenceIndex.current=i;stable.current.clear()}else beginDemo(g.id)}} title={g.description} aria-label={`Try ${g.name} demo`} aria-pressed={demo&&demoGesture===g.id} style={{'--gesture-color':g.color} as React.CSSProperties}><span className="gesture-number">0{i+1}</span><span className="gesture-emoji">{g.emoji}</span><span>{g.short}</span><small>{demo&&demoGesture===g.id?<><span className="tiny-dot"/>Recognizing</>:<>Try gesture<ArrowUpRight size={10}/></>}</small></button>)}</div></section>
    <section className="sequence-strip" aria-label="Sequence recorder"><div className="sequence-icon"><Clapperboard size={22}/></div><div className="sequence-intro"><h2>Catch a little flow.</h2><p>Record a sequence. Replay your moves.</p></div><div className="sequence-summary">{recording?<><span className="record-dot"/>Recording {remaining.toFixed(1)}s remaining</>:recentSequence?<button className="text-button" onClick={()=>openPlayback(recentSequence)}><Play size={13}/>Replay latest<span>{(recentSequence.duration/1000).toFixed(0)}s</span></button>:<><span className="sequence-mini-bars">▂▅▃▇▅▂</span><span>Your next sequence goes here</span></>}</div><div className="record-actions"><select aria-label="Recording duration" value={settings.duration} disabled={recording} onChange={e=>updateSetting('duration',Number(e.target.value) as 5|10)}><option value="5">5 sec</option><option value="10">10 sec</option></select><button className={`secondary-button record-button ${recording?'recording':''}`} onClick={startRecording} disabled={!active||!!playback} title={!active?'Start the camera or demo first':'Record landmarks (R)'}>{recording?<Square size={12}/>:<span className="record-dot"/>}{recording?'Stop & save':'Record sequence'}</button></div></section>
    <div className="bottom-tools"><div><button className="text-button" onClick={clearHistory} disabled={!currentEvents.length}><Trash2 size={13}/>Clear history</button><button className="text-button" onClick={()=>updateSetting('theme',settings.theme==='dark'?'light':'dark')}>{settings.theme==='dark'?<Sun size={14}/>:<Moon size={14}/>}<span>{settings.theme==='dark'?'Light':'Dark'} theme</span></button><button className={`text-button ${settings.sound?'accent-text':''}`} onClick={()=>void toggleAudio()} aria-pressed={settings.sound}><Volume2 size={14}/><span>Sound {settings.sound?'on':'off'}</span></button></div><button className="text-button" onClick={()=>{setDialog('guide');setTutorialStep(2)}}><Keyboard size={14}/><span>Keyboard shortcuts</span></button></div>
    </main><footer className="site-footer"><span><span className="tiny-dot"/>Built for the way you move.</span><span>Private by design. Playful by nature.<span className="footer-version">v1.0</span></span></footer>
    <div className="sr-only" role="status" aria-live="polite">{detection&&detection.id!=='unknown'?`${detection.name}, ${detection.confidence}% confidence`:''}</div><AnimatePresence>{toast&&<motion.div className="toast" role="status" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}><Check size={16}/><span>{toast}</span><button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={15}/></button></motion.div>}</AnimatePresence>
    {dialog==='guide'&&<Modal title="Find your flow" onClose={()=>setDialog(null)}><div className="tutorial-steps">{['Get ready','Make a move','Make it yours'].map((title,i)=><button key={title} className={tutorialStep===i?'active':''} onClick={()=>setTutorialStep(i)}><span>{i+1}</span>{title}</button>)}</div><div className="tutorial-content">{tutorialStep===0?<><div className="tutorial-symbol"><Camera size={38}/></div><h3>Just you, your hand, and your browser.</h3><p>Enable your camera and allow access when prompted. Keep your hand about an arm’s length away, in good lighting, with the full palm in view.</p><div className="tutorial-callout"><ShieldCheck size={21}/><p>Camera frames are processed on your device. Recordings save hand landmarks only — no video, no audio, no upload.</p></div><button className="secondary-button" onClick={()=>{setDialog(null);beginDemo()}}><Sparkles size={15}/>Explore the demo first</button></>:tutorialStep===1?<><div className="tutorial-gestures">✋<ArrowRight/>✌️<ArrowRight/>👍</div><h3>Hold a pose. See what happens.</h3><p>Choose one of the eight gestures below the camera. Hold it briefly to log a detection. Move to a new pose, or remove your hand before repeating the same pose.</p><div className="tutorial-callout"><Sparkles size={20}/><p>Try Open Hand → Peace → Thumbs Up within six seconds to unlock the Good vibes combo.</p></div><p className="muted-note">Palm Close is a relaxed claw with all four fingers gently bent. A tightly closed hand is a Fist. Confidence is an estimated geometric match; experiment with the threshold in Settings.</p></>:<><div className="tutorial-symbol"><Settings2 size={36}/></div><h3>A playground that works your way.</h3><p>Record 5 or 10 seconds of landmarks, save custom pose profiles, and export your detections from History. Camera history and settings stay on this browser.</p><div className="shortcut-grid">{[['Space','Start demo / stop session'],['R','Record / finish sequence'],['S','Toggle skeleton'],['M','Mirror camera'],['P','Save screenshot'],['F','Full screen'],['?','Open this guide']].map(([key,label])=><div key={key}><kbd>{key}</kbd><span>{label}</span></div>)}</div><p className="muted-note">Shortcuts pause while you type or use a dialog. Turn on two-hand tracking in Settings; one hand offers better performance.</p></>}</div><div className="modal-footer"><span>0{tutorialStep+1} / 03</span><button className="primary-button" onClick={()=>tutorialStep<2?setTutorialStep(tutorialStep+1):setDialog(null)}>{tutorialStep<2?'Next':'Let’s play'}<ArrowRight size={15}/></button></div></Modal>}
    {dialog==='sequences'&&<Modal title="Your sequences" onClose={()=>setDialog(null)} wide><div className="modal-intro"><p>A little movement, saved for later.</p><span>{sequences.length} / 8 saved</span></div>{!sequences.length?<div className="sequence-empty"><Clapperboard size={42}/><h3>Every flow starts with a first move.</h3><p>Start the camera or demo, then record a 5 or 10 second sequence. Your hand landmarks will appear here, ready to replay.</p><button className="primary-button" onClick={()=>{setDialog(null);beginDemo()}}><Sparkles size={16}/>Start a demo</button></div>:<div className="sequence-list">{sequences.map(s=><div className="sequence-item" key={s.id}><button className="sequence-play" aria-label={`Play ${s.name}`} onClick={()=>openPlayback(s)}><Play size={18}/></button><div><h3>{s.name}<span>{s.source}</span></h3><p>{new Date(s.createdAt).toLocaleDateString()} · {(s.duration/1000).toFixed(1)} seconds · {s.frames.length} frames</p><div className="sequence-pose-list">{[...new Set(s.frames.flatMap(f=>f.detections.map(d=>d.id)))].slice(0,8).map(id=><span key={id} title={gestureById(id)?.name??id}>{gestureById(id)?.emoji??'🖐️'}</span>)}</div></div><div className="sequence-item-actions"><button className="icon-button" aria-label={`Download ${s.name}`} title="Download landmark data" onClick={()=>downloadFile(JSON.stringify(s),`gestureflow-sequence-${s.id}.json`,'application/json')}><Download size={17}/></button><button className="icon-button" aria-label={`Delete ${s.name}`} title="Delete sequence" onClick={()=>{setSequences(list=>list.filter(v=>v.id!==s.id));if(playback?.id===s.id){setPlayback(null);setPlaying(false)}notify('Sequence removed.')}}><Trash2 size={16}/></button></div></div>)}</div>}<div className="modal-bottom-note"><ShieldCheck size={14}/>Stored on this device. The latest 8 recordings are kept. Download your favorites.</div></Modal>}
    {dialog==='profile'&&<Modal title="Name your gesture" onClose={()=>setDialog(null)}><form className="profile-form" onSubmit={e=>{e.preventDefault();saveProfile()}}><div className="tutorial-symbol"><Scan size={34}/></div><p>Your current hand pose has been captured. Give it a memorable name to recognize it next time.</p><label htmlFor="profile-name">Gesture name</label><input id="profile-name" value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder="e.g. My signature move" maxLength={32} required autoComplete="off"/><span className="muted-note">Profiles compare finger shape and spacing. They work best with distinct poses and a similar viewing angle.</span><button className="primary-button full-width" type="submit" disabled={!profileName.trim()}><Plus size={15}/>Save gesture profile</button></form></Modal>}
  </div>
}
