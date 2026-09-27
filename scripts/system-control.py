"""Minimal JSON-lines input bridge. No shell commands or arbitrary key combinations."""
import json
import sys

try:
    import pyautogui as gui
    gui.FAILSAFE = True  # Move the cursor to a screen corner to abort.
    gui.PAUSE = 0
    print(json.dumps({"ready": True}), flush=True)
except Exception as exc:
    print(json.dumps({"error": f"Install the desktop input dependency: python -m pip install pyautogui ({exc})"}), flush=True)
    sys.exit(1)

ACTIONS = {
    "left-click": lambda: gui.click(),
    "right-click": lambda: gui.click(button="right"),
    "double-click": lambda: gui.doubleClick(interval=0.12),
    "scroll-up": lambda: gui.scroll(3),
    "scroll-down": lambda: gui.scroll(-3),
    "volume-up": lambda: gui.press("volumeup"),
    "volume-down": lambda: gui.press("volumedown"),
    "next-window": lambda: gui.hotkey("alt", "tab"),
    "previous-window": lambda: gui.hotkey("alt", "shift", "tab"),
    "escape": lambda: gui.press("esc"),
    "play-pause": lambda: gui.press("playpause"),
}
for line in sys.stdin:
    try:
        message = json.loads(line)
        if message.get("type") == "move":
            gui.moveTo(int(message["x"]), int(message["y"]), duration=0)
        elif message.get("type") == "action" and message.get("action") in ACTIONS:
            ACTIONS[message["action"]]()
    except gui.FailSafeException:
        print(json.dumps({"error": "Mouse failsafe activated. Restart the app to re-arm."}), flush=True)
        break
    except Exception as exc:
        print(json.dumps({"error": f"System input failed: {exc}"}), flush=True)
        break
