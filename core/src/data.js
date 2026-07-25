import { db, studentsOfClass } from './db.js'
import { now as appNow, isWeekend, isDemoLive } from './clock.js'
import { schoolDayNumbers } from './locales.js'
import { STATUS } from './tokens.js'
import { subjectHue } from './subjects.js'
// Les icônes sont NOMMÉES, pas importées : le web les résout dans `lucide-react`,
// Android dans `lucide-react-native`. Le cœur ne connaît aucune des deux.
// Niveaux : la couleur n'est jamais le seul indice — chaque niveau porte une icône
// et son libellé (indispensable, la séparation tritan de cette échelle est au plancher).
export const BUCKETS=[
  {key:"excellent",label:"Excellent",color:STATUS.ok,soft:STATUS.okSoft,icon:"Star"},
  {key:"good",label:"Bien",color:STATUS.info,soft:STATUS.infoSoft,icon:"ThumbsUp"},
  {key:"average",label:"Moyen",color:STATUS.warn,soft:STATUS.warnSoft,icon:"Minus"},
  {key:"weak",label:"Insuffisant",color:STATUS.danger,soft:STATUS.dangerSoft,icon:"TriangleAlert"},
]
export const QUESTIONS=[
  {id:"q1",text:"Participation en classe aujourd'hui"},
  {id:"q2",text:"Compréhension de la leçon"},
  {id:"q3",text:"Comportement & discipline"},
  {id:"q4",text:"Devoirs & préparation"},
  {id:"q5",text:"Performance générale du jour"},
]
export const BADGES=[
  {key:"star",label:"Élève du jour",icon:"Star"},{key:"improved",label:"Plus grand progrès",icon:"TrendingUp"},
  {key:"team",label:"Esprit d'équipe",icon:"Handshake"},{key:"idea",label:"Bonne idée",icon:"Lightbulb"},{key:"focus",label:"Très concentré",icon:"Target"},
]
// Les séances de l'enseignant, identiques du lundi au vendredi.
// (Auparavant chaque ligne portait `day:1` mais personne ne lisait ce champ :
//  l'emploi du temps du lundi s'affichait même le dimanche.)
export const SCHEDULE=[
  {start:"08:00",end:"10:00",classId:"c5a",subject:"Mathématiques",room:"Salle 12"},
  {start:"10:15",end:"12:00",classId:"c6a",subject:"Mathématiques",room:"Salle 12"},
  {start:"13:00",end:"14:00",classId:"c9a",subject:"Mathématiques",room:"Salle 8"},
  {start:"14:15",end:"15:45",classId:"l2s",subject:"Mathématiques",room:"Salle 21"},
]
const hydrate = s => ({...s, cls: db().classes.find(c=>c.id===s.classId)||{}, students: studentsOfClass(s.classId)})

// Jour de classe ? (week-end exclu, sauf en mode démo)
export const isSchoolDay = (d=appNow()) => isDemoLive() || !isWeekend(d)

// La séance en cours, ou null s'il n'y en a pas (hors horaires, week-end).
// Ne retombe plus silencieusement sur SCHEDULE[0] : l'appelant doit choisir.
export function currentClass(now=appNow()){
  if(!isSchoolDay(now)) return null
  const hhmm=now.toTimeString().slice(0,5)
  const slot=SCHEDULE.find(s=>hhmm>=s.start&&hhmm<s.end)
  if(!slot) return null
  return {slot, isLive:true, ...hydrate(slot)}
}
export function classForSlot(slot){ return {slot, isLive:false, ...hydrate(slot)} }
export function teacherSchedule(now=appNow()){
  const school=isSchoolDay(now); const hhmm=now.toTimeString().slice(0,5)
  return SCHEDULE.map(s=>({...s, ...hydrate(s), isLive: school && hhmm>=s.start && hhmm<s.end}))
}

// ─────────────── EMPLOI DU TEMPS (weekly timetable) ───────────────
// B-2 (audit 2026-07-25) : les 5 jours d'école suivent le PAYS — lun–ven en
// Tunisie, dim–jeu au Golfe. La grille stockée reste 5 colonnes : la colonne 0
// est le PREMIER jour d'école du pays, quel qu'il soit. Le Proxy garde la
// compatibilité : DAYS.map / DAYS[i] / DAYS.length marchent comme avant, mais
// lisent la semaine du pack actif (même astuce que LEGAL dans tunisia.js).
const DAY_NAMES=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
const dayLabels=()=>schoolDayNumbers().slice(0,5).map(d=>DAY_NAMES[d])
export const DAYS=new Proxy([],{ get:(_,k)=>{ const a=dayLabels(); const v=a[k]; return typeof v==='function'?v.bind(a):v } })
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
    return {subject:teacher.subject||'Cours',color:subjectHue(teacher.subject||'Cours'),room:ROOMS[h32(cid+di+pi)%ROOMS.length],className:cls?.name||cid}
  })}))
}
