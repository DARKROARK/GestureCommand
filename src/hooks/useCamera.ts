import { useCallback, useEffect, useRef, useState } from 'react'
import type { HandDetector } from '@tensorflow-models/hand-pose-detection'
import { classifyRobust, describePose } from '../lib/classifier'
import type { Detection, Point, Profile } from '../lib/types'

export type CameraStatus = 'idle' | 'permission' | 'loading' | 'live' | 'error'
export function cameraError(error: unknown): string {
  const name=error instanceof Error?error.name:''
  if(name==='NotAllowedError'||name==='SecurityError')return 'Camera access was blocked. Allow camera access in your browser’s site settings, then try again.'
  if(name==='NotFoundError'||name==='DevicesNotFoundError')return 'No camera was found. Connect a camera or try the interactive demo.'
  if(name==='NotReadableError'||name==='TrackStartError')return 'Your camera is being used by another app. Close it there and try again.'
  return error instanceof Error?error.message:'The camera could not start. Try again or use the demo.'
}
export function useCamera(profiles: Profile[]) {
  const videoRef=useRef<HTMLVideoElement>(null),frameRef=useRef<Detection[]>([]),descriptorRef=useRef<number[]>([])
  const streamRef=useRef<MediaStream|null>(null),detectorRef=useRef<HandDetector|null>(null),inferenceRef=useRef<Promise<unknown>|null>(null)
  const generation=useRef(0),rafRef=useRef(0),mounted=useRef(true),profilesRef=useRef(profiles)
  profilesRef.current=profiles
  const [status,setStatus]=useState<CameraStatus>('idle'),[error,setError]=useState(''),[detections,setDetections]=useState<Detection[]>([])
  const [metrics,setMetrics]=useState({fps:0,inferenceMs:0,handCount:0,runtime:'MediaPipe'})
  const stop=useCallback(()=>{
    generation.current++;cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null
    if(videoRef.current)videoRef.current.srcObject=null
    const detector=detectorRef.current;detectorRef.current=null
    // GPU resources must outlive the currently running inference.
    if(detector) { if(inferenceRef.current)void inferenceRef.current.catch(()=>{}).finally(()=>detector.dispose());else detector.dispose() }
    frameRef.current=[];descriptorRef.current=[]
    if(mounted.current){setStatus('idle');setDetections([]);setMetrics({fps:0,inferenceMs:0,handCount:0,runtime:'MediaPipe'})}
  },[])
  const start=useCallback(async(maxHands:1|2=1)=>{
    stop();const run=generation.current;setError('');setStatus('permission')
    let pendingDetector:HandDetector|null=null
    try {
      if(!window.isSecureContext)throw new Error('Camera access requires HTTPS or localhost. Open GestureFlow using a secure address.')
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access is unavailable in this browser. Open GestureFlow in a current Chrome, Edge, Firefox, or Safari browser.')
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:60,max:60}}})
      if(run!==generation.current){stream.getTracks().forEach(t=>t.stop());return}
      streamRef.current=stream
      const video=videoRef.current
      if(!video)throw new Error('The video preview is unavailable. Please reload the page.')
      video.srcObject=stream;await video.play()
      if(run!==generation.current)return
      setStatus('loading')
      const handPose=await import('@tensorflow-models/hand-pose-detection')
      if(run!==generation.current)return
      let runtime:'MediaPipe'|'TensorFlow.js'='MediaPipe'
      try {
        // The MediaPipe WASM lite graph is faster on devices where TFJS WebGL falls back
        // to software rendering. Its assets are served from our own origin.
        pendingDetector=await handPose.createDetector(handPose.SupportedModels.MediaPipeHands,{runtime:'mediapipe',modelType:'lite',maxHands,solutionPath:'/mediapipe'})
      } catch (mediaPipeError) {
        if(run!==generation.current)return
        console.warn('MediaPipe initialization failed; using TensorFlow.js',mediaPipeError)
        runtime='TensorFlow.js'
        const tf=await import('@tensorflow/tfjs-core')
        await import('@tensorflow/tfjs-backend-webgl')
        if(!await tf.setBackend('webgl'))throw new Error('Hand tracking could not start. Enable browser hardware acceleration or try another browser.')
        await tf.ready()
        pendingDetector=await handPose.createDetector(handPose.SupportedModels.MediaPipeHands,{runtime:'tfjs',modelType:'lite',maxHands,detectorModelUrl:'/models/detector/model.json',landmarkModelUrl:'/models/landmark/model.json'})
      }
      if(run!==generation.current){pendingDetector.dispose();return}
      const detector=pendingDetector;detectorRef.current=detector
      // Downsample only the inference input, keeping the full-resolution preview.
      // On the supplied camera frame this reduced warm inference from ~340 ms
      // to 21–31 ms while preserving the Open Hand landmarks.
      const input=document.createElement('canvas')
      const scale=Math.min(320/video.videoWidth,320/video.videoHeight)
      input.width=Math.max(160,Math.round(video.videoWidth*scale))
      input.height=Math.max(160,Math.round(video.videoHeight*scale))
      const inputContext=input.getContext('2d',{alpha:false})
      if(!inputContext)throw new Error('Canvas processing is unavailable in this browser.')
      inputContext.drawImage(video,0,0,input.width,input.height)
      const warmup=detector.estimateHands(input,{flipHorizontal:false,staticImageMode:false})
      inferenceRef.current=warmup
      await warmup
      if(run!==generation.current)return
      inferenceRef.current=null;setStatus('live')
      let lastVideoTime=-1,frames=0,metricAt=performance.now(),uiAt=0,totalInference=0,failures=0
      const tick=async()=>{
        if(run!==generation.current)return
        if(document.hidden||video.readyState<2||video.currentTime===lastVideoTime){rafRef.current=requestAnimationFrame(()=>void tick());return}
        lastVideoTime=video.currentTime
        try{
          inputContext.drawImage(video,0,0,input.width,input.height)
          const begin=performance.now(),pending=detector.estimateHands(input,{flipHorizontal:false,staticImageMode:false})
          inferenceRef.current=pending
          const hands=await pending
          if(run!==generation.current)return
          inferenceRef.current=null;failures=0
          totalInference+=performance.now()-begin;frames++
          const results=hands.map(hand=>{
            const pixels=hand.keypoints as Point[],geometry=(hand.keypoints3D??pixels) as Point[]
            // MediaPipe score describes handedness certainty, not pose confidence.
            const result=classifyRobust(geometry,pixels,profilesRef.current,runtime==='MediaPipe'?1:hand.score??1)
            const normalized=pixels.map(p=>({x:p.x/input.width,y:p.y/input.height,score:typeof p.score==='number'&&p.score>0?p.score:1}))
            return {...(result??{id:'unknown',name:'Unrecognized',confidence:0}),hand:hand.handedness??'Hand',points:normalized}
          })
          frameRef.current=results;descriptorRef.current=hands[0]?describePose((hands[0].keypoints3D??hands[0].keypoints) as Point[]):[]
          const now=performance.now()
          if(now-uiAt>80){setDetections(results);uiAt=now}
          if(now-metricAt>=1000){setMetrics({fps:Math.round(frames*1000/(now-metricAt)),inferenceMs:Math.round(totalInference/frames),handCount:hands.length,runtime});frames=0;totalInference=0;metricAt=now}
        }catch(e){
          if(run!==generation.current)return
          failures++
          if(failures>=3){stop();setStatus('error');setError(cameraError(e));return}
        }
        if(run===generation.current)rafRef.current=requestAnimationFrame(()=>void tick())
      }
      stream.getVideoTracks()[0]?.addEventListener('ended',()=>{if(run===generation.current){stop();setStatus('error');setError('The camera was disconnected. Reconnect it and enable the camera again.')}},{once:true})
      rafRef.current=requestAnimationFrame(()=>void tick())
    }catch(e){
      if(run!==generation.current){pendingDetector?.dispose();return}
      stop();setStatus('error');setError(cameraError(e))
    }
  },[stop])
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop()}},[stop])
  return {videoRef,frameRef,descriptorRef,status,error,detections,metrics,start,stop}
}
