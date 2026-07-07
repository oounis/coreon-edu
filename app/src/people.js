// Illustration avatars for students & staff, with soft pastel backgrounds so the
// motif merges into the design (never a bare white square).
export const people = n => `${import.meta.env.BASE_URL}people/${n}.png`
export const kidImg = n => `${import.meta.env.BASE_URL}kids/${n}.png`
const h = s => { let x=0; for(const c of String(s)) x=(x*31+c.charCodeAt(0))>>>0; return x }

// soft light backgrounds (no white) — picked deterministically per person
const PASTEL = ['#ECEAFB','#E3F6FD','#FFF3DA','#E1FAF1','#FFE7EC','#EFE9FC','#E8F0FF','#FCEEE2','#EAF7E4']
export const avatarBg = seed => PASTEL[h(seed) % PASTEL.length]

// students: 8 girl + 8 boy illustrations, chosen by id
export function studentAvatar(gender, id){ const set = gender==='Fille' ? 'g' : 'b'; return kidImg(set + (h(id)%8 + 1)) }
export function teacherAvatar(t){
  if((t.subject||'').toLowerCase().includes('sport')) return people('teacher-sport')
  return people(t.gender==='Fille' ? 'teacher-f' : 'teacher-m')
}
export function roleAvatar(role, gender){
  const map = { owner:'director', schooladmin:'director', admin:'admin', supervisor:'supervisor',
    teacher: gender==='Fille'?'teacher-f':'teacher-m', parent:'nursery' }
  return people(map[role] || 'admin')
}
