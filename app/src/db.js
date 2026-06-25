const KEY = "coreon_db_v3"
const MONTHS = ["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"]
export const FEE_MONTHS = MONTHS

function seed(){
  const classes=[{id:"c7a",name:"7-A",grade:"Grade 7"},{id:"c8b",name:"8-B",grade:"Grade 8"}]
  const S=(id,first,last,cls,parent,extra={})=>({
    id, name:`${first} ${last}`, initials:first[0]+last[0], classId:cls, parentId:parent,
    gender:extra.gender||"—", dob:extra.dob||"2013-05-10", bloodGroup:extra.bloodGroup||"O+",
    nationality:extra.nationality||"Tunisian", rollNo:extra.rollNo||id.replace(/\D/g,''),
    admissionDate:extra.admissionDate||"2024-09-01", prevSchool:extra.prevSchool||"—",
    address:extra.address||"Tunis", phone:extra.phone||"+216 20 000 000", email:extra.email||"",
    fatherName:extra.fatherName||"", motherName:extra.motherName||"", guardianPhone:extra.guardianPhone||"+216 20 111 111",
    medical:extra.medical||"None", allergies:extra.allergies||"None",
    emergencyName:extra.emergencyName||"Guardian", emergencyPhone:extra.emergencyPhone||"+216 20 222 222",
  })
  const students=[
    S("s1","Amira","Ben Salah","c7a","p1",{gender:"Female",bloodGroup:"A+",fatherName:"Karim Ben Salah",motherName:"Sonia",allergies:"Peanuts",medical:"Mild asthma"}),
    S("s2","Youssef","Trabelsi","c7a","p2",{gender:"Male",bloodGroup:"O+",fatherName:"Anis Trabelsi"}),
    S("s3","Leila","Khelifi","c7a","p3",{gender:"Female",bloodGroup:"B+"}),
    S("s4","Karim","Gharbi","c7a",null,{gender:"Male"}), S("s5","Sarra","Mejri","c7a",null,{gender:"Female"}),
    S("s6","Hamza","Bouazizi","c7a",null,{gender:"Male"}), S("s7","Nour","Jlassi","c7a",null,{gender:"Female"}),
    S("s8","Bilel","Chaabane","c7a",null,{gender:"Male"}), S("s9","Rania","Sassi","c7a",null,{gender:"Female"}),
    S("s10","Aziz","Hammami","c7a",null,{gender:"Male"}), S("s11","Salma","Ferchichi","c8b",null,{gender:"Female"}),
    S("s12","Wassim","Oueslati","c8b",null,{gender:"Male"}),
  ]
  const teachers=[
    {id:"t1",name:"Othman Ounis",subject:"Mathematics",classes:["c7a","c8b"],gender:"Male",qualification:"M.Sc. Mathematics",experience:8,joiningDate:"2022-09-01",designation:"Senior Teacher",phone:"+216 20 333 333",email:"teacher@alnoor.edu",address:"Tunis",salary:2200},
    {id:"t2",name:"Heather Morris",subject:"Science",classes:["c7a"],gender:"Female",qualification:"B.Sc. Biology",experience:5,joiningDate:"2023-09-01",designation:"Teacher",phone:"+216 20 444 444",email:"hmorris@alnoor.edu",address:"Tunis",salary:1900},
  ]
  const users=[
    {id:"u_owner",role:"owner",name:"Othman (Owner)",email:"owner@coreon.io",pw:"owner"},
    {id:"u_sadmin",role:"schooladmin",name:"Linda Adora",email:"admin@alnoor.edu",pw:"admin",phone:"+216 20 555 555"},
    {id:"u_admin",role:"admin",name:"Carl Jenkins",email:"office@alnoor.edu",pw:"office",phone:"+216 20 666 666"},
    {id:"t1",role:"teacher",name:"Othman Ounis",email:"teacher@alnoor.edu",pw:"teacher",teacherId:"t1"},
    {id:"u_super",role:"supervisor",name:"Dan Brooks",email:"super@alnoor.edu",pw:"super",phone:"+216 20 777 777"},
    {id:"p1",role:"parent",name:"Karim Ben Salah",email:"parent@alnoor.edu",pw:"parent",childIds:["s1"],phone:"+216 20 888 111",occupation:"Engineer",address:"Tunis"},
    {id:"p2",role:"parent",name:"Anis Trabelsi",email:"parent2@alnoor.edu",pw:"parent",childIds:["s2"],phone:"+216 20 888 222",occupation:"Doctor"},
    {id:"p3",role:"parent",name:"Mr. Khelifi",email:"parent3@alnoor.edu",pw:"parent",childIds:["s3"],phone:"+216 20 888 333",occupation:"Merchant"},
  ]
  const payments={}; students.forEach((s,i)=>{ payments[s.id]=MONTHS.map((m,mi)=>{ let st="paid"; if(mi>=6)st="due"; else if((i+mi)%7===0)st="overdue"; else if((i+mi)%5===0)st="pending"; return {month:m,status:st} }) })
  const incidents=[{id:"inc1",at:Date.now()-86400000,by:"Dan Brooks",studentId:"s4",type:"Health",title:"Student felt sick",body:"Karim had a headache; sent to the nurse.",severity:"medium",status:"open"}]
  const requests=[{id:"req1",at:Date.now()-3600000,by:"t1",byName:"Othman Ounis",type:"Salary Certificate",note:"For a bank loan application.",status:"pending"}]
  const books=[
    {id:"b1",title:"Algebra Foundations",author:"R. Khan",copies:6,available:4,category:"Mathematics"},
    {id:"b2",title:"Living Science 7",author:"M. Said",copies:5,available:5,category:"Science"},
    {id:"b3",title:"World History",author:"L. Bruni",copies:4,available:2,category:"History"},
    {id:"b4",title:"English Reader",author:"J. Doe",copies:8,available:7,category:"Languages"},
  ]
  const routes=[
    {id:"r1",name:"Route A · North",driver:"Sami",bus:"TUN-1023",stops:["La Marsa","Carthage","Sidi Bou Said"],students:6},
    {id:"r2",name:"Route B · South",driver:"Foued",bus:"TUN-2087",stops:["Rades","Ezzahra","Hammam Lif"],students:4},
  ]
  const homework=[
    {id:"hw1",at:Date.now()-7200000,by:"t1",classId:"c7a",subject:"Mathematics",title:"Exercises 3.1–3.4",due:"2026-06-28",details:"Solve all problems, show steps."},
    {id:"hw2",at:Date.now()-90000000,by:"t2",classId:"c7a",subject:"Science",title:"Plant cell diagram",due:"2026-06-27",details:"Draw + label."},
  ]
  const events=[
    {id:"e1",date:"2026-06-29",title:"Parent–Teacher Meeting",type:"Meeting",desc:"All grades, 09:00–12:00."},
    {id:"e2",date:"2026-07-02",title:"Science Fair",type:"Event",desc:"Grade 7 & 8 projects."},
    {id:"e3",date:"2026-07-05",title:"Term Exams begin",type:"Exam",desc:"See exam schedule."},
  ]
  const exams=[
    {id:"x1",class:"7-A",subject:"Mathematics",date:"2026-07-05",total:100},
    {id:"x2",class:"7-A",subject:"Science",date:"2026-07-07",total:100},
    {id:"x3",class:"8-B",subject:"Mathematics",date:"2026-07-06",total:100},
  ]
  const messages=[
    {id:"m1",from:"u_sadmin",to:"p1",text:"Welcome to Coreon Edu! Let us know if you need anything.",at:Date.now()-5400000,read:true},
    {id:"m2",from:"p1",to:"u_sadmin",text:"Thank you! Quick question about the fee schedule.",at:Date.now()-5000000,read:true},
  ]
  const notifications=[
    {id:"n1",to:"u_admin",role:null,kind:"request",title:"New salary-certificate request",body:"Othman Ounis requested a salary certificate.",at:Date.now()-3600000,read:false,link:"/app/requests"},
    {id:"n2",to:"u_admin",role:null,kind:"incident",title:"Incident reported",body:"Dan Brooks reported: Student felt sick (Karim).",at:Date.now()-86400000,read:false,link:"/app/incidents"},
  ]
  return {classes,students,teachers,users,payments,incidents,requests,books,routes,homework,events,exams,messages,evaluations:[],attendance:{},notifications}
}

export function db(){ let d=null; try{d=JSON.parse(localStorage.getItem(KEY))}catch{}; if(!d){d=seed();localStorage.setItem(KEY,JSON.stringify(d))} return d }
export function save(d){ localStorage.setItem(KEY,JSON.stringify(d)) }
export function mutate(fn){ const d=db(); fn(d); save(d); return d }
export function resetDb(){ localStorage.removeItem(KEY) }
export const uid=(p="id")=>p+"_"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3)
export const studentById=id=>db().students.find(s=>s.id===id)
export const classById=id=>db().classes.find(c=>c.id===id)
export const studentsOfClass=cid=>db().students.filter(s=>s.classId===cid)
export const userById=id=>db().users.find(u=>u.id===id)
