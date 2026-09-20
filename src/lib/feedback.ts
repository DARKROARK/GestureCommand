let audio: AudioContext | null = null
export async function enableAudio() {
  try { audio??=new AudioContext(); if(audio.state==='suspended')await audio.resume(); return true }catch{return false}
}
export function beep() {
  if(!audio||audio.state!=='running')return
  const tone=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime
  tone.type='sine';tone.frequency.setValueAtTime(660,now);tone.frequency.exponentialRampToValueAtTime(990,now+.09)
  gain.gain.setValueAtTime(.035,now);gain.gain.exponentialRampToValueAtTime(.001,now+.15)
  tone.connect(gain);gain.connect(audio.destination);tone.start(now);tone.stop(now+.16)
  tone.onended=()=>{tone.disconnect();gain.disconnect()}
}
export function speak(name:string) { if('speechSynthesis' in window){window.speechSynthesis.cancel();window.speechSynthesis.speak(new SpeechSynthesisUtterance(name))} }
export function disposeFeedback(){if(audio){void audio.close();audio=null}if('speechSynthesis'in window)window.speechSynthesis.cancel()}
