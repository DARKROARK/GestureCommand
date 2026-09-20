import type { GestureEvent, Profile, Sequence, Settings } from './types'
import { DEFAULT_SETTINGS } from './types'

export function readStored<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try { const value: unknown = JSON.parse(localStorage.getItem(`gestureflow:${key}`) || 'null'); return validate(value) ? value : fallback }
  catch { return fallback }
}
export function saveStored(key: string, value: unknown): boolean {
  try { localStorage.setItem(`gestureflow:${key}`, JSON.stringify(value)); return true } catch { return false }
}
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
export function loadSettings(): Settings {
  const stored = readStored('settings', {} as Record<string, unknown>, record)
  const settings = { ...DEFAULT_SETTINGS, mappings: { ...DEFAULT_SETTINGS.mappings } }
  for (const key of ['mirror','skeleton','sound','voice','heatmap'] as const) if (typeof stored[key] === 'boolean') settings[key] = stored[key]
  if (finite(stored.threshold)) settings.threshold = Math.min(95,Math.max(20,stored.threshold))
  if (stored.theme === 'light' || stored.theme === 'dark') settings.theme = stored.theme
  if (stored.hands === 1 || stored.hands === 2) settings.hands = stored.hands
  if (stored.duration === 5 || stored.duration === 10) settings.duration = stored.duration
  if (record(stored.mappings)) for (const [key,value] of Object.entries(stored.mappings)) if (['none','screenshot','record'].includes(String(value))) settings.mappings[key] = value as Settings['mappings'][string]
  return settings
}
export const isEvent = (v: unknown): v is GestureEvent => record(v) && typeof v.id === 'string' && typeof v.gesture === 'string' && typeof v.name === 'string' && finite(v.timestamp) && finite(v.confidence) && v.confidence >= 0 && v.confidence <= 100 && typeof v.hand === 'string' && (v.source === 'camera' || v.source === 'demo')
export const loadEvents = () => readStored<GestureEvent[]>('events', [], (v): v is GestureEvent[] => Array.isArray(v) && v.length <= 5000 && v.every(isEvent))
export const loadProfiles = () => readStored<Profile[]>('profiles', [], (v): v is Profile[] => Array.isArray(v) && v.length <= 12 && v.every(p => record(p) && typeof p.id === 'string' && typeof p.name === 'string' && p.name.length <= 32 && finite(p.createdAt) && Array.isArray(p.descriptor) && p.descriptor.length === 15 && p.descriptor.every(finite)))
export const loadSequences = () => readStored<Sequence[]>('sequences', [], (v): v is Sequence[] => Array.isArray(v) && v.length <= 8 && v.every(s => record(s) && typeof s.id === 'string' && typeof s.name === 'string' && finite(s.createdAt) && finite(s.duration) && s.duration <= 11000 && (s.source === 'demo' || s.source === 'camera') && Array.isArray(s.frames) && s.frames.length <= 180 && s.frames.every(f => record(f) && finite(f.time) && Array.isArray(f.detections) && f.detections.length <= 2 && f.detections.every(d => record(d) && typeof d.id === 'string' && typeof d.name === 'string' && finite(d.confidence) && typeof d.hand === 'string' && Array.isArray(d.points) && d.points.length === 21 && d.points.every(p => record(p) && finite(p.x) && finite(p.y))))))
export function localDate(timestamp: number) { const date = new Date(timestamp); return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}` }
export function todayEvents(events: GestureEvent[], now=Date.now()) { const day=localDate(now); return events.filter(e=>localDate(e.timestamp)===day) }
export function csvExport(events: GestureEvent[]) {
  // Formula prefixes are escaped before standard CSV quoting (Excel/Sheets safety).
  const quote=(value: string | number)=> { const text=String(value); return `"${(/^[=+@\-\t\r]/.test(text)?"'":"")+text.replaceAll('"','""')}"` }
  return ['timestamp,gesture,confidence,hand,source', ...events.map(e=>[new Date(e.timestamp).toISOString(),e.name,e.confidence,e.hand,e.source].map(quote).join(','))].join('\r\n')
}
export function downloadFile(data: BlobPart, filename: string, type: string) {
  const url=URL.createObjectURL(new Blob([data],{type})), a=document.createElement('a')
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
