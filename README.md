# GestureFlow

GestureFlow is a browser-only hand-gesture studio built with React 18, strict TypeScript, Tailwind CSS, Framer Motion, TensorFlow.js, and MediaPipe Hands. It recognizes eight built-in poses, provides a live skeleton and confidence estimate, records landmark-only sequences, and keeps settings and history locally in the browser. There is no backend, account, API key, or cloud inference.

## Run locally

Requires Node.js 18 or newer and a modern browser with camera access on `localhost` or HTTPS.

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`. Click **Enable camera** and grant permission. The first camera start loads the local MediaPipe model and warms up the runtime. Click **Try interactive demo** to explore every control without a camera. Select a gesture tile to simulate that pose. The demo is explicitly marked and kept separate from your real-camera history.

If a camera session was already running while you updated the project, stop it and refresh the page before enabling the camera again. To use a phone, host over HTTPS; a plain LAN `http://` URL cannot request a camera.

## Build and deploy

```bash
npm run check
npm run build
```

Connect this repository to Vercel. Vercel uses the included `vercel.json` to run `npm run build` and publish `dist/`. No environment variables or server functions are required. The service worker and manifest make it installable and cache app/model assets after use. Keep HTTPS enabled for cameras.

The MediaPipe WASM lite runtime is bundled into `public/mediapipe/` from the installed `@mediapipe/hands` peer package by the `prebuild` script. If MediaPipe cannot initialize, TensorFlow.js/WebGL uses the two local models in `public/models/`. To refresh the fallback models from TensorFlow Hub, run `npm run models:download`. Both runtime paths process images on-device. The fallback model files and runtime assets must accompany `index.html`.

## The studio

- Live: start/stop camera, mirror preview, show landmarks, see measured FPS/inference time, use full screen, and save a pose screenshot. The processing frame is scaled to a maximum of 320 pixels on its long side while the camera preview keeps its full resolution.
- Eight poses: Open Hand, Fist, Thumbs Up, Peace, OK Sign, Rock Hand, Point Index, and Palm Close. Three consecutive **distinct inferred frames** above the adjustable threshold confirm a pose. A held pose logs once; changing poses or removing the hand allows a new event.
- Dashboard: today's count, confidence average, frequency and recent timeline, last-ten history with local timestamps, legend, threshold and privacy settings. Export events in JSON or formula-safe CSV. History and profiles persist locally; simulated events belong only to the current demo session.
- Advanced: detect two hands when enabled, recognize three documented gesture combos, capture custom pose profiles from live landmarks, record 5/10-second landmark-only sequences, replay and download them, optionally map Peace or Thumbs Up to a screenshot/recording action, and enable sound or browser speech.
- Accessibility: keyboard controls, tab navigation, accessible labels and feedback, focus-managed dialogs, responsive layouts and reduced-motion support. Press `?` for a tutorial and shortcut list.

## Recognition and limits

MediaPipe provides 21 landmarks; a geometric classifier estimates pose match from finger joint bends, normalized spacing, a pinch, and thumb direction. The displayed confidence is an **estimated match**, not a calibrated probability. Palm Close is particularly close to a hand moving between Open and Fist. Hold a clear pose with all fingers visible and adjust the threshold if a pose is tentative. Models are loaded only when the camera starts.

The frame from the reported detection issue was tested locally: the revised MediaPipe path tracked one hand and classified **Open Hand, 100% match**. On that same image, warm inference at 320 × 240 measured 21–31 ms in the test browser; an initial warm-up frame took longer. Real camera FPS depends on the device, browser, video format, and lighting. See [validation notes](docs/VALIDATION.md) for checks that still require a physical device.

## Project files

`src/hooks/useCamera.ts` manages camera permissions, model initialization, downsampled inference, teardown, and measurements. `src/lib/classifier.ts` classifies poses; `src/lib/tracker.ts` stabilizes events. `src/components/` contains the camera stage, dashboard, and accessible dialogs. `src/lib/storage.ts` validates local data and exports CSV. `tests/` has synthetic classifier, persistence, and event-state tests. Public PWA assets and local model files live under `public/`.

Run `npm audit` for dependency status. The source and MediaPipe runtime are covered by their own upstream licenses; see `public/models/NOTICE.md`.
