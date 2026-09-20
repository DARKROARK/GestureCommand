import type { Gesture, GestureId, Point } from './types'
export const GESTURES: Gesture[] = [
  { id: 'open', name: 'Open Hand', short: 'Open hand', emoji: '✋', description: 'Spread all five fingers with your palm toward the camera.', color: '#56ded7' },
  { id: 'fist', name: 'Fist', short: 'Fist', emoji: '✊', description: 'Curl all fingers tightly into your palm.', color: '#a693f1' },
  { id: 'thumbs-up', name: 'Thumbs Up', short: 'Thumbs up', emoji: '👍', description: 'Point your thumb upward and keep your fingers curled.', color: '#f4c378' },
  { id: 'peace', name: 'Peace', short: 'Peace', emoji: '✌️', description: 'Extend your index and middle fingers into a V.', color: '#54e4e7' },
  { id: 'ok', name: 'OK Sign', short: 'OK sign', emoji: '👌', description: 'Touch your index fingertip to your thumb; extend the other fingers.', color: '#9fafff' },
  { id: 'rock', name: 'Rock Hand', short: 'Rock on', emoji: '🤘', description: 'Extend your index and pinky; curl the two middle fingers.', color: '#ee97be' },
  { id: 'point', name: 'Point Index', short: 'Point', emoji: '☝️', description: 'Extend just your index finger.', color: '#90d796' },
  { id: 'palm-close', name: 'Palm Close', short: 'Palm close', emoji: '🤏', description: 'Face your palm forward and gently bend all four fingers into a relaxed claw.', color: '#eca68c' },
]
export const CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]]
export const gestureById = (id: string) => GESTURES.find(g => g.id === id)

/** Demo landmarks are an illustration, never input to the live classifier. */
export function demoPoints(id: GestureId): Point[] {
  const base = [[.5,.86],[.39,.72],[.29,.62],[.22,.49],[.16,.40],[.40,.56],[.36,.37],[.33,.22],[.30,.09],[.50,.53],[.52,.32],[.54,.17],[.57,.055],[.59,.57],[.64,.40],[.68,.28],[.71,.18],[.68,.65],[.76,.52],[.81,.43],[.86,.36]].map(([x,y])=>({x,y,z:0}))
  const extended = id === 'open' ? [1,2,3,4] : id === 'peace' ? [1,2] : id === 'rock' ? [1,4] : id === 'point' ? [1] : id === 'ok' ? [2,3,4] : []
  for (let finger=1;finger<=4;finger++) {
    if (!extended.includes(finger)) {
      const start=finger*4+1, root=base[start], bend=id==='palm-close'?.07:.14
      base[start+1]={x:root.x-.005,y:root.y-.11,z:0}
      base[start+2]={x:root.x+.025,y:root.y-.03,z:0}
      base[start+3]={x:root.x+.018,y:root.y+bend,z:0}
    }
  }
  if (id !== 'open' && id !== 'thumbs-up') { base[3]={x:.39,y:.65,z:0}; base[4]={x:.48,y:.63,z:0} }
  if(id==='thumbs-up') { base[2]={x:.30,y:.59,z:0};base[3]={x:.29,y:.40,z:0};base[4]={x:.30,y:.25,z:0} }
  if(id==='ok'){base[3]={x:.30,y:.48,z:0};base[4]={x:.34,y:.40,z:0};base[7]={x:.31,y:.35,z:0};base[8]={x:.34,y:.41,z:0}}
  return base
}
