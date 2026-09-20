# Validation notes

## Verified in this workspace

- `npm run check` passes strict TypeScript and 22 targeted automated tests. Each built-in gesture is exercised on 12 synthetic scale/translation/mirror variants. Tests also cover partial bend separation, invalid landmarks, profile priority, threshold interruptions, multi-hand event tracking, persistence and CSV escaping.
- `npm run build` produces a static bundle without a server. Local model asset requests are served from the same origin.
- Interactive demo, recording, sequence playback, tab navigation, theme switching, slider keyboard interaction, and mobile overflow were exercised in the browser.
- The screenshot supplied with the hand-detection report was analyzed with the shipped model in a temporary local diagnostic page. The MediaPipe detector found one hand; the revised classifier returned Open Hand with an estimated 100% match. The diagnostic page is not part of this repository. The screenshot is excluded from Git and the production build.
- In the diagnostic browser, repeated inference on that frame at 320 × 240 took 21, 31 and 22 ms after a warm-up call. Previous processing at about 568 × 425 took about 340 ms after initialization. These measurements are device/browser-specific and do not prove a 30/60 FPS sustained webcam rate.

## Physical camera acceptance still needed

Use Chrome, Edge, Firefox and Safari on representative desktop/mobile devices over HTTPS or localhost. For each of the eight gestures, collect at least ten independent detections under varied lighting, angle, scale and hand; calibrate geometric thresholds against misses and false positives. Check that a held pose logs once, a removed hand rearms, threshold changes take effect, and two-hand mode labels both hands. Inspect the skeleton alignment with mirror on/off. The displayed FPS and inference time help identify hardware bottlenecks; capture performance and memory for 30+ minutes to assess sustained FPS, <100 ms latency, and leaks. Also test permission denial/recovery and front-facing mobile cameras. Lighthouse, cross-browser, CPU and memory targets require those actual deployments/devices.

The fallback TensorFlow.js path is available if the MediaPipe WASM runtime fails, though it can be much slower on software WebGL implementations. The camera footer identifies which runtime is active. Test both paths only when relevant; do not assume a high model score means a gesture has been recognized.
