export type Task = { id: string; title: string; course: string; due: string; time: string; priority: 'High' | 'Medium' | 'Low'; done: boolean; color: string }
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
// Future adapters belong on a trusted server. Never put provider secrets or tokens in this client.
export interface DataProvider<T> { fetch(): Promise<T> }
export type SyncState = { status:'idle'|'loading'|'error'|'ready'; lastSynced?:string; message?:string }
export const integrations = { googleCalendar:{ connected:false }, canvas:{ connected:false }, ai:{ connected:false } }
