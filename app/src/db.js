// Coreon Edu — localStorage "database" (mock backend). Real backend = P1 (see PLAN.md).
const KEY = "coreon_db_v2"
const MONTHS = ["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"]
export const FEE_MONTHS = MONTHS

function seed(){
  const classes = [
    { id:"c7a", name:"7-A", grade:"Grade 7" },
    { id:"c8b", name:"8-B", grade:"Grade 8" },
  ]
  const mk = (id,first,last,cls,parent) => ({ id, name:`${first} ${last}`, initials:first[0]+last[0], classId:cls, parentId:parent, dob:"2013-05-10" })
  const students = [
    mk("s1","Amira","Ben Salah","c7a","p1"), mk("s2","Youssef","Trabelsi","c7a","p2"),
    mk("s3","Leila","Khelifi","c7a","p3"),   mk("s4","Karim","Gharbi","c7a",null),
    mk("s5","Sarra","Mejri","c7a",null),     mk("s6","Hamza","Bouazizi","c7a",null),
    mk("s7","Nour","Jlassi","c7a",null),     mk("s8","Bilel","Chaabane","c7a",null),
    mk("s9","Rania","Sassi","c7a",null),     mk("s10","Aziz","Hammami","c7a",null),
    mk("s11","Salma","Ferchichi","c8b",null),mk("s12","Wassim","Oueslati","c8b",null),
  ]
  const teachers = [
    { id:"t1", name:"Othman Ounis", subject:"Mathematics", classes:["c7a","c8b"] },
    { id:"t2", name:"Heather Morris", subject:"Science", classes:["c7a"] },
  ]
  const users = [
    { id:"u_owner", role:"owner", name:"Othman (Owner)", email:"owner@coreon.io", pw:"owner" },
    { id:"u_sadmin",role:"schooladmin", name:"Linda Adora", email:"admin@alnoor.edu", pw:"admin" },
    { id:"u_admin", role:"admin", name:"Carl Jenkins", email:"office@alnoor.edu", pw:"office" },
    { id:"t1",      role:"teacher", name:"Othman Ounis", email:"teacher@alnoor.edu", pw:"teacher", teacherId:"t1" },
    { id:"u_super", role:"supervisor", name:"Dan Brooks", email:"super@alnoor.edu", pw:"super" },
    { id:"p1",      role:"parent", name:"Mr. Ben Salah", email:"parent@alnoor.edu", pw:"parent", childIds:["s1"] },
    { id:"p2",      role:"parent", name:"Mrs. Trabelsi", email:"parent2@alnoor.edu", pw:"parent", childIds:["s2"] },
    { id:"p3",      role:"parent", name:"Mr. Khelifi", email:"parent3@alnoor.edu", pw:"parent", childIds:["s3"] },
  ]
  // monthly payments per student
  const payments = {}
  students.forEach((s,i)=>{
    payments[s.id] = MONTHS.map((m,mi)=>{
      let status = "paid"
      if(mi>=6) status = "due"                 // future months unpaid
      else if((i+mi)%7===0) status = "overdue" // a few overdue
      else if((i+mi)%5===0) status = "pending"
      return { month:m, status }
    })
  })
  const incidents = [
    { id:"inc1", at:Date.now()-86400000, by:"Dan Brooks", studentId:"s4", type:"Health", title:"Student felt sick", body:"Karim had a headache during recess. Sent to the nurse.", severity:"medium", status:"open" },
  ]
  const requests = [
    { id:"req1", at:Date.now()-3600000, by:"t1", byName:"Othman Ounis", type:"Salary Certificate", note:"For a bank loan application.", status:"pending" },
  ]
  const notifications = [
    { id:"n1", to:"u_admin", role:null, kind:"request", title:"New salary-certificate request", body:"Othman Ounis requested a salary certificate.", at:Date.now()-3600000, read:false },
    { id:"n2", to:"u_admin", role:null, kind:"incident", title:"Incident reported", body:"Dan Brooks reported: Student felt sick (Karim).", at:Date.now()-86400000, read:false },
  ]
  return { classes, students, teachers, users, payments, incidents, requests, evaluations:[], notifications, messages:[] }
}

export function db(){
  let d = null
  try { d = JSON.parse(localStorage.getItem(KEY)) } catch {}
  if(!d){ d = seed(); localStorage.setItem(KEY, JSON.stringify(d)) }
  return d
}
export function save(d){ localStorage.setItem(KEY, JSON.stringify(d)) }
export function mutate(fn){ const d=db(); fn(d); save(d); return d }
export function resetDb(){ localStorage.removeItem(KEY) }

// helpers
export const uid = (p="id")=> p+"_"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3)
export const studentById = id => db().students.find(s=>s.id===id)
export const classById = id => db().classes.find(c=>c.id===id)
export const studentsOfClass = cid => db().students.filter(s=>s.classId===cid)
