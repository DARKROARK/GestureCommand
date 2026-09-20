import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

// Use the stable TFHub URL, not its expiring signed redirect. Models execute locally.
const root = fileURLToPath(new URL('../public/models/', import.meta.url))
for (const model of ['detector', 'landmark']) {
  const directory = join(root, model)
  await mkdir(directory, { recursive: true })
  const base = `https://tfhub.dev/mediapipe/tfjs-model/handpose_3d/${model}/lite/1/`
  const get = async file => {
    const response = await fetch(`${base}${file}?tfjs-format=file`, { signal: AbortSignal.timeout(120000) })
    if (!response.ok) throw new Error(`Model download failed: ${model}/${file} (${response.status})`)
    return response
  }
  const manifest = await (await get('model.json')).json()
  if (!manifest.modelTopology || !manifest.weightsManifest) throw new Error(`Invalid ${model} manifest`)
  await writeFile(join(directory, 'model.json'), JSON.stringify(manifest))
  for (const file of manifest.weightsManifest.flatMap(group => group.paths)) {
    if (file.includes('..') || file.includes('/')) throw new Error('Unexpected model asset path')
    const data = Buffer.from(await (await get(file)).arrayBuffer())
    if (data.length < 1000) throw new Error(`Invalid weights: ${model}/${file}`)
    await writeFile(join(directory, file), data)
    console.log(`Saved ${model}/${file}: ${(data.length / 1024 / 1024).toFixed(2)} MB`)
  }
}
