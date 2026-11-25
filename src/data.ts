export type Task = { id: string; title: string; course: string; due: string; time: string; priority: 'High' | 'Medium' | 'Low'; done: boolean; color: string; dueAt?: string; source?: 'canvas' | 'local'; status?: string; url?: string }
const initialTasks: Task[] = [
  { id:'canvas:3759:78215', title:'Prueba - el presente perfecto', course:'SPANISH IV-PF-ENRÍQUEZ-544-2', due:'Nov 24', time:'10:00 AM', dueAt:'2026-11-24T10:00:00-05:00', priority:'High', done:false, color:'orange', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3759/assignments/78215' },
  { id:'canvas:3759:78216', title:'Tarea - VHL', course:'SPANISH IV-PF-ENRÍQUEZ-544-2', due:'Nov 24', time:'10:00 AM', dueAt:'2026-11-24T10:00:00-05:00', priority:'High', done:false, color:'orange', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3759/assignments/78216' },
  { id:'canvas:3888:78191', title:'HW 3.4 Graphing', course:'ALGEBRA IIA 2026-27', due:'Nov 24', time:'5:00 PM', dueAt:'2026-11-24T17:00:00-05:00', priority:'High', done:false, color:'blue', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3888/assignments/78191' },
  { id:'canvas:3799:77934', title:'HW: Isotopes and Average Atomic Mass', course:'CHEMISTRY I 2026-2027', due:'Nov 30', time:'8:00 AM', dueAt:'2026-11-30T08:00:00-05:00', priority:'Medium', done:false, color:'green', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3799/assignments/77934' },
  { id:'canvas:3888:78271', title:'HW 4.1 Simplifying rationals', course:'ALGEBRA IIA 2026-27', due:'Nov 30', time:'12:00 PM', dueAt:'2026-11-30T12:00:00-05:00', priority:'Medium', done:false, color:'blue', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3888/assignments/78271' },
  { id:'canvas:3630:78283', title:'HW #13: Finishing Calculator Methods', course:'COMPUTER SCIENCE II-PC-LEMA-894-1', due:'Dec 1', time:'11:50 AM', dueAt:'2026-12-01T11:50:00-05:00', priority:'Medium', done:false, color:'violet', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3630/assignments/78283' },
  { id:'canvas:3819:70195', title:'Printmaking: SPICES project', course:'2D ART: INTRO TO 2D DESIGN-PD-PASCA-223-1', due:'Dec 11', time:'8:00 AM', dueAt:'2026-12-11T08:00:00-05:00', priority:'Low', done:false, color:'pink', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3819/assignments/70195' },
  { id:'canvas:3819:70196', title:'Printmaking Project Reflection', course:'2D ART: INTRO TO 2D DESIGN-PD-PASCA-223-1', due:'Dec 11', time:'8:00 AM', dueAt:'2026-12-11T08:00:00-05:00', priority:'Low', done:false, color:'pink', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3819/assignments/70196' },
  { id:'canvas:3728:68563', title:'Short article excerpt reading, with query responses; Biblical justifications for TAST. Optional notes and reflection. Query responses are narrative!!', course:'WORLD HISTORY-PA-KALAJIAN-440-5', due:'Dec 11', time:'3:00 PM', dueAt:'2026-12-11T15:00:00-05:00', priority:'Low', done:false, color:'orange', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3728/assignments/68563' },
  { id:'canvas:3819:70197', title:'Masterpiece Reduction Drawings', course:'2D ART: INTRO TO 2D DESIGN-PD-PASCA-223-1', due:'Dec 17', time:'8:00 AM', dueAt:'2026-12-17T08:00:00-05:00', priority:'Low', done:false, color:'pink', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3819/assignments/70197' },
  { id:'canvas:3728:68502', title:'Group Project #1: The Future of AI, research and group debates', course:'WORLD HISTORY-PA-KALAJIAN-440-5', due:'Dec 17', time:'3:00 PM', dueAt:'2026-12-17T15:00:00-05:00', priority:'Low', done:false, color:'orange', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3728/assignments/68502' },
  { id:'canvas:3819:70198', title:'Masterpiece Reduction Painting', course:'2D ART: INTRO TO 2D DESIGN-PD-PASCA-223-1', due:'Jan 6', time:'8:00 AM', dueAt:'2027-01-06T08:00:00-05:00', priority:'Low', done:false, color:'pink', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3819/assignments/70198' },
  { id:'canvas:3819:69854', title:'Final Semester Reflection', course:'2D ART: INTRO TO 2D DESIGN-PD-PASCA-223-1', due:'Jan 14', time:'8:00 AM', dueAt:'2027-01-14T08:00:00-05:00', priority:'Low', done:false, color:'pink', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3819/assignments/69854' },
  { id:'canvas:3819:70199', title:'Final Painting Assignment :CHOICE', course:'2D ART: INTRO TO 2D DESIGN-PD-PASCA-223-1', due:'Jan 21', time:'8:00 AM', dueAt:'2027-01-21T08:00:00-05:00', priority:'Low', done:false, color:'pink', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3819/assignments/70199' },
  { id:'canvas:3819:70200', title:'Final Painting Unit Reflection Artifact', course:'2D ART: INTRO TO 2D DESIGN-PD-PASCA-223-1', due:'Jan 22', time:'8:00 AM', dueAt:'2027-01-22T08:00:00-05:00', priority:'Low', done:false, color:'pink', source:'canvas', status:'upcoming', url:'https://friendsseminary.instructure.com/courses/3819/assignments/70200' },
]
const KEY='james-os-tasks-v1'
const oldSampleIds=new Set(['t1','t2','t3','t4','t5'])
export function readTasks(): Task[] {
  try {
    const value=localStorage.getItem(KEY)
    if(!value)return initialTasks
    const stored=JSON.parse(value) as Task[]
    if(!Array.isArray(stored))return initialTasks
    const savedById=new Map(stored.map(task=>[task.id,task]))
    const imported=initialTasks.map(task=>({...savedById.get(task.id),...task,done:savedById.get(task.id)?.done??task.done}))
    const extra=stored.filter(task=>!oldSampleIds.has(task.id)&&!initialTasks.some(seed=>seed.id===task.id))
    return [...imported,...extra]
  } catch { return initialTasks }
}
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
