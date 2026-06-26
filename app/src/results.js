import { QUESTIONS, BUCKETS, BADGES } from './data.js'
import { studentById } from './db.js'
export const bucketOf=k=>BUCKETS.find(b=>b.key===k)
export const badgeOf =k=>BADGES.find(b=>b.key===k)
export function bucketTotals(ev){
  const t=Object.fromEntries(BUCKETS.map(b=>[b.key,0]))
  for(const q of QUESTIONS){ const pl=ev.placements?.[q.id]||{}; for(const sid in pl) t[pl[sid]]=(t[pl[sid]]||0)+1 }
  return BUCKETS.map(b=>({name:b.label,value:t[b.key],color:b.color}))
}
export function studentSummary(ev, sid){
  const perQ=QUESTIONS.map(q=>({q:q.text,bucket:bucketOf((ev.placements?.[q.id]||{})[sid])})).filter(x=>x.bucket)
  const score=perQ.length?Math.round(perQ.reduce((s,x)=>s+({excellent:100,good:75,average:50,weak:25}[x.bucket.key]||0),0)/perQ.length):null
  return { perQ, score, badge: badgeOf(ev.badges?.[sid]) }
}
export const studentName=id=>(studentById(id)||{}).name||id

// Historique complet des évaluations enregistrées pour un élève (les plus récentes d'abord)
export function evaluationHistory(allEvals, sid){
  return (allEvals||[])
    .filter(e=>Object.values(e.placements||{}).some(p=>p && p[sid]!=null))
    .map(e=>{ const sum=studentSummary(e,sid); return {
      id:e.id, at:e.at, subject:e.subject, className:e.className, teacher:e.teacher,
      note:e.note, score:sum.score, badge:sum.badge, perQ:sum.perQ, mention:mentionFor(sum.score),
    } })
    .filter(x=>x.score!=null)
    .sort((a,b)=>b.at-a.at)
}

// Mention textuelle selon la moyenne /100 (système tunisien simplifié)
export function mentionFor(score){
  if(score==null) return {label:'—',color:'#8A93A6'}
  if(score>=85) return {label:'Excellent',color:'#2BD9A8'}
  if(score>=70) return {label:'Très bien',color:'#36C5F0'}
  if(score>=55) return {label:'Bien',color:'#6C5CE7'}
  if(score>=40) return {label:'Passable',color:'#FFA62B'}
  return {label:'Insuffisant',color:'#FF6B81'}
}

// Agrège toutes les évaluations + la présence d'un élève pour le bulletin
export function bulletinFor(db, sid){
  const evals=db.evaluations.filter(e=>Object.values(e.placements||{}).some(p=>p && p[sid]!=null))
                            .sort((a,b)=>a.at-b.at)
  // moyenne par matière
  const bySubject={}
  const sessions=[]
  for(const ev of evals){
    const sum=studentSummary(ev,sid)
    if(sum.score==null) continue
    sessions.push({at:ev.at,subject:ev.subject,score:sum.score,badge:sum.badge,note:ev.note,teacher:ev.teacher})
    ;(bySubject[ev.subject]=bySubject[ev.subject]||[]).push(sum.score)
  }
  const subjects=Object.entries(bySubject).map(([subject,arr])=>({
    subject, count:arr.length,
    avg:Math.round(arr.reduce((s,x)=>s+x,0)/arr.length),
  })).sort((a,b)=>b.avg-a.avg)
  const overall = subjects.length? Math.round(subjects.reduce((s,x)=>s+x.avg,0)/subjects.length) : null
  const badges = sessions.map(s=>s.badge).filter(Boolean)
  // présence — parcourt db.attendance (clés classId_date)
  const att={present:0,absent:0,late:0}
  for(const key in (db.attendance||{})){
    const v=db.attendance[key]?.[sid]; if(v&&att[v]!=null) att[v]++
  }
  const attTotal=att.present+att.absent+att.late
  const attRate=attTotal? Math.round((att.present/attTotal)*100) : null
  return { evals, sessions, subjects, overall, badges, att, attTotal, attRate, mention:mentionFor(overall) }
}
