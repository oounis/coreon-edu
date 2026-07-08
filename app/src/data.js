import { db, studentsOfClass } from './db.js'
import { Star, ThumbsUp, Minus, TriangleAlert, TrendingUp, Handshake, Lightbulb, Target } from 'lucide-react'
export const BUCKETS=[
  {key:"excellent",label:"Excellent",color:"#10B981",soft:"#E2FBF3",Icon:Star},
  {key:"good",label:"Bien",color:"#0BA5D8",soft:"#E4F7FE",Icon:ThumbsUp},
  {key:"average",label:"Moyen",color:"#E59A12",soft:"#FFF4DD",Icon:Minus},
  {key:"weak",label:"Insuffisant",color:"#EF4444",soft:"#FFE8EC",Icon:TriangleAlert},
]
export const QUESTIONS=[
  {id:"q1",text:"Participation en classe aujourd'hui"},
  {id:"q2",text:"Compréhension de la leçon"},
  {id:"q3",text:"Comportement & discipline"},
  {id:"q4",text:"Devoirs & préparation"},
  {id:"q5",text:"Performance générale du jour"},
]
export const BADGES=[
  {key:"star",label:"Élève du jour",Icon:Star},{key:"improved",label:"Plus grand progrès",Icon:TrendingUp},
  {key:"team",label:"Esprit d'équipe",Icon:Handshake},{key:"idea",label:"Bonne idée",Icon:Lightbulb},{key:"focus",label:"Très concentré",Icon:Target},
]
export const SCHEDULE=[
  {day:1,start:"08:00",end:"10:00",classId:"c5a",subject:"Mathématiques",room:"Salle 12"},
  {day:1,start:"10:15",end:"12:00",classId:"c6a",subject:"Mathématiques",room:"Salle 12"},
  {day:1,start:"13:00",end:"14:00",classId:"c9a",subject:"Mathématiques",room:"Salle 8"},
  {day:1,start:"14:15",end:"15:45",classId:"l2s",subject:"Mathématiques",room:"Salle 21"},
]
export function currentClass(now){const hhmm=now.toTimeString().slice(0,5);const slot=SCHEDULE.find(s=>hhmm>=s.start&&hhmm<=s.end)||SCHEDULE[0];const cls=db().classes.find(c=>c.id===slot.classId);return{slot,isLive:hhmm>=slot.start&&hhmm<=slot.end,cls,students:studentsOfClass(slot.classId)}}
export function teacherSchedule(now=new Date()){const hhmm=now.toTimeString().slice(0,5);return SCHEDULE.map(s=>{const cls=db().classes.find(c=>c.id===s.classId)||{};return{...s,cls,students:studentsOfClass(s.classId),isLive:hhmm>=s.start&&hhmm<=s.end}})}

// ─────────────── EMPLOI DU TEMPS (weekly timetable) ───────────────
export const DAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi']
export const PERIODS=[['08:00','09:00'],['09:00','10:00'],['10:15','11:15'],['11:15','12:15'],['13:00','14:00'],['14:00','15:00']]
const ROOMS=['Salle 12','Salle 8','Salle 21','Labo','Gymnase','Salle Info']
function h32(str){let h=0;for(const c of String(str))h=(h*31+c.charCodeAt(0))>>>0;return h}
// reads the editable timetable stored in the db (Direction can modify it)
export function timetableFor(classId){
  const g=db().timetables?.[classId]||[]
  return PERIODS.map(([s,e],pi)=>({start:s,end:e,cells:(g[pi]||DAYS.map(()=>null)).slice(0,5)}))
}
// a teacher's own weekly grid: only the periods where they teach one of their classes
export function teacherTimetable(teacher){
  const classes=teacher?.classes||[]
  return PERIODS.map(([s,e],pi)=>({start:s,end:e,cells:DAYS.map((_,di)=>{
    const cid=classes[h32('t'+di+pi)%Math.max(classes.length,1)]
    if(!cid||((di===2||di===4)&&pi>=4)||h32(cid+di+pi+'x')%3===0) return null
    const cls=db().classes.find(c=>c.id===cid)
    return {subject:teacher.subject||'Cours',color:'#6C5CE7',room:ROOMS[h32(cid+di+pi)%ROOMS.length],className:cls?.name||cid}
  })}))
}
