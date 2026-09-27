export type DesktopAction = 'none' | 'left-click' | 'right-click' | 'double-click' | 'scroll-up' | 'scroll-down' | 'volume-up' | 'volume-down' | 'next-window' | 'previous-window' | 'escape' | 'play-pause'
export type DesktopStatus = { armed: boolean; ready: boolean; error: string }
export type DesktopAPI = {
  status(): Promise<DesktopStatus>
  arm(value: boolean): Promise<DesktopStatus>
  action(action: DesktopAction): Promise<boolean>
  move(x: number, y: number): Promise<boolean>
  onStatus(callback: (status: DesktopStatus) => void): () => void
}
declare global { interface Window { gestureDesktop?: DesktopAPI } }
export const DEFAULT_ACTIONS: Record<string, DesktopAction> = {
  'open': 'none', 'fist': 'none', 'thumbs-up': 'left-click', 'peace': 'double-click',
  'ok': 'scroll-up', 'rock': 'next-window', 'point': 'none', 'palm-close': 'right-click'
}
export function loadActions(): Record<string, DesktopAction> {
  try { return { ...DEFAULT_ACTIONS, ...JSON.parse(localStorage.getItem('gesturecommand:actions') || '{}') } }
  catch { return { ...DEFAULT_ACTIONS } }
}
