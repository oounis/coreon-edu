// Shared "where is the child right now" logic — used by Suivi en direct (Live.jsx)
// and the parent dashboard live widget.
import { PERIODS, timetableFor } from './data.js'
import { isDemoLive, now as appNow, isWeekend, dayIndex, SCHOOL_OPEN, SCHOOL_CLOSE } from './clock.js'
import { BRAND, SERIES, STATUS, N } from './tokens.js'

// Chemin des photos d'ambiance : la base d'assets est injectée par la
// plateforme (le web pose import.meta.env.BASE_URL dans main.jsx — Metro ne
// supporte pas `import.meta`, le cœur ne doit donc jamais y toucher).
let assetBase = '/'
export const setAssetBase = b => { assetBase = b || '/' }
export const room = n => `${assetBase}rooms/${n}.jpg`
export const AREAS = {
  // Les lieux sont des MARQUES (pastille, liseré) : palette canonique, ordre fixe.
  class:      { label:'Salle de classe',   color:BRAND.indigo,  img:'class' },
  infirmerie: { label:'Infirmerie',         color:STATUS.danger, img:'infirmerie' },
  cour:       { label:'Cour de récréation', color:SERIES[5],     img:'cour' },
  cantine:    { label:'Cantine',            color:SERIES[4],     img:'cantine' },
  entree:     { label:'Entrée / Sortie',    color:N.slate,       img:'entree' },
}
export const KIND_AREA = { class:'class', cour:'cour', cantine:'cantine', free:'class' }

export const toMin = hhmm => { const [h,m]=hhmm.split(':').map(Number); return h*60+m }
export const fmt = min => `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`

export function daySegments(classId, dayIdx){
  const tt=timetableFor(classId); const segs=[]
  PERIODS.forEach(([s,e],pi)=>{
    const cell=tt[pi].cells[dayIdx]
    segs.push({start:toMin(s),end:toMin(e),kind:cell?'class':'free',cell})
    if(pi===1) segs.push({start:toMin('10:00'),end:toMin('10:15'),kind:'cour'})
    if(pi===3) segs.push({start:toMin('12:15'),end:toMin('13:00'),kind:'cantine'})
  })
  return segs.sort((a,b)=>a.start-b.start)
}
export function statusAt(classId, dayIdx, min, sick){
  const segs=daySegments(classId,dayIdx); const open=segs[0].start, close=segs[segs.length-1].end
  if(sick){ const seg=segs.find(s=>min>=s.start&&min<s.end)||{start:open,end:close}; return {place:'infirmerie',title:'À l’infirmerie',sub:'Sous la surveillance de l’infirmière',seg} }
  if(min<open) return {place:'entree',title:'Avant l’école',sub:`Cours à ${fmt(open)}`,seg:{start:min,end:open}}
  if(min>=close) return {place:'entree',title:'Journée terminée',sub:'Sortie des classes',seg:{start:close,end:close+1}}
  const seg=segs.find(s=>min>=s.start&&min<s.end)||segs[segs.length-1]
  if(seg.kind==='class'&&seg.cell) return {place:'class',title:'En classe',sub:`${seg.cell.subject} · ${seg.cell.room}`,seg}
  if(seg.kind==='cour') return {place:'cour',title:'En récréation',sub:'Pause dans la cour',seg}
  if(seg.kind==='cantine') return {place:'cantine',title:'Pause déjeuner',sub:'À la cantine',seg}
  return {place:'class',title:'Étude',sub:'Salle de classe',seg}
}
// Année scolaire tunisienne : vacances d'été du 1er juillet au 14 septembre.
// Le mode démo (?live=1) court-circuite vacances et week-end : l'application se
// comporte comme un jour de classe, pour pouvoir montrer le produit hors période.
export function schoolPhase(now=appNow()){
  if(isDemoLive()) return 'live'
  const m=now.getMonth() // 0-based : juin=5, juillet=6, août=7, septembre=8
  const summer = m===6 || m===7 || (m===8 && now.getDate()<15)
  if(summer) return 'vacances'
  if(isWeekend(now)) return 'weekend'   // le week-end du PAYS (B-2 : ven-sam au Golfe)
  const min=now.getHours()*60+now.getMinutes()
  // 15:00 pile = journée terminée, cohérent avec statusAt() (min>=close).
  return min<SCHOOL_OPEN ? 'before' : min>=SCHOOL_CLOSE ? 'after' : 'live'
}
// current-time helpers
export function nowState(){
  const now=appNow(); const demo=isDemoLive()
  const realWeekday=demo || !isWeekend(now)
  const dayIdx=dayIndex(now); const nowMin=now.getHours()*60+now.getMinutes()
  const inSchool=realWeekday&&nowMin>=SCHOOL_OPEN&&nowMin<SCHOOL_CLOSE
  return { realWeekday, dayIdx, nowMin, inSchool }
}
