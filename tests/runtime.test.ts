import assert from 'node:assert/strict'
import test from 'node:test'
import { applyRuntimeAction, INITIAL_RUNTIME, moveRuntimePointer } from '../src/lib/runtime'

test('clicks and window controls change the runtime workspace',()=>{
  const clicked=applyRuntimeAction(INITIAL_RUNTIME,'left-click')
  assert.equal(clicked.clicks,1)
  assert.equal(applyRuntimeAction(clicked,'next-window').window,1)
  assert.equal(applyRuntimeAction(clicked,'previous-window').window,2)
})
test('volume and scroll stay within their visible bounds',()=>{
  let state=INITIAL_RUNTIME
  for(let n=0;n<20;n++)state=applyRuntimeAction(state,'volume-up')
  assert.equal(state.volume,100)
  for(let n=0;n<20;n++)state=applyRuntimeAction(state,'scroll-down')
  assert.equal(state.scroll,5)
})
test('escape closes menus and movement clamps coordinates',()=>{
  const open=applyRuntimeAction(INITIAL_RUNTIME,'right-click')
  assert.equal(open.contextOpen,true)
  assert.equal(applyRuntimeAction(open,'escape').contextOpen,false)
  assert.deepEqual(moveRuntimePointer(INITIAL_RUNTIME,3,-2).cursor,{x:1,y:0})
})
