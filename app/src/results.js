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
