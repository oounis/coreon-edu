const KEY="coreon_db_v7"
const MONTHS=["Sep","Oct","Nov","Déc","Jan","Fév","Mar","Avr","Mai","Juin"]
export const FEE_MONTHS=MONTHS
// Tout le système tunisien
export const CYCLES=[
  {cycle:"Primaire",grades:["1ère année","2ème année","3ème année","4ème année","5ème année","6ème année"]},
  {cycle:"Collège",grades:["7ème année","8ème année","9ème année"]},
  {cycle:"Lycée",grades:["1ère année secondaire","2ème année secondaire","3ème année secondaire","4ème année secondaire (Bac)"]},
]
export const FILIERES=["Tronc commun","Sciences","Mathématiques","Sciences expérimentales","Sciences techniques","Économie & Gestion","Lettres","Sciences informatiques","Sport"]
export const GRADES=CYCLES.flatMap(c=>c.grades)
function seed(){
  const classes=[
    {id:"c5a",name:"5ème A",grade:"5ème année",cycle:"Primaire"},
    {id:"c6a",name:"6ème A",grade:"6ème année",cycle:"Primaire"},
    {id:"c9a",name:"9ème A",grade:"9ème année",cycle:"Collège"},
    {id:"l2s",name:"2ème Sc",grade:"2ème année secondaire",cycle:"Lycée",filiere:"Sciences"},
  ]
  const S=(id,first,last,cls,parent,extra={})=>({id,name:`${first} ${last}`,initials:first[0]+last[0],classId:cls,parentId:parent,
    gender:extra.gender||"—",dob:extra.dob||"2015-05-10",bloodGroup:extra.bloodGroup||"O+",nationality:extra.nationality||"Tunisienne",
    rollNo:extra.rollNo||id.replace(/\D/g,''),admissionDate:extra.admissionDate||"2024-09-15",prevSchool:extra.prevSchool||"—",
    address:extra.address||"Tunis",phone:extra.phone||"+216 20 000 000",email:extra.email||"",fatherName:extra.fatherName||"",motherName:extra.motherName||"",
    guardianPhone:extra.guardianPhone||"+216 20 111 111",medical:extra.medical||"Aucune",allergies:extra.allergies||"Aucune",emergencyName:extra.emergencyName||"Tuteur",emergencyPhone:extra.emergencyPhone||"+216 20 222 222"})
  const students=[
    S("s1","Amira","Ben Salah","c5a","p1",{gender:"Fille",bloodGroup:"A+",fatherName:"Karim Ben Salah",motherName:"Sonia",allergies:"Arachides",medical:"Asthme léger"}),
    S("s2","Youssef","Trabelsi","c5a","p2",{gender:"Garçon",fatherName:"Anis Trabelsi"}),
    S("s3","Leila","Khelifi","c5a","p3",{gender:"Fille",bloodGroup:"B+"}),
    S("s4","Karim","Gharbi","c5a",null,{gender:"Garçon"}),S("s5","Sarra","Mejri","c5a",null,{gender:"Fille"}),
    S("s6","Hamza","Bouazizi","c5a",null,{gender:"Garçon"}),S("s7","Nour","Jlassi","c5a",null,{gender:"Fille"}),
    S("s8","Bilel","Chaabane","c5a",null,{gender:"Garçon"}),S("s9","Rania","Sassi","c5a",null,{gender:"Fille"}),
    S("s10","Aziz","Hammami","c5a",null,{gender:"Garçon"}),
    S("s11","Salma","Ferchichi","c6a",null,{gender:"Fille"}),S("s12","Wassim","Oueslati","c6a",null,{gender:"Garçon"}),
    S("s13","Mariem","Saidi","c9a",null,{gender:"Fille",dob:"2011-03-02"}),S("s14","Skander","Ayari","c9a",null,{gender:"Garçon",dob:"2011-07-12"}),
    S("s15","Yasmine","Bouzid","l2s",null,{gender:"Fille",dob:"2009-01-20"}),S("s16","Oussama","Mansouri","l2s",null,{gender:"Garçon",dob:"2009-09-05"}),
  ]
  const teachers=[
    {id:"t1",name:"Othman Ounis",subject:"Mathématiques",classes:["c5a","c6a"],gender:"Garçon",qualification:"Maîtrise en Mathématiques",experience:8,joiningDate:"2022-09-01",designation:"Instituteur principal",phone:"+216 20 333 333",email:"enseignant@alnour.tn",address:"Tunis",salary:1800},
    {id:"t2",name:"Hela Morjane",subject:"Éveil scientifique",classes:["c5a"],gender:"Fille",qualification:"Licence en Biologie",experience:5,joiningDate:"2023-09-01",designation:"Institutrice",phone:"+216 20 444 444",email:"hmorjane@alnour.tn",address:"Tunis",salary:1600},
    {id:"t3",name:"Sami Gabsi",subject:"Français",classes:["c6a","c9a"],gender:"Garçon",qualification:"Maîtrise de Français",experience:11,joiningDate:"2019-09-01",designation:"Professeur",phone:"+216 20 999 000",email:"sgabsi@alnour.tn",address:"Tunis",salary:1900},
  ]
  const users=[
    {id:"u_owner",role:"owner",name:"Othman (Propriétaire)",email:"owner@kogia.tn",pw:"owner"},
    {id:"u_sadmin",role:"schooladmin",name:"Lina Aderra",email:"direction@alnour.tn",pw:"admin",phone:"+216 20 555 555"},
    {id:"u_admin",role:"admin",name:"Karim Jelassi",email:"admin@alnour.tn",pw:"office",phone:"+216 20 666 666"},
    {id:"t1",role:"teacher",name:"Othman Ounis",email:"enseignant@alnour.tn",pw:"teacher",teacherId:"t1"},
    {id:"u_super",role:"supervisor",name:"Dali Brahmi",email:"surveillant@alnour.tn",pw:"super",phone:"+216 20 777 777"},
    {id:"p1",role:"parent",name:"Karim Ben Salah",email:"parent@alnour.tn",pw:"parent",childIds:["s1"],phone:"+216 20 888 111",occupation:"Ingénieur",address:"Tunis"},
    {id:"p2",role:"parent",name:"Anis Trabelsi",email:"parent2@alnour.tn",pw:"parent",childIds:["s2"],phone:"+216 20 888 222",occupation:"Médecin"},
    {id:"p3",role:"parent",name:"M. Khelifi",email:"parent3@alnour.tn",pw:"parent",childIds:["s3"],phone:"+216 20 888 333",occupation:"Commerçant"},
  ]
  const payments={}; students.forEach((s,i)=>{payments[s.id]=MONTHS.map((m,mi)=>{let st="paid";if(mi>=6)st="due";else if((i+mi)%7===0)st="overdue";else if((i+mi)%5===0)st="pending";return{month:m,status:st}})})
  // pre-seeded evaluation for 5ème A so dashboards/parents are not empty
  const c5=students.filter(s=>s.classId==="c5a"); const Bk=["excellent","good","average","weak"]
  const placements={}; ["q1","q2","q3","q4","q5"].forEach((q,qi)=>{placements[q]={}; c5.forEach((s,si)=>{placements[q][s.id]=Bk[(si+qi)%4]})})
  const evaluations=[{id:"ev_seed",at:Date.now()-3600000,classId:"c5a",className:"5ème A",subject:"Mathématiques",teacher:"Othman Ounis",placements,badges:{s1:"star",s3:"improved"},note:"Bonne séance, classe attentive."}]
  const incidents=[
    {id:"inc1",at:Date.now()-86400000,by:"Dali Brahmi",studentId:"s4",type:"Santé",title:"Élève malade",body:"Karim avait mal à la tête; envoyé à l'infirmerie.",severity:"medium",status:"open"},
    {id:"inc2",at:Date.now()-3*86400000,by:"Dali Brahmi",studentId:"s8",type:"Comportement",title:"Bagarre dans la cour",body:"Petite altercation réglée; parents informés.",severity:"high",status:"resolved"},
  ]
  const requests=[{id:"req1",at:Date.now()-3600000,by:"t1",byName:"Othman Ounis",type:"Attestation de salaire",fields:{addressedTo:"Banque BIAT",purpose:"demande de crédit",copies:2},chain:["admin","schooladmin"],currentLevel:0,approvals:[],status:"pending"}]
  const books=[{id:"b1",title:"Mathématiques 5ème",author:"R. Khaldi",copies:6,available:4,category:"Mathématiques"},{id:"b2",title:"Éveil scientifique 5",author:"M. Saïd",copies:5,available:5,category:"Sciences"},{id:"b3",title:"Lectures Françaises",author:"L. Bruni",copies:4,available:2,category:"Français"},{id:"b4",title:"القراءة العربية",author:"أحمد",copies:8,available:7,category:"Arabe"},{id:"b5",title:"Atlas Géographique",author:"Collectif",copies:3,available:3,category:"Géographie"}]
  const routes=[{id:"r1",name:"Circuit A · Nord",driver:"Sami",bus:"TUN-1023",stops:["La Marsa","Carthage","Sidi Bou Saïd"],students:6},{id:"r2",name:"Circuit B · Sud",driver:"Foued",bus:"TUN-2087",stops:["Radès","Ezzahra","Hammam Lif"],students:4}]
  const homework=[{id:"hw1",at:Date.now()-7200000,by:"t1",classId:"c5a",subject:"Mathématiques",title:"Exercices 3.1 à 3.4",due:"2026-06-28",details:"Résoudre tous les problèmes."},{id:"hw2",at:Date.now()-90000000,by:"t2",classId:"c5a",subject:"Éveil scientifique",title:"Schéma de la cellule",due:"2026-06-27",details:"Dessiner + légender."}]
  const events=[{id:"e1",date:"2026-06-29",title:"Réunion parents–enseignants",type:"Réunion",desc:"Tous les niveaux, 09:00–12:00."},{id:"e2",date:"2026-07-02",title:"Fête de fin d'année",type:"Événement",desc:"Spectacle des élèves."},{id:"e3",date:"2026-07-05",title:"Début des examens",type:"Examen",desc:"Voir le calendrier."},{id:"e4",date:"2026-07-12",title:"Sortie pédagogique — Musée du Bardo",type:"Événement",desc:"6ème année."}]
  const exams=[{id:"x1",class:"5ème A",subject:"Mathématiques",date:"2026-07-05",total:100},{id:"x2",class:"5ème A",subject:"Éveil scientifique",date:"2026-07-07",total:100},{id:"x3",class:"6ème A",subject:"Mathématiques",date:"2026-07-06",total:100},{id:"x4",class:"9ème A",subject:"Français",date:"2026-07-08",total:100}]
  const messages=[{id:"m1",from:"u_sadmin",to:"p1",text:"Bienvenue sur Coreon Edu ! N'hésitez pas si vous avez besoin.",at:Date.now()-5400000,read:true},{id:"m2",from:"p1",to:"u_sadmin",text:"Merci ! Une question sur le calendrier des frais.",at:Date.now()-5000000,read:true}]
  const N=(to,role,kind,actor,title,body,link,mins,read=false)=>({id:"n"+mins+kind,to,role,kind,actor,title,body,link,at:Date.now()-mins*60000,read})
  const notifications=[
    N("u_admin",null,"request","Othman Ounis","a demandé une attestation de salaire","Attestation de salaire · en attente","/app/requests",55),
    N(null,"admin","incident","Dali Brahmi","a signalé un incident","Élève malade (Karim) · Santé","/app/incidents",90),
    N(null,"parent","evaluation","Othman Ounis","a publié une évaluation","Mathématiques · 5ème A","/app",60),
    N(null,"parent","payment","Administration","rappel de paiement","2 mois impayés","/app/payments",120),
    N(null,"admin","info","Othman Ounis","a fait l'appel — 5ème A","9 présents · 1 absent","/app/attendance",30),
    N(null,"parent","notice","Direction","nouvelle annonce","Réunion parents–enseignants le 29/06","/app/notices",200,true),
    N("u_sadmin",null,"message","Karim Ben Salah","vous a envoyé un message","Une question sur le calendrier des frais","/app/messages",240,true),
  ]
  const POS={schooladmin:"Directrice",admin:"Agent administratif",supervisor:"Surveillant général",teacher:"Instituteur principal",owner:"Propriétaire"}
  const GV=["Tunis","Ariana","Ben Arous","Sousse","Sfax","Nabeul","Bizerte","Manouba"]
  users.forEach((u,i)=>{u.cin=u.cin||String(10000000+i*1111111).slice(0,8);u.governorate=u.governorate||GV[i%GV.length];u.position=u.position||POS[u.role];u.attachments=u.attachments||[]})
  teachers.forEach((t,i)=>{t.cin=t.cin||String(11000000+i*1234567).slice(0,8);t.governorate=t.governorate||GV[i%GV.length];t.position=t.position||t.designation||"Professeur";t.attachments=t.attachments||[{name:"CIN_recto.pdf",type:"Copie CIN"},{name:"Diplome.pdf",type:"Diplôme(s)"}]})
  students.forEach((st,i)=>{st.cin=st.cin||("ACTE-"+(20150100+i));st.governorate=st.governorate||GV[i%GV.length];st.attachments=st.attachments||(i<2?[{name:"extrait_naissance.pdf",type:"Extrait de naissance"}]:[])})
  return {classes,students,teachers,users,payments,evaluations,incidents,requests,books,routes,homework,events,exams,messages,attendance:{},notifications}
}
export function db(){let d=null;try{d=JSON.parse(localStorage.getItem(KEY))}catch{};if(!d){d=seed();localStorage.setItem(KEY,JSON.stringify(d))}return d}
export function save(d){localStorage.setItem(KEY,JSON.stringify(d))}
export function mutate(fn){const d=db();fn(d);save(d);return d}
export function resetDb(){localStorage.removeItem(KEY)}
export const uid=(p="id")=>p+"_"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3)
export const studentById=id=>db().students.find(s=>s.id===id)
export const classById=id=>db().classes.find(c=>c.id===id)
export const studentsOfClass=cid=>db().students.filter(s=>s.classId===cid)
export const userById=id=>db().users.find(u=>u.id===id)
