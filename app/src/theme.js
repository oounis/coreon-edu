export const ROLE = {
  owner:      { label:'Product Owner', color:'#6C5CE7', soft:'#EEEBFF' },
  schooladmin:{ label:'School Admin',  color:'#6C5CE7', soft:'#EEEBFF' },
  admin:      { label:'Admin',         color:'#36C5F0', soft:'#E4F7FE' },
  teacher:    { label:'Teacher',       color:'#2BD9A8', soft:'#E2FBF3' },
  supervisor: { label:'Supervisor',    color:'#FFA62B', soft:'#FFF1DD' },
  parent:     { label:'Parent',        color:'#FF6B81', soft:'#FFE8EC' },
}
export function applyAccent(role){
  const r = ROLE[role] || ROLE.admin
  document.documentElement.style.setProperty('--accent', r.color)
  document.documentElement.style.setProperty('--accent-soft', r.soft)
}
