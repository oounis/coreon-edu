import { QUESTIONS, BUCKETS, BADGES } from './data.js'
import { studentById } from './db.js'
import { STATUS, BRAND } from './tokens.js'
import { t } from './i18n.js'
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
      id:e.id, at:e.at, subject:e.subject, lesson:e.lesson, className:e.className, teacher:e.teacher,
      note:e.note, score:sum.score, badge:sum.badge, perQ:sum.perQ, mention:mentionFor(sum.score),
    } })
    .filter(x=>x.score!=null)
    .sort((a,b)=>b.at-a.at)
}

// Mention textuelle selon la moyenne /100 (système tunisien simplifié).
// Une mention est un STATUT, pas une série : elle porte les couleurs réservées du
// livre de marque, et toujours avec son libellé — jamais la couleur seule.
export function mentionFor(score){
  if(score==null) return {label:'·',color:STATUS.neutral}
  if(score>=85) return {label:t('Excellent'),color:STATUS.ok}
  if(score>=70) return {label:t('Très bien'),color:STATUS.info}
  if(score>=55) return {label:t('Bien'),color:BRAND.indigo}
  if(score>=40) return {label:t('Passable'),color:STATUS.warn}
  return {label:t('Insuffisant'),color:STATUS.danger}
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
  // Moyenne générale = moyenne de TOUTES les évaluations, pondérée par leur nombre.
  // (Avant : moyenne des moyennes par matière — une matière évaluée une seule fois
  //  pesait autant qu'une matière évaluée dix fois, et l'écran Résultats affichait
  //  donc une moyenne différente de celle du bulletin pour le même élève.)
  const totalCount = subjects.reduce((s,x)=>s+x.count,0)
  const overall = totalCount? Math.round(subjects.reduce((s,x)=>s+x.avg*x.count,0)/totalCount) : null
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

// Analyse fine : moyenne par matière ET par leçon (« faible en fractions »,
// pas seulement « faible en maths ») — la vraie valeur du produit.
export function lessonBreakdown(allEvals, sid){
  const acc={}
  for(const ev of (allEvals||[])){
    const sum=studentSummary(ev,sid); if(sum.score==null) continue
    const subj=acc[ev.subject]=acc[ev.subject]||{subject:ev.subject,scores:[],lessons:{}}
    subj.scores.push(sum.score)
    const key=ev.lesson||'Général'
    ;(subj.lessons[key]=subj.lessons[key]||[]).push(sum.score)
  }
  return Object.values(acc).map(s=>({
    subject:s.subject,
    avg:Math.round(s.scores.reduce((a,x)=>a+x,0)/s.scores.length),
    lessons:Object.entries(s.lessons).map(([lesson,arr])=>({
      lesson, count:arr.length, avg:Math.round(arr.reduce((a,x)=>a+x,0)/arr.length),
    })).sort((a,b)=>a.avg-b.avg),
  })).sort((a,b)=>a.avg-b.avg)
}
// Forces / à renforcer pour le portail parent
export function strengthsWeaknesses(allEvals, sid, n=3){
  const all=lessonBreakdown(allEvals,sid).flatMap(s=>s.lessons.map(l=>({...l,subject:s.subject})))
  const weak=all.filter(l=>l.avg<60).sort((a,b)=>a.avg-b.avg).slice(0,n)
  const strong=all.filter(l=>l.avg>=72).sort((a,b)=>b.avg-a.avg).slice(0,n)
  return {strong,weak}
}
