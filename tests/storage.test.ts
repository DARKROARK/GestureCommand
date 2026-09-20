import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { csvExport, isEvent, loadEvents, loadProfiles, loadSequences, loadSettings, saveStored, todayEvents } from '../src/lib/storage'
import { DEFAULT_SETTINGS, type GestureEvent } from '../src/lib/types'

const memory=new Map<string,string>()
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v)},configurable:true})
beforeEach(()=>memory.clear())
const event:GestureEvent={id:'test',gesture:'peace',name:'Peace',confidence:94,timestamp:Date.now(),hand:'Right',source:'camera'}
test('gesture events round-trip through persistence',()=>{saveStored('events',[event]);assert.deepEqual(loadEvents(),[event])})
test('corrupt and out-of-range history is rejected',()=>{
  memory.set('gestureflow:events','not json');assert.deepEqual(loadEvents(),[])
  saveStored('events',[{...event,confidence:150}]);assert.deepEqual(loadEvents(),[])
  assert.equal(isEvent({...event,timestamp:NaN}),false)
})
test('settings validate and do not mutate default mappings',()=>{
  saveStored('settings',{threshold:140,hands:2,theme:'invalid',mappings:{peace:'record',fist:'invalid'}})
  const loaded=loadSettings();assert.equal(loaded.threshold,95);assert.equal(loaded.hands,2);assert.equal(loaded.theme,'dark');assert.equal(loaded.mappings.peace,'record');assert.deepEqual(DEFAULT_SETTINGS.mappings,{})
})
test('CSV quotes delimiters, newlines, quotes, and formula prefixes',()=>{
  const text=csvExport([{...event,name:'=SUM(1,2)"\n'}]);assert.ok(text.includes('"\'=SUM(1,2)""\n"'));assert.ok(text.startsWith('timestamp,gesture,confidence,hand,source\r\n'));assert.ok(text.includes(new Date(event.timestamp).toISOString()))
})
test('today is based on local calendar date',()=>{
  const now=new Date(2026,8,19,12).getTime(),today={...event,timestamp:new Date(2026,8,19,0,1).getTime()},yesterday={...event,timestamp:new Date(2026,8,18,23,59).getTime()}
  assert.deepEqual(todayEvents([today,yesterday],now),[today])
})
test('corrupt profile and recording data does not reach the renderer',()=>{
  saveStored('profiles',[{id:'a',name:'test',descriptor:[1],createdAt:0}]);assert.deepEqual(loadProfiles(),[])
  saveStored('sequences',[{id:'a',name:'test',createdAt:0,duration:5000,source:'demo',frames:[{time:1,detections:[{points:[]}]}]}]);assert.deepEqual(loadSequences(),[])
})
