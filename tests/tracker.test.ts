import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GestureTracker } from '../src/lib/tracker'
import type { Detection } from '../src/lib/types'
const detection:Detection={id:'peace',name:'Peace',confidence:85,hand:'Right',points:[]}
test('held gesture logs only once and requires three distinct frames',()=>{
  const tracker=new GestureTracker(),frame=[detection]
  assert.deepEqual(tracker.update(frame,70,0),[])
  assert.deepEqual(tracker.update(frame,70,90),[])
  assert.deepEqual(tracker.update([detection],70,180),[])
  assert.equal(tracker.update([detection],70,270).length,1)
  for(let i=4;i<100;i++)assert.deepEqual(tracker.update([detection],70,i*90),[])
})
test('threshold rejects detections and interrupts an unstable candidate',()=>{
  const tracker=new GestureTracker()
  tracker.update([detection],70,0);tracker.update([detection],70,90)
  assert.deepEqual(tracker.update([{...detection,confidence:69}],70,180),[])
  assert.deepEqual(tracker.update([detection],70,270),[])
  assert.deepEqual(tracker.update([detection],70,360),[])
  assert.equal(tracker.update([detection],70,450).length,1)
})
test('both hands count independently and absence rearms a repeated pose',()=>{
  const tracker=new GestureTracker(),left={...detection,hand:'Left'}
  tracker.update([detection,left],70,0);tracker.update([detection,left],70,100)
  assert.equal(tracker.update([detection,left],70,200).length,2)
  tracker.update([],70,1000)
  tracker.update([detection],70,1100);tracker.update([detection],70,1200)
  assert.equal(tracker.update([detection],70,1300).length,1)
})
