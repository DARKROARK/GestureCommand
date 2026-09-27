import { GESTURES } from '../lib/gestures'
import { type DesktopAction, type DesktopStatus } from '../lib/desktop'

const actions: DesktopAction[] = ['none', 'left-click', 'right-click', 'double-click', 'scroll-up', 'scroll-down', 'volume-up', 'volume-down', 'next-window', 'previous-window', 'escape', 'play-pause']
export function DesktopControl({ status, live, mappings, onMapping, onArm }: {
  status: DesktopStatus; live: boolean; mappings: Record<string, DesktopAction>;
  onMapping: (gesture: string, action: DesktopAction) => void; onArm: (value: boolean) => void
}) {
  return <section className="desktop-control" aria-label="Computer control">
    <div><span className="eyebrow">GESTURECOMMAND · DESKTOP CONTROL</span><h2>Move beyond the camera.</h2><p>Live camera gestures can control this computer. Demo and recordings never send input.</p></div>
    <div className="desktop-arm"><strong className={status.armed ? 'armed' : ''}>{status.armed ? '● Armed' : '○ Paused'}</strong><button className={status.armed ? 'secondary-button' : 'primary-button'} disabled={!status.ready || (!live && !status.armed)} onClick={() => onArm(!status.armed)}>{status.armed ? 'Pause control' : 'Arm system control'}</button></div>
    {status.error && <p className="desktop-error" role="alert">{status.error}</p>}
    <p className="desktop-note">Open Hand moves the pointer while armed. Fist freezes it. Keep the camera on and use Pause or the tray menu to stop instantly. Move the pointer to a screen corner for PyAutoGUI’s emergency failsafe.</p>
    <div className="desktop-mappings">{GESTURES.map(g => <label key={g.id}><span>{g.emoji} {g.name}</span><select aria-label={`${g.name} action`} value={mappings[g.id] ?? 'none'} onChange={e => onMapping(g.id, e.target.value as DesktopAction)}>{actions.map(action => <option key={action} value={action}>{action === 'none' ? 'No action' : action.replaceAll('-', ' ')}</option>)}</select></label>)}</div>
  </section>
}
