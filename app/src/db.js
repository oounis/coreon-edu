const KEY="coreon_db_v10"
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
// ── timetable seed helpers (kept here to avoid a data.js↔db.js import cycle) ──
export const TT_SUBJECTS=[['Arabe','#6C5CE7'],['Français','#36C5F0'],['Mathématiques','#FF6B81'],['Éveil scientifique','#2BD9A8'],['Éducation islamique','#FFA62B'],['Éducation civique','#0BA5D8'],['Sport','#10B981'],['Musique','#A78BFA'],['Arts plastiques','#E59A12'],['Informatique','#8B5CF6']]
const TT_ROOMS=['Salle 12','Salle 8','Salle 21','Labo','Gymnase','Salle Info']
function h32(s){let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h}
function genTimetables(classes){
  const t={}
  classes.forEach(cl=>{ t[cl.id]=Array.from({length:6},(_,pi)=>Array.from({length:5},(_,di)=>{
    if((di===2||di===4)&&pi>=4) return null
    const [subject,color]=TT_SUBJECTS[h32(cl.id+'-'+di+'-'+pi)%TT_SUBJECTS.length]
    return {subject,color,room:TT_ROOMS[h32(cl.id+di+pi+'r')%TT_ROOMS.length]}
  })) })
  return t
}
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
    S("s17","Firas","Nasri","c6a",null,{gender:"Garçon"}),S("s18","Ines","Hidri","c6a",null,{gender:"Fille"}),S("s19","Malek","Riahi","c6a",null,{gender:"Garçon"}),S("s20","Dorra","Lahmar","c6a",null,{gender:"Fille"}),
    S("s21","Aymen","Zouari","c9a",null,{gender:"Garçon"}),S("s22","Khouloud","Belhaj","c9a",null,{gender:"Fille"}),S("s23","Seif","Mabrouk","c9a",null,{gender:"Garçon"}),S("s24","Rim","Gabsi","c9a",null,{gender:"Fille"}),
    S("s25","Nadia","Toumi","l2s",null,{gender:"Fille"}),S("s26","Walid","Charfi","l2s",null,{gender:"Garçon"}),S("s27","Emna","Brahmi","l2s",null,{gender:"Fille"}),S("s28","Zied","Karray","l2s",null,{gender:"Garçon"}),
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
  // deuxième évaluation (matière différente) pour prouver l'accumulation de l'historique
  const Bk2=["good","excellent","average","good"]
  const placements2={}; ["q1","q2","q3","q4","q5"].forEach((q,qi)=>{placements2[q]={}; c5.forEach((s,si)=>{placements2[q][s.id]=Bk2[(si+qi+1)%4]})})
  const evaluations=[
    {id:"ev_seed2",at:Date.now()-1800000,classId:"c5a",className:"5ème A",subject:"Éveil scientifique",teacher:"Hela Morjane",placements:placements2,badges:{s2:"idea"},note:"Très bonne participation à l'expérience."},
    {id:"ev_seed",at:Date.now()-90000000,classId:"c5a",className:"5ème A",subject:"Mathématiques",teacher:"Othman Ounis",placements,badges:{s1:"star",s3:"improved"},note:"Bonne séance, classe attentive."},
  ]
  // ── historique d'évaluations (~10 mois) pour alimenter le suivi Direction/Admin.
  // Déterministe (h32) : chaque élève a une "aptitude" stable → classements cohérents,
  // plus une légère progression dans le temps → les tendances ont du sens.
  {
    const DAY=86400000, subjPool=TT_SUBJECTS.map(([n])=>n), bkeys=['star','improved','team','idea','focus']
    // padding makes even short seeds hash into the full 32-bit range (uniform R)
    const R=s=>h32('kogia:'+s+':edu-2026-seed')/4294967295
    classes.forEach(cl=>{
      const kids=students.filter(s=>s.classId===cl.id)
      for(let w=1; w<=42; w++){
        const n=1+(h32(cl.id+':'+w)%2)
        for(let k=0;k<n;k++){
          const at=Date.now()-(w*7+(h32(cl.id+w+'d'+k)%5))*DAY-(8+h32(cl.id+w+'h'+k)%7)*3600000
          const subject=subjPool[h32(cl.id+w+'s'+k)%subjPool.length]
          const teacher=teachers[h32(cl.id+w+'t'+k)%teachers.length].name
          const placements={}
          ;['q1','q2','q3','q4','q5'].forEach(q=>{ placements[q]={}
            kids.forEach(s=>{ const ability=0.25+R('ab'+s.id)*0.6, progress=(42-w)/42*0.08
              const r=ability+progress+(R(q+s.id+cl.id+w+k)-0.5)*0.42
              placements[q][s.id]= r>0.74?'excellent': r>0.52?'good': r>0.32?'average':'weak' }) })
          const badges={}
          if(h32('bg'+cl.id+w+k)%3===0){ const s=kids[h32('bs'+cl.id+w+k)%kids.length]; badges[s.id]=bkeys[h32('bk'+cl.id+w+k)%bkeys.length] }
          evaluations.push({id:`ev_${cl.id}_${w}_${k}`,at,classId:cl.id,className:cl.name,subject,teacher,placements,badges,note:''})
        }
      }
    })
    evaluations.sort((a,b)=>b.at-a.at)
  }
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
  const messages=[{id:"m1",from:"u_sadmin",to:"p1",text:"Bienvenue sur Kogia Edu ! N'hésitez pas si vous avez besoin.",at:Date.now()-5400000,read:true},{id:"m2",from:"p1",to:"u_sadmin",text:"Merci ! Une question sur le calendrier des frais.",at:Date.now()-5000000,read:true}]
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
  // relevés de présence de démo (deux jours) pour la 5ème A — historique non vide
  const dstr=off=>new Date(Date.now()-off*86400000).toISOString().slice(0,10)
  const att1={}; c5.forEach((s,i)=>att1[s.id]= i===3?'absent': i===6?'late':'present')
  const att2={}; c5.forEach((s,i)=>att2[s.id]= i===5?'late':'present')
  const attendance={["c5a_"+dstr(1)]:att1,["c5a_"+dstr(2)]:att2}
  const settings={ schoolName:'École Al-Nour', shortName:'Al-Nour', city:'Tunis', year:'2025–2026',
    director:'Lina Aderra', phone:'+216 71 000 000', email:'contact@alnour.tn', address:'Avenue Habib Bourguiba, Tunis',
    brand:'#6C5CE7', logoText:'AN', currency:'DT' }
  return {classes,students,teachers,users,payments,evaluations,incidents,requests,books,routes,homework,events,exams,messages,attendance,notifications,timetables:genTimetables(classes),settings}
}
export const DEFAULT_SETTINGS={ schoolName:'École Al-Nour', shortName:'Al-Nour', city:'Tunis', year:'2025–2026', director:'Lina Aderra', phone:'+216 71 000 000', email:'contact@alnour.tn', address:'Avenue Habib Bourguiba, Tunis', brand:'#6C5CE7', logoText:'AN', currency:'DT' }
export const settings=()=>({...DEFAULT_SETTINGS, ...(db().settings||{})})
export function saveSettings(patch){ return mutate(d=>{ d.settings={...DEFAULT_SETTINGS, ...(d.settings||{}), ...patch} }) }
export function db(){let d=null;try{d=JSON.parse(localStorage.getItem(KEY))}catch{};if(!d){d=seed();localStorage.setItem(KEY,JSON.stringify(d))}
  if(!d.timetables){ d.timetables=genTimetables(d.classes); localStorage.setItem(KEY,JSON.stringify(d)) }  // backfill older dbs
  if(!d.settings){ d.settings={ schoolName:'École Al-Nour', shortName:'Al-Nour', city:'Tunis', year:'2025–2026', director:'Lina Aderra', phone:'+216 71 000 000', email:'contact@alnour.tn', address:'Avenue Habib Bourguiba, Tunis', brand:'#6C5CE7', logoText:'AN', currency:'DT' }; localStorage.setItem(KEY,JSON.stringify(d)) }
  return d}
export function setTimetableCell(classId,pi,di,cell){ return mutate(d=>{ d.timetables=d.timetables||{}; d.timetables[classId]=d.timetables[classId]||Array.from({length:6},()=>Array(5).fill(null)); d.timetables[classId][pi]=d.timetables[classId][pi]||Array(5).fill(null); d.timetables[classId][pi][di]=cell }) }
export function save(d){localStorage.setItem(KEY,JSON.stringify(d))}
export function mutate(fn){const d=db();fn(d);save(d);return d}
export function resetDb(){localStorage.removeItem(KEY)}
export const uid=(p="id")=>p+"_"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3)
export const studentById=id=>db().students.find(s=>s.id===id)
export const classById=id=>db().classes.find(c=>c.id===id)
export const studentsOfClass=cid=>db().students.filter(s=>s.classId===cid)
export const userById=id=>db().users.find(u=>u.id===id)
