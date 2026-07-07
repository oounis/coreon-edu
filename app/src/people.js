import { mutate } from './db.js'
// Illustration avatars for students & staff, with soft pastel backgrounds so the
// motif merges into the design (never a bare white square).
export const people = n => `${import.meta.env.BASE_URL}people/${n}.png`
export const kidImg = n => `${import.meta.env.BASE_URL}kids/${n}.png`
export const avatarSrc = rel => `${import.meta.env.BASE_URL}${rel}`
const h = s => { let x=0; for(const c of String(s)) x=(x*31+c.charCodeAt(0))>>>0; return x }

const PASTEL = ['#ECEAFB','#E3F6FD','#FFF3DA','#E1FAF1','#FFE7EC','#EFE9FC','#E8F0FF','#FCEEE2','#EAF7E4']
export const avatarBg = seed => PASTEL[h(seed) % PASTEL.length]

// ── gender-based defaults (used until the user picks one) ──
export function studentAvatar(gender, id){ const set = gender==='Fille' ? 'g' : 'b'; return kidImg(set + (h(id)%8 + 1)) }
export function teacherAvatar(t){
  const s=(t.subject||'').toLowerCase()
  if(s.includes('sport')||s.includes('éduc') ) return people('sport-coach')
  if(s.includes('scien')||s.includes('éveil')||s.includes('eveil')) return people('science-teacher')
  if(s.includes('musi')) return people('music-teacher')
  if(s.includes('art')) return people('art-teacher')
  if(s.includes('info')||s.includes('techno')) return people('tech-teacher')
  return people(t.gender==='Fille' ? 'teacher-f' : 'teacher-m2')
}
export function roleAvatar(role, gender){
  const map = { owner:'principal', schooladmin:'principal', admin:'secretary', supervisor:'vice-principal',
    teacher: gender==='Fille'?'teacher-f':'teacher-m2', parent: gender==='Fille'?'mother':'father' }
  return people(map[role] || 'secretary')
}

// ── the pool users can pick from ──
const GIRLS = [...Array.from({length:14},(_,i)=>`g${i+1}`), 'sgirl','s-music','s-paint']
const BOYS  = [...Array.from({length:13},(_,i)=>`b${i+1}`), 'sboy','s-read','s-computer','s-science','s-sport']
const KGROUP = ['s-group']
const ROLES = ['principal','vice-principal','director','counselor','secretary','supervisor','admin',
  'teacher-m2','teacher-f','teacher-f2','science-teacher','tech-teacher','music-teacher','art-teacher','sport-coach','sped','teacher-fr','teacher-exam','nursery',
  'librarian','nurse','security','maintenance','it-admin','cafeteria','bus-driver','board-member',
  'father','father2','mother','parents-group','visitor',
  'af1','af2','af3','asf1','asf2','asm1','am1','am2']
export const AVATAR_POOL = [
  ...GIRLS.map(k=>({ key:k, rel:`kids/${k}.png`, group:'Filles' })),
  ...BOYS.map(k=>({ key:k, rel:`kids/${k}.png`, group:'Garçons' })),
  ...KGROUP.map(k=>({ key:k, rel:`kids/${k}.png`, group:'Groupes' })),
  ...ROLES.map(k=>({ key:k, rel:`people/${k}.png`, group:'Adultes' })),
]

// ── resolve the avatar to show (chosen one, else default) ──
export const resolveStudentAvatar = s => s?.avatar ? avatarSrc(s.avatar) : studentAvatar(s?.gender, s?.id)
export const resolveUserAvatar    = u => u?.avatar ? avatarSrc(u.avatar) : roleAvatar(u?.role, u?.gender)
export const resolveTeacherAvatar = t => t?.avatar ? avatarSrc(t.avatar) : teacherAvatar(t)

// ── persist a choice ──
export function setStudentAvatar(id, rel){ mutate(db=>{ const s=db.students.find(x=>x.id===id); if(s) s.avatar=rel }) }
export function setUserAvatar(id, rel){ mutate(db=>{ const u=db.users.find(x=>x.id===id); if(u) u.avatar=rel }) }
