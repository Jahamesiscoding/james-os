export type Task = { id: string; title: string; course: string; due: string; time: string; priority: 'High' | 'Medium' | 'Low'; done: boolean; color: string; dueAt?: string; source?: 'canvas' | 'local'; status?: string; url?: string }
const initialTasks: Task[] = [
  { id:'t1', title:'Research paper: literature review', course:'PSYCHOLOGY 204', due:'Today', time:'11:59 PM', priority:'High', done:false, color:'violet' },
  { id:'t2', title:'Problem set 06 — integrals', course:'CALCULUS II', due:'Tomorrow', time:'9:00 AM', priority:'High', done:false, color:'blue' },
  { id:'t3', title:'Read chapter 8 & notes', course:'WORLD HISTORY', due:'Nov 18', time:'2:30 PM', priority:'Medium', done:false, color:'orange' },
  { id:'t4', title:'Studio critique: moodboard', course:'DESIGN STUDIO', due:'Nov 20', time:'4:00 PM', priority:'Medium', done:false, color:'pink' },
  { id:'t5', title:'Quiz 4: cellular biology', course:'BIOLOGY 110', due:'Nov 21', time:'11:00 AM', priority:'Low', done:false, color:'green' },
]
const KEY='james-os-tasks-v1'
export function readTasks(): Task[] { try { const value=localStorage.getItem(KEY); return value ? JSON.parse(value) as Task[] : initialTasks } catch { return initialTasks } }
export function saveTasks(tasks: Task[]) { try { localStorage.setItem(KEY,JSON.stringify(tasks)) } catch { /* Local storage may be disabled; session still works. */ } }
// Provider credentials and tokens stay on the local integration server, never in this client.
export interface DataProvider<T> { fetch(): Promise<T> }
export type SyncState = { status:'idle'|'loading'|'error'|'ready'; lastSynced?:string; message?:string }
export type ProviderState = { configured:boolean; connected:boolean; lastSynced:string|null }
export type IntegrationStatus = { googleCalendar:ProviderState; gmail:ProviderState; canvas:ProviderState; mode?:string }
export const emptyIntegrations: IntegrationStatus = {
  googleCalendar:{configured:false,connected:false,lastSynced:null},
  gmail:{configured:false,connected:false,lastSynced:null},
  canvas:{configured:false,connected:false,lastSynced:null},
}
export async function getIntegrationStatus():Promise<IntegrationStatus> {
  const response=await fetch('/api/integrations/status')
  if(!response.ok) throw new Error('Start the JAMES OS integration server to connect accounts.')
  return response.json() as Promise<IntegrationStatus>
}
export type CalendarEvent = { id:string; title:string; start:string; end:string; location:string; calendar:string; source:'google'; status:'fixed'|'tentative'|'suggested' }
export type SchoolMessage = {id:string;subject:string;from:string;receivedAt:string;snippet:string;status:'replied'|'possible-reply'|'review';url:string}
export type SyncedData = { tasks:Array<{id:string;title:string;course:string;due:string;url?:string;status:string;done:boolean}>; events:CalendarEvent[]; messages:SchoolMessage[]; syncedAt:string; providers:IntegrationStatus }
export async function fetchConnectedData():Promise<SyncedData> {
  const response=await fetch('/api/data')
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||'Could not sync connected accounts.')}
  return response.json() as Promise<SyncedData>
}
