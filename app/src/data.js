// evaluation constants + schedule (students/classes now live in db.js)
import { db, studentsOfClass } from './db.js'
export const BUCKETS = [
  { key:"excellent", label:"Excellent", color:"#2BD9A8", soft:"#E2FBF3", emoji:"🌟" },
  { key:"good",      label:"Good",      color:"#36C5F0", soft:"#E4F7FE", emoji:"👍" },
  { key:"average",   label:"Average",   color:"#FFA62B", soft:"#FFF1DD", emoji:"➖" },
  { key:"weak",      label:"Needs work",color:"#FF6B81", soft:"#FFE8EC", emoji:"📌" },
]
export const QUESTIONS = [
  { id:"q1", text:"Participation in class today" },
  { id:"q2", text:"Understanding of the lesson" },
  { id:"q3", text:"Behaviour & discipline" },
  { id:"q4", text:"Homework & preparation" },
  { id:"q5", text:"Overall performance today" },
]
export const BADGES = [
  { key:"star",label:"Star of the day",emoji:"⭐" },{ key:"improved",label:"Most improved",emoji:"📈" },
  { key:"team",label:"Team player",emoji:"🤝" },{ key:"idea",label:"Bright idea",emoji:"💡" },{ key:"focus",label:"Super focused",emoji:"🎯" },
]
export const SCHEDULE = [
  { day:1, start:"08:00", end:"10:00", classId:"c7a", subject:"Mathematics" },
  { day:1, start:"10:15", end:"12:00", classId:"c8b", subject:"Mathematics" },
]
export function studentColor(id){
  const pal=["#36C5F0","#8B5CF6","#FF6B81","#FFA62B","#2BD9A8","#6C5CE7","#0BA5D8","#14B8A6"]
  let h=0; for(const c of String(id)) h=(h*31+c.charCodeAt(0))>>>0; return pal[h%pal.length]
}
export function currentClass(now){
  const hhmm = now.toTimeString().slice(0,5)
  const slot = SCHEDULE.find(s=>hhmm>=s.start && hhmm<=s.end) || SCHEDULE[0]
  const cls = db().classes.find(c=>c.id===slot.classId)
  return { slot, isLive: hhmm>=slot.start&&hhmm<=slot.end, cls, students: studentsOfClass(slot.classId) }
}
