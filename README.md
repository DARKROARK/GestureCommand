# GestureCommand — Task 3

GestureCommand is a separate hand-gesture computer-control project. It uses the camera-based MediaPipe/TensorFlow.js recognition engine from the earlier studio, but has its own control dashboard and desktop integration. Task 2 is not changed or required.

## Test the interface on localhost

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`. Browser mode supports live hand tracking, skeleton overlay, gesture mapping configuration, five-point calibration, custom pose capture, activity history, statistics, profile export/import, and settings. The Control center includes an interactive test workspace: click **Arm preview**, then hold a mapped gesture to move its pointer, click/select or open items, scroll the file list, switch mini windows, change volume, and toggle media playback. On the Action mappings page, each row has **Try** to execute its selected action without a camera and return to the workspace. Browsers cannot send OS-level mouse/keyboard input; the separate System control button is intentionally disabled there.

## Test real computer control

Install Python 3 and PyAutoGUI on the same machine:

```bash
python -m pip install pyautogui
npm ci
npm run desktop:dev
```

If Python uses a different command, set `GESTURECOMMAND_PYTHON` to its executable path. Start the camera and explicitly arm control. The app starts paused and pauses on camera stop, minimize, hide, input-worker failure, or after the configured no-hand timeout. The tray menu also provides Pause. PyAutoGUI's mouse-corner failsafe is enabled.

Supported desktop actions: cursor movement from an Open Hand, left/right/double click, vertical scroll, volume up/down, previous/next window, Escape, and media play/pause. One-shot actions use confirmed poses, a cooldown, and an action allowlist. Demo or replay data never send system input. Custom landmark poses may be mapped to these allowlisted actions. Camera frames are processed locally.

`npm run desktop:pack` creates a platform build in `release/`; the destination still needs Python and PyAutoGUI. The current build is not an auto-updating release.

## Current scope versus the full brief

The new interface contains the Control center, Action mappings, Calibration, Gesture library, Activity history, Statistics, and Settings. Eight static poses are currently recognized; their confidence numbers are heuristic match scores. Custom gestures are static pose descriptors, not trained motion recordings. The following requested features remain future work: swipe/rotation gestures, drag and drop, horizontal pan, long-press combos, complete keyboard/media/brightness mappings, multi-monitor pointer routing, per-app allow/deny lists, SQLite persistence, executable custom commands, PDF reports, cloud sync, automatic updates, and a bundled Python runtime. The UI does not pretend these are ready.

## Verification

```bash
npm run check
npm run build
```

The existing recognition tests cover the eight static poses, event tracking, settings persistence, and CSV safety. Camera permission and operating-system input still require manual testing on a physical device.
