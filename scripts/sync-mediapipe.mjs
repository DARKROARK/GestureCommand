import { copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Ship the official MediaPipe WASM and lite graph with the static frontend.
// It is kept local so inference needs no remote model host after deployment.
const source=fileURLToPath(new URL('../node_modules/@mediapipe/hands/',import.meta.url))
const destination=fileURLToPath(new URL('../public/mediapipe/',import.meta.url))
await mkdir(destination,{recursive:true})
const files=[
  'hand_landmark_lite.tflite',
  'hands_solution_packed_assets_loader.js',
  'hands_solution_packed_assets.data',
  'hands_solution_simd_wasm_bin.data',
  'hands_solution_simd_wasm_bin.js',
  'hands_solution_simd_wasm_bin.wasm',
  'hands_solution_wasm_bin.js',
  'hands_solution_wasm_bin.wasm',
  'hands.binarypb',
]
for(const name of files)await copyFile(join(source,name),join(destination,name))
console.log(`Bundled ${files.length} MediaPipe runtime assets.`)
