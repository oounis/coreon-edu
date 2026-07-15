// Clé STABLE : la version du schéma est stockée dans la base elle-même (`_v`) et
// les évolutions passent par migrate(). Voir db() plus bas.
import { getItem, setItem, removeItem } from './storage.js'
import { subjectHue } from './subjects.js'
import { BRAND } from './tokens.js'
const KEY="coreon_db"
const SCHEMA=21
const LEGACY_KEYS=Array.from({length:18},(_,i)=>`coreon_db_v${18-i}`)
const MONTHS=["Sep","Oct","Nov","Déc","Jan","Fév","Mar","Avr","Mai","Juin"]
export const FEE_MONTHS=MONTHS
// Tout le système tunisien
// Coreon Edu est spécialisé ÉCOLE PRIMAIRE : 6 niveaux, un seul cycle.
export const CYCLES=[
  {cycle:"Primaire",grades:["1ère année","2ème année","3ème année","4ème année","5ème année","6ème année"]},
]
export const GRADES=CYCLES.flatMap(c=>c.grades)
// ── timetable seed helpers (kept here to avoid a data.js↔db.js import cycle) ──
// La couleur d'une matière n'est plus écrite ici : elle vient de subjects.js, la
// table partagée avec le web ET le natif (avant, les deux n'étaient pas d'accord).
export const TT_SUBJECT_NAMES=['Arabe','Français','Mathématiques','Éveil scientifique','Éducation islamique','Éducation civique','Sport','Musique','Arts plastiques','Informatique']
export const TT_SUBJECTS=TT_SUBJECT_NAMES.map(n=>[n,subjectHue(n)])
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
// ── Comptes et activités de démonstration ───────────────────────────────────
// Définis ici (et pas seulement dans seed()) pour que migrate() puisse les
// rétablir : une base créée avant l'ajout d'un rôle n'a jamais reçu son compte.
const HR=3600000, DY=86400000
const dISO=n=>{const x=new Date(Date.now()+n*DY);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
const par=(id,name,adults=1,children=0,price=0,extra={})=>({userId:id,name,rsvp:'oui',adults,children,priceAgreedPerPerson:price,amountAgreed:price*(adults+children),agreedAt:Date.now()-2*HR,paid:false,...extra})

export function demoUsers(){
  return [
    {id:"u_owner",role:"owner",name:"Kogia Group",email:"owner@kogia.tn",pw:"owner"},
    {id:"u_sadmin",role:"schooladmin",name:"Lina Aderra",email:"direction@alnour.tn",pw:"admin",phone:"+216 20 555 555"},
    {id:"u_admin",role:"admin",name:"Karim Jelassi",email:"admin@alnour.tn",pw:"office",phone:"+216 20 666 666"},
    {id:"t1",role:"teacher",name:"Othman Ounis",email:"enseignant@alnour.tn",pw:"teacher",teacherId:"t1"},
    // L'éducatrice de la crèche et de la maternelle. Elle avait une fiche dans
    // `teachers` mais AUCUN compte : elle ne pouvait pas se connecter.
    {id:"t_ee",role:"teacher",name:"Ines Belhadj",email:"creche@alnour.tn",pw:"teacher",teacherId:"t_ee"},
    {id:"u_super",role:"supervisor",name:"Dali Brahmi",email:"surveillant@alnour.tn",pw:"super",phone:"+216 20 777 777"},
    // agent de sécurité : portail, visiteurs, rondes, soirées — distinct du surveillant
    {id:"u_secu",role:"security",name:"Mongi Zouaoui",email:"securite@alnour.tn",pw:"secu",gender:"Homme",phone:"+216 20 777 888"},
    // `gender` sert aux événements réservés aux mères ou aux pères (Espace parents).
    {id:"p1",role:"parent",name:"Karim Ben Salah",email:"parent@alnour.tn",pw:"parent",gender:"Homme",childIds:["s1","s29"],phone:"+216 20 888 111",occupation:"Ingénieur",address:"Tunis"},
    {id:"p2",role:"parent",name:"Anis Trabelsi",email:"parent2@alnour.tn",pw:"parent",gender:"Homme",childIds:["s2","s32"],phone:"+216 20 888 222",occupation:"Médecin"},
    {id:"p3",role:"parent",name:"Salma Khelifi",email:"parent3@alnour.tn",pw:"parent",gender:"Femme",childIds:["s3"],phone:"+216 20 888 333",occupation:"Commerçante"},
    {id:"p4",role:"parent",name:"Sonia Ferchichi",email:"parent4@alnour.tn",pw:"parent",gender:"Femme",childIds:["s11"],phone:"+216 20 888 444",occupation:"Pharmacienne"},
    {id:"p5",role:"parent",name:"Mehdi Gharbi",email:"parent5@alnour.tn",pw:"parent",gender:"Homme",childIds:["s4"],phone:"+216 20 888 555",occupation:"Architecte"},
  ]
}

export function demoSocialEvents(){
  const socialEvents=[
    { // en cours de collecte : il manque des joueurs
      id:'sev_foot', at:Date.now()-6*HR, by:'p2', byName:'Anis Trabelsi', space:'parent',
      title:'Match de football entre pères', cat:'sport',
      desc:"Deux équipes, une heure de jeu. Chaussures de sport obligatoires.",
      date:dISO(5), time:'18:00', place:'Terrain de football',
      audience:'peres', reason:"match entre pères ; un match entre mères est prévu le mois prochain", kids:'sans',
      minParticipants:10, maxParticipants:14, pricePerPerson:5, priceCovers:"la location du terrain et l'arbitre",
      status:'collecte',
      // que des pères : la règle de non-mixité vaut aussi pour les données de démo
      participants:[par('p2','Anis Trabelsi',1,0,5), par('p1','Karim Ben Salah',1,0,5),
        {userId:'p5',name:'Mehdi Gharbi',rsvp:'peut-etre',adults:1,children:0,priceAgreedPerPerson:5,amountAgreed:5,agreedAt:Date.now()-HR}],
    },
    { // quorum atteint, échéance passée → attend la Direction
      id:'sev_danse', at:Date.now()-30*HR, by:'p3', byName:'Salma Khelifi', space:'parent',
      title:'Atelier danse entre mères', cat:'atelier',
      desc:"Une heure de danse avec une intervenante. Une garde d'enfants est organisée sur place.",
      date:dISO(4), time:'17:30', place:'Salle polyvalente',
      audience:'meres', reason:"cours entre mamans, avec garde d'enfants sur place", kids:'garde',
      minParticipants:2, maxParticipants:null, pricePerPerson:8, priceCovers:"l'intervenante et la garde d'enfants",
      status:'soumis', submittedAt:Date.now()-5*HR,
      // que des mères
      participants:[par('p3','Salma Khelifi',1,0,8), par('p4','Sonia Ferchichi',1,1,8)],
    },
    { // approuvée : au calendrier, reste l'encaissement
      id:'sev_cafe', at:Date.now()-4*DY, by:'p1', byName:'Karim Ben Salah', space:'parent',
      title:'Café des parents', cat:'rencontre',
      desc:"Un moment simple pour se rencontrer autour d'un café.",
      date:dISO(2), time:'09:00', place:'Bibliothèque',
      audience:'mixte', reason:'', kids:'bienvenus',
      minParticipants:2, maxParticipants:null, pricePerPerson:0, priceCovers:'',
      status:'approuve', decision:{by:'Lina Aderra',at:Date.now()-2*DY,note:''},
      participants:[par('p1','Karim Ben Salah',1,1), par('p2','Anis Trabelsi',1,0), par('p3','Salma Khelifi',1,2), par('p4','Sonia Ferchichi',1,0)],
    },
  ]

// Un événement par espace : les enseignants et le personnel ont le leur.
  socialEvents.push({
    id:'sev_formation', at:Date.now()-10*HR, by:'t1', byName:'Othman Ounis', space:'teacher',
    title:'Formation : évaluer sans noter', cat:'formation',
    desc:"Atelier entre collègues sur l'évaluation par compétences.",
    date:dISO(6), time:'16:30', place:'Salle polyvalente',
    audience:'tous', reason:'', kids:'sans',
    minParticipants:3, maxParticipants:null, pricePerPerson:0, priceCovers:'',
    status:'collecte',
    participants:[par('t1','Othman Ounis',1,0,0)],
  })
  socialEvents.push({
    id:'sev_secours', at:Date.now()-2*DY, by:'u_super', byName:'Dali Brahmi', space:'staff',
    title:'Formation premiers secours', cat:'formation',
    desc:'Gestes qui sauvent, avec un formateur agréé.',
    date:dISO(9), time:'14:00', place:'Salle polyvalente',
    audience:'tous', reason:'', kids:'sans',
    minParticipants:3, maxParticipants:null, pricePerPerson:15, priceCovers:'le formateur et le matériel',
    status:'vise',   // instruit par l'Administration, attend la Direction
    approvals:[{role:'admin',by:'Karim Jelassi',at:Date.now()-DY,decision:'approuve',note:''}],
    // proposée par le surveillant ; visée par l'Administration — nul ne vise sa propre proposition
    participants:[par('u_super','Dali Brahmi',1,0,15), par('u_admin','Karim Jelassi',1,0,15), par('u_secu','Mongi Zouaoui',1,0,15)],
  })



  // Une soirée déjà approuvée : c'est elle que l'agent de sécurité doit couvrir.
  socialEvents.push({
    id:'sev_fete', at:Date.now()-6*DY, by:'p1', byName:'Karim Ben Salah', space:'parent',
    title:"Fête de fin d'année des parents", cat:'fete',
    desc:"Chacun apporte un plat. Sono et décoration financées par la caisse des parents.",
    date:dISO(2), time:'19:00', place:"Cour de l'école",
    audience:'mixte', reason:'', kids:'bienvenus',
    minParticipants:15, maxParticipants:null, pricePerPerson:10, priceCovers:'la sono et la décoration',
    status:'approuve',
    approvals:[{role:'admin',by:'Karim Jelassi',at:Date.now()-3*DY,decision:'approuve',note:''},
               {role:'schooladmin',by:'Lina Aderra',at:Date.now()-2*DY,decision:'approuve',note:''}],
    decision:{by:'Lina Aderra',at:Date.now()-2*DY,note:''},
    securityNotifiedAt:Date.now()-2*DY,
    security:{checks:{brief:true,liste:true,portail:true},notes:'',agentName:'Mongi Zouaoui'},
    participants:[par('p1','Karim Ben Salah',2,1,10), par('p2','Anis Trabelsi',2,0,10), par('p3','Salma Khelifi',1,2,10),
                  par('p4','Sonia Ferchichi',2,1,10), par('p5','Mehdi Gharbi',2,2,10)],
  })
  return socialEvents
}

function seed(){
  // Une classe porte désormais son NIVEAU (`level`, cf. core/src/levels.js) —
  // c'est lui qui décide des modules, pas une chaîne de caractères libre.
  // L'école de démo fait crèche ET primaire : le cas exact que ni PowerSchool
  // ni Famly ne savent servir, et que Coreon EDU sert sous un seul toit.
  const classes=[
    {id:"kg_ns", name:"Crèche — Les Coccinelles", grade:"Crèche",        level:"nursery", cycle:"Petite enfance"},
    {id:"kg_pk", name:"Pré-maternelle A",         grade:"Pré-maternelle", level:"prekg",  cycle:"Petite enfance"},
    {id:"kg_1",  name:"Maternelle 1 A",           grade:"Maternelle 1",  level:"kg1",     cycle:"Petite enfance"},
    {id:"c5a",name:"5ème A",grade:"5ème année",level:"g5",cycle:"Primaire"},
    {id:"c6a",name:"6ème A",grade:"6ème année",level:"g6",cycle:"Primaire"},
    {id:"c9a",name:"3ème A",grade:"3ème année",level:"g3",cycle:"Primaire"},
    {id:"l2s",name:"4ème A",grade:"4ème année",level:"g4",cycle:"Primaire"},
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
    S("s4","Karim","Gharbi","c5a","p5",{gender:"Garçon"}),S("s5","Sarra","Mejri","c5a",null,{gender:"Fille"}),
    S("s6","Hamza","Bouazizi","c5a",null,{gender:"Garçon"}),S("s7","Nour","Jlassi","c5a",null,{gender:"Fille"}),
    S("s8","Bilel","Chaabane","c5a",null,{gender:"Garçon"}),S("s9","Rania","Sassi","c5a",null,{gender:"Fille"}),
    S("s10","Aziz","Hammami","c5a",null,{gender:"Garçon"}),
    S("s11","Salma","Ferchichi","c6a","p4",{gender:"Fille"}),S("s12","Wassim","Oueslati","c6a",null,{gender:"Garçon"}),
    S("s13","Mariem","Saidi","c9a",null,{gender:"Fille",dob:"2018-03-02"}),S("s14","Skander","Ayari","c9a",null,{gender:"Garçon",dob:"2018-07-12"}),
    S("s15","Yasmine","Bouzid","l2s",null,{gender:"Fille",dob:"2019-01-20"}),S("s16","Oussama","Mansouri","l2s",null,{gender:"Garçon",dob:"2019-09-05"}),
    S("s17","Firas","Nasri","c6a",null,{gender:"Garçon"}),S("s18","Ines","Hidri","c6a",null,{gender:"Fille"}),S("s19","Malek","Riahi","c6a",null,{gender:"Garçon"}),S("s20","Dorra","Lahmar","c6a",null,{gender:"Fille"}),
    S("s21","Aymen","Zouari","c9a",null,{gender:"Garçon"}),S("s22","Khouloud","Belhaj","c9a",null,{gender:"Fille"}),S("s23","Seif","Mabrouk","c9a",null,{gender:"Garçon"}),S("s24","Rim","Gabsi","c9a",null,{gender:"Fille"}),
    S("s25","Nadia","Toumi","l2s",null,{gender:"Fille"}),S("s26","Walid","Charfi","l2s",null,{gender:"Garçon"}),S("s27","Emna","Brahmi","l2s",null,{gender:"Fille"}),S("s28","Zied","Karray","l2s",null,{gender:"Garçon"}),

    // ── PETITE ENFANCE ────────────────────────────────────────────────────────
    // Adam Ben Salah (crèche) est le PETIT FRÈRE d'Amira (5ème A) — même parent,
    // p1. C'est la démonstration de tout le produit : aujourd'hui, ce père a
    // besoin de DEUX applications (Famly pour le petit, un ERP pour la grande).
    // Ici il en ouvre UNE. C'est ça, notre position sur le marché.
    S("s29","Adam","Ben Salah","kg_ns","p1",{gender:"Garçon",dob:"2024-02-11",allergies:"Lait de vache",medical:"Aucune"}),
    S("s30","Lina","Gharbi","kg_ns",null,{gender:"Fille",dob:"2024-05-03"}),
    S("s31","Rayan","Mejri","kg_ns",null,{gender:"Garçon",dob:"2023-11-20"}),
    S("s32","Maya","Trabelsi","kg_pk","p2",{gender:"Fille",dob:"2022-04-18",allergies:"Aucune"}),
    S("s33","Iyed","Khelifi","kg_pk",null,{gender:"Garçon",dob:"2022-08-09"}),
    S("s34","Sirine","Jlassi","kg_pk",null,{gender:"Fille",dob:"2022-01-27"}),
    S("s35","Nizar","Sassi","kg_1",null,{gender:"Garçon",dob:"2021-06-14"}),
    S("s36","Farah","Hammami","kg_1",null,{gender:"Fille",dob:"2021-09-30"}),
  ]
  // ── Candidatures (inscriptions) ────────────────────────────────────────────
  // Une campagne en cours, comme dans la vraie vie : des dossiers à toutes les
  // étapes, dont un en liste d'attente parce que la classe est pleine.
  const DAY=24*3600*1000
  const applications=[
    {id:"a1",childName:"Yassine Haddad",dob:"2023-03-14",level:"nursery",parentName:"Sofiane Haddad",
     parentPhone:"+216 22 100 100",parentEmail:"s.haddad@mail.tn",note:"",stage:"nouvelle",files:[],
     createdAt:Date.now()-2*DAY,studentId:null,
     history:[{at:Date.now()-2*DAY,stage:"nouvelle",by:"Parent (en ligne)"}]},
    {id:"a2",childName:"Selim Ayadi",dob:"2022-07-02",level:"prekg",parentName:"Rania Ayadi",
     parentPhone:"+216 22 200 200",parentEmail:"r.ayadi@mail.tn",note:"",stage:"pieces",
     files:[{type:"naissance",name:"acte-naissance.png",size:70,mime:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",at:Date.now()},{type:"photo",name:"photo.png",size:70,mime:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",at:Date.now()}],createdAt:Date.now()-5*DAY,studentId:null,
     history:[{at:Date.now()-5*DAY,stage:"nouvelle",by:"Parent (en ligne)"},
              {at:Date.now()-4*DAY,stage:"pieces",by:"Administration"}]},
    {id:"a3",childName:"Hana Zribi",dob:"2019-09-11",level:"g1",parentName:"Mehdi Zribi",
     parentPhone:"+216 22 300 300",parentEmail:"m.zribi@mail.tn",note:"Vient d'une école privée.",
     stage:"examen",files:[{type:"naissance",name:"acte-naissance.png",size:70,mime:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",at:Date.now()},{type:"photo",name:"photo.png",size:70,mime:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",at:Date.now()},{type:"domicile",name:"domicile.png",size:70,mime:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",at:Date.now()},{type:"bulletin",name:"bulletin.png",size:70,mime:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",at:Date.now()}],
     createdAt:Date.now()-8*DAY,studentId:null,
     history:[{at:Date.now()-8*DAY,stage:"nouvelle",by:"Parent (en ligne)"},
              {at:Date.now()-7*DAY,stage:"pieces",by:"Administration"},
              {at:Date.now()-6*DAY,stage:"examen",by:"Administration"}]},
    {id:"a4",childName:"Aymen Belkhir",dob:"2020-01-25",level:"g5",parentName:"Nadia Belkhir",
     parentPhone:"+216 22 400 400",parentEmail:"n.belkhir@mail.tn",note:"",stage:"accepte",
     files:[{type:"naissance",name:"acte-naissance.png",size:70,mime:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",at:Date.now()},{type:"photo",name:"photo.png",size:70,mime:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",at:Date.now()},{type:"domicile",name:"domicile.png",size:70,mime:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",at:Date.now()}],createdAt:Date.now()-12*DAY,studentId:null,
     history:[{at:Date.now()-12*DAY,stage:"nouvelle",by:"Parent (en ligne)"},
              {at:Date.now()-11*DAY,stage:"pieces",by:"Administration"},
              {at:Date.now()-10*DAY,stage:"examen",by:"Administration"},
              {at:Date.now()-9*DAY,stage:"accepte",by:"Lina Aderra"}]},
    {id:"a5",childName:"Molka Ghariani",dob:"2020-04-08",level:"g5",parentName:"Fathi Ghariani",
     parentPhone:"+216 22 500 500",parentEmail:"f.ghariani@mail.tn",note:"",stage:"attente",
     files:[{type:"naissance",name:"acte-naissance.png",size:70,mime:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",at:Date.now()},{type:"photo",name:"photo.png",size:70,mime:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",at:Date.now()},{type:"domicile",name:"domicile.png",size:70,mime:"image/png",data:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",at:Date.now()}],createdAt:Date.now()-14*DAY,studentId:null,
     history:[{at:Date.now()-14*DAY,stage:"nouvelle",by:"Parent (en ligne)"},
              {at:Date.now()-13*DAY,stage:"pieces",by:"Administration"},
              {at:Date.now()-12*DAY,stage:"examen",by:"Administration"},
              {at:Date.now()-11*DAY,stage:"accepte",by:"Lina Aderra"},
              {at:Date.now()-10*DAY,stage:"attente",by:"Administration",note:"5ème A pleine (10/24)."}]},
  ]
  // ── RH : contrats et congés ────────────────────────────────────────────────
  const hrContracts=[
    {staffId:"t1",   kind:"cdi", salary:1800, start:"2022-09-01", end:null},
    {staffId:"t_ee", kind:"cdi", salary:1500, start:"2023-09-01", end:null},
    {staffId:"u_admin", kind:"cdi", salary:1400, start:"2021-09-01", end:null},
  ]
  const hrLeaves=[
    {id:"l1",staffId:"t1",kind:"annuel",from:"2026-08-03",to:"2026-08-14",reason:"Vacances d'été.",
     days:12,stage:"demande",at:Date.now()-2*24*3600*1000,decidedBy:null,decidedAt:null},
    {id:"l2",staffId:"t_ee",kind:"maladie",from:"2026-07-06",to:"2026-07-07",reason:"Grippe.",
     days:2,stage:"accorde",at:Date.now()-9*24*3600*1000,decidedBy:"Lina Aderra",decidedById:"u_sadmin",decidedAt:Date.now()-8*24*3600*1000},
    {id:"l3",staffId:"u_admin",kind:"sansSolde",from:"2026-07-20",to:"2026-07-22",reason:"Affaire personnelle.",
     days:3,stage:"accorde",at:Date.now()-5*24*3600*1000,decidedBy:"Lina Aderra",decidedById:"u_sadmin",decidedAt:Date.now()-4*24*3600*1000},
  ]
  // ── Barème annuel, par niveau (DT). La petite enfance coûte plus cher : plus
  // d'encadrement, moins d'enfants par adulte. C'est la réalité du métier.
  const feeSchedule={
    nursery:{inscription:150,scolarite:2400,cantine:900,transport:0},
    prekg:  {inscription:150,scolarite:2200,cantine:900,transport:0},
    kg1:    {inscription:150,scolarite:2000,cantine:800,transport:0},
    kg2:    {inscription:150,scolarite:2000,cantine:800,transport:0},
    g1:{inscription:200,scolarite:1800,cantine:700,transport:600},
    g2:{inscription:200,scolarite:1800,cantine:700,transport:600},
    g3:{inscription:200,scolarite:1900,cantine:700,transport:600},
    g4:{inscription:200,scolarite:1900,cantine:700,transport:600},
    g5:{inscription:200,scolarite:2000,cantine:700,transport:600},
    g6:{inscription:200,scolarite:2100,cantine:700,transport:600},
  }
  // Adam est le 2e enfant de la famille Ben Salah : remise fratrie.
  const discounts=[
    {id:"dc1",studentId:"s29",kind:"fratrie",pct:10,amount:0,
     reason:"Deuxième enfant inscrit (sa sœur Amira est en 5ème A).",by:"Lina Aderra",at:Date.now()-3*24*3600*1000},
  ]
  // ── Installations louables ────────────────────────────────────────────────
  // `schoolSlots` : les créneaux de l'école. INTOUCHABLES — un cours d'EPS ne se
  // fait pas déloger par un club qui paie. La pédagogie passe avant l'argent.
  const facilities=[
    {id:"f_pool",name:"Piscine",kind:"piscine",capacity:30,rateInternal:0,rateExternal:80,
     schoolSlots:[{day:1,from:"09:00",to:"12:00",label:"Natation scolaire"},
                  {day:3,from:"09:00",to:"12:00",label:"Natation scolaire"}]},
    {id:"f_field",name:"Terrain de football",kind:"terrain",capacity:22,rateInternal:0,rateExternal:60,
     schoolSlots:[{day:2,from:"08:00",to:"12:00",label:"EPS"},
                  {day:4,from:"08:00",to:"12:00",label:"EPS"}]},
    {id:"f_gym",name:"Gymnase",kind:"gymnase",capacity:40,rateInternal:0,rateExternal:50,
     schoolSlots:[{day:5,from:"08:00",to:"13:00",label:"EPS"}]},
    {id:"f_audi",name:"Auditorium",kind:"auditorium",capacity:200,rateInternal:0,rateExternal:150,schoolSlots:[]},
  ]
  // ── Déclarations d'accident ───────────────────────────────────────────────
  // Une déclaration EN ATTENTE D'ACCUSÉ : c'est exactement le dossier qui explose
  // six mois plus tard si personne ne le voit. La direction doit le voir.
  const accidents=[
    {id:"ac1",childId:"s29",zones:["genou_g"],kind:"chute",severity:"benin",
     whatHappened:"Adam a glissé en courant dans la cour et s'est cogné le genou gauche contre le banc. Il a pleuré deux minutes, puis est reparti jouer.",
     care:["lavage","glace"],at:Date.now()-5*3600*1000,stage:"envoye",
     witness:{id:"t_ee",name:"Ines Belhadj",at:Date.now()-5*3600*1000},
     approver:{id:"u_sadmin",name:"Lina Aderra",at:Date.now()-4.5*3600*1000},
     sentAt:Date.now()-4*3600*1000,ack:null,reminders:[],notes:[]},
  ]
  // ── Dossier de l'enfant : santé + personnes autorisées ────────────────────
  const health={
    s29:{vaccines:{bcg:true,hepb0:true,penta1:true,penta2:true},allergies:"Lait de vache",
         meds:"",doctor:"Dr. Sami Ayari",notes:"Ne pas donner de produits laitiers."},
  }
  // Adam : deux parents autorisés. La CIN est obligatoire — l'agent la vérifie.
  const pickups={
    s29:[
      {id:"pk1",name:"Karim Ben Salah",relation:"Père",phone:"+216 20 888 111",cin:"09112233",
       addedBy:"Lina Aderra",addedAt:Date.now()-30*86400000,active:true},
      {id:"pk2",name:"Sonia Ben Salah",relation:"Mère",phone:"+216 20 888 112",cin:"09112244",
       addedBy:"Lina Aderra",addedAt:Date.now()-30*86400000,active:true},
    ],
  }
  const teachers=[
    {id:"t_ee",name:"Ines Belhadj",subject:"Petite enfance",classes:["kg_ns","kg_pk","kg_1"],gender:"Fille",qualification:"Éducatrice de jeunes enfants",experience:6,joiningDate:"2023-09-01",designation:"Éducatrice",phone:"+216 20 444 444",email:"creche@alnour.tn",address:"Tunis",salary:1500},
    {id:"t1",name:"Othman Ounis",subject:"Mathématiques",classes:["c5a","c6a"],gender:"Garçon",qualification:"Maîtrise en Mathématiques",experience:8,joiningDate:"2022-09-01",designation:"Instituteur principal",phone:"+216 20 333 333",email:"enseignant@alnour.tn",address:"Tunis",salary:1800},
    {id:"t2",name:"Hela Morjane",subject:"Éveil scientifique",classes:["c5a"],gender:"Fille",qualification:"Licence en Biologie",experience:5,joiningDate:"2023-09-01",designation:"Institutrice",phone:"+216 20 444 444",email:"hmorjane@alnour.tn",address:"Tunis",salary:1600},
    {id:"t3",name:"Sami Gabsi",subject:"Français",classes:["c6a","c9a"],gender:"Garçon",qualification:"Maîtrise de Français",experience:11,joiningDate:"2019-09-01",designation:"Professeur",phone:"+216 20 999 000",email:"sgabsi@alnour.tn",address:"Tunis",salary:1900},
  ]
  const users=demoUsers()
  const payments={}; students.forEach((s,i)=>{payments[s.id]=MONTHS.map((m,mi)=>{let st="paid";if(mi>=6)st="due";else if((i+mi)%7===0)st="overdue";else if((i+mi)%5===0)st="pending";return{month:m,status:st}})})
  // pre-seeded evaluation for 5ème A so dashboards/parents are not empty
  const c5=students.filter(s=>s.classId==="c5a"); const Bk=["excellent","good","average","weak"]
  const placements={}; ["q1","q2","q3","q4","q5"].forEach((q,qi)=>{placements[q]={}; c5.forEach((s,si)=>{placements[q][s.id]=Bk[(si+qi)%4]})})
  // deuxième évaluation (matière différente) pour prouver l'accumulation de l'historique
  const Bk2=["good","excellent","average","good"]
  const placements2={}; ["q1","q2","q3","q4","q5"].forEach((q,qi)=>{placements2[q]={}; c5.forEach((s,si)=>{placements2[q][s.id]=Bk2[(si+qi+1)%4]})})
  const evaluations=[
    {id:"ev_seed2",at:Date.now()-1800000,classId:"c5a",className:"5ème A",subject:"Éveil scientifique",lesson:"Les plantes",teacher:"Hela Morjane",placements:placements2,badges:{s2:"idea"},note:"Très bonne participation à l'expérience."},
    {id:"ev_seed",at:Date.now()-90000000,classId:"c5a",className:"5ème A",subject:"Mathématiques",lesson:"Les fractions",teacher:"Othman Ounis",placements,badges:{s1:"star",s3:"improved"},note:"Bonne séance, classe attentive."},
  ]
  // ── historique d'évaluations (~10 mois) pour alimenter le suivi Direction/Admin.
  // Déterministe (h32) : chaque élève a une "aptitude" stable → classements cohérents,
  // plus une légère progression dans le temps → les tendances ont du sens.
  {
    const DAY=86400000, subjPool=TT_SUBJECTS.map(([n])=>n), bkeys=['star','improved','team','idea','focus']
    const LESSONS={'Arabe':['Lecture','Dictée','Expression écrite','Grammaire'],'Français':['Lecture','Écriture','Conjugaison','Vocabulaire'],
      'Mathématiques':['Les fractions','Géométrie','Calcul mental','Problèmes'],'Éveil scientifique':['Le corps humain','Les plantes','La matière','Expériences'],
      'Éducation islamique':['Récitation','Valeurs','Histoires'],'Éducation civique':['Vivre ensemble','La Tunisie','Les règles'],
      'Sport':['Course','Jeux collectifs','Gymnastique'],'Musique':['Chant','Rythme','Écoute'],'Arts plastiques':['Dessin','Peinture','Collage'],'Informatique':['Clavier & souris','Dessin numérique','Découverte']}
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
          const lpool=LESSONS[subject]||['Général']
          const lesson=lpool[h32(cl.id+w+'l'+k)%lpool.length]
          const placements={}
          ;['q1','q2','q3','q4','q5'].forEach(q=>{ placements[q]={}
            kids.forEach(s=>{ const ability=0.25+R('ab'+s.id)*0.6, progress=(42-w)/42*0.08
              const lskew=(R('lw'+s.id+lesson)-0.5)*0.5   // force/faiblesse STABLE par leçon
              const r=ability+progress+lskew+(R(q+s.id+cl.id+w+k)-0.5)*0.34
              placements[q][s.id]= r>0.74?'excellent': r>0.52?'good': r>0.32?'average':'weak' }) })
          const badges={}
          if(h32('bg'+cl.id+w+k)%3===0){ const s=kids[h32('bs'+cl.id+w+k)%kids.length]; badges[s.id]=bkeys[h32('bk'+cl.id+w+k)%bkeys.length] }
          evaluations.push({id:`ev_${cl.id}_${w}_${k}`,at,classId:cl.id,className:cl.name,subject,lesson,teacher,placements,badges,note:''})
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
  const routes=[{id:"r1",name:"Circuit A · Nord",driver:"Sami",phone:"+21698123456",bus:"TUN-1023",stops:["La Marsa","Carthage","Sidi Bou Saïd"],students:6},{id:"r2",name:"Circuit B · Sud",driver:"Foued",phone:"+21698654321",bus:"TUN-2087",stops:["Radès","Ezzahra","Hammam Lif"],students:4}]
  const homework=[{id:"hw1",at:Date.now()-7200000,by:"t1",classId:"c5a",subject:"Mathématiques",title:"Exercices 3.1 à 3.4",due:"2026-06-28",details:"Résoudre tous les problèmes."},{id:"hw2",at:Date.now()-90000000,by:"t2",classId:"c5a",subject:"Éveil scientifique",title:"Schéma de la cellule",due:"2026-06-27",details:"Dessiner + légender."}]
  const events=[{id:"e1",date:"2026-06-29",title:"Réunion parents–enseignants",type:"Réunion",desc:"Tous les niveaux, 09:00–12:00."},{id:"e2",date:"2026-07-02",title:"Fête de fin d'année",type:"Événement",desc:"Spectacle des élèves."},{id:"e3",date:"2026-07-05",title:"Début des examens",type:"Examen",desc:"Voir le calendrier."},{id:"e4",date:"2026-07-12",title:"Sortie pédagogique — Musée du Bardo",type:"Événement",desc:"6ème année."}]
  const exams=[{id:"x1",class:"5ème A",subject:"Mathématiques",date:"2026-07-05",total:100},{id:"x2",class:"5ème A",subject:"Éveil scientifique",date:"2026-07-07",total:100},{id:"x3",class:"6ème A",subject:"Mathématiques",date:"2026-07-06",total:100},{id:"x4",class:"3ème A",subject:"Français",date:"2026-07-08",total:100}]
  const messages=[{id:"m1",from:"u_sadmin",to:"p1",text:"Bienvenue sur Coreon Edu ! N'hésitez pas si vous avez besoin.",at:Date.now()-5400000,read:true},{id:"m2",from:"p1",to:"u_sadmin",text:"Merci ! Une question sur le calendrier des frais.",at:Date.now()-5000000,read:true}]
  // classId : restreint une notification de rôle à une classe (cf. notify.js)
  const N=(to,role,kind,actor,title,body,link,mins,read=false,classId=null)=>({id:"n"+mins+kind,to,role,classId,kind,actor,title,body,link,at:Date.now()-mins*60000,read})
  const notifications=[
    N("u_admin",null,"request","Othman Ounis","a demandé une attestation de salaire","Attestation de salaire · en attente","/app/requests",55),
    N(null,"admin","incident","Dali Brahmi","a signalé un incident","Élève malade (Karim) · Santé","/app/incidents",90),
    N(null,"parent","evaluation","Othman Ounis","a publié une évaluation","Mathématiques · 5ème A","/app",60,false,"c5a"),
    // un rappel d'impayé ne se diffuse pas à toutes les familles : il vise un parent
    N("p1",null,"payment","Administration","rappel de paiement","2 mois impayés","/app/payments",120),
    N(null,"admin","info","Othman Ounis","a fait l'appel — 5ème A","9 présents · 1 absent","/app/attendance",30),
    N(null,"parent","notice","Direction","nouvelle annonce","Réunion parents–enseignants le 29/06","/app/notices",200,true),
    N("u_sadmin",null,"message","Karim Ben Salah","vous a envoyé un message","Une question sur le calendrier des frais","/app/messages",240,true),
  ]
  const POS={schooladmin:"Directrice",admin:"Agent administratif",supervisor:"Surveillant général",teacher:"Instituteur principal",owner:"Propriétaire"}
  const GV=["Tunis","Ariana","Ben Arous","Sousse","Sfax","Nabeul","Bizerte","Manouba"]
  users.forEach((u,i)=>{u.cin=u.cin||String(10000000+i*1111111).slice(0,8);u.governorate=u.governorate||GV[i%GV.length];u.position=u.position||POS[u.role];u.attachments=u.attachments||[]})
  teachers.forEach((t,i)=>{t.cin=t.cin||String(11000000+i*1234567).slice(0,8);t.governorate=t.governorate||GV[i%GV.length];t.position=t.position||t.designation||"Professeur";t.attachments=t.attachments||[{name:"CIN_recto.pdf",type:"Copie CIN"},{name:"Diplome.pdf",type:"Diplôme(s)"}]})
  students.forEach((st,i)=>{st.cin=st.cin||("ACTE-"+(20150100+i));st.governorate=st.governorate||GV[i%GV.length];st.attachments=st.attachments||(i<2?[{name:"extrait_naissance.pdf",type:"Extrait de naissance"}]:[])})
  // ── 6 semaines d'appels (jours ouvrés, toutes classes) pour les insights de
  // présence. Même graine d'"aptitude" que les évaluations : les élèves en
  // difficulté s'absentent plus → la détection d'absentéisme a du sens. ──
  const attendance={}
  const staffAttendance={}   // présence du personnel (enseignants + administration)
  {
    const Ra=s=>h32('kogia:'+s+':edu-2026-seed')/4294967295
    const staffIds=[...teachers.map(t=>t.id),'u_admin','u_super']
    for(let dd=0; dd<45; dd++){
      const date=new Date(Date.now()-dd*86400000)
      const wd=date.getDay(); if(wd===0||wd===6) continue
      const iso=date.toISOString().slice(0,10)
      classes.forEach(cl=>{
        const rec={}
        students.filter(s=>s.classId===cl.id).forEach(s=>{
          const ability=Ra('ab'+s.id), r=Ra('att'+s.id+iso)
          const pAbs=0.02+(1-ability)*0.13
          rec[s.id]= r<pAbs?'absent': r<pAbs+0.05?'late':'present'
        })
        attendance[cl.id+'_'+iso]=rec
      })
      const srec={}
      staffIds.forEach(id=>{ const r=Ra('staff'+id+iso)
        srec[id]= r<0.03?'absent': r<0.065?'late': r<0.09?'conge':'present' })
      staffAttendance[iso]=srec
    }
  }
  const settings={ levels:['nursery','prekg','kg1','kg2','g1','g2','g3','g4','g5','g6'], schoolName:'École Al-Nour', shortName:'Al-Nour', city:'Tunis', year:'2025–2026',
    director:'Lina Aderra', phone:'+216 71 000 000', email:'contact@alnour.tn', address:'Avenue Habib Bourguiba, Tunis',
    brand:BRAND.indigo, logoText:'AN', currency:'DT' }
  // ── écoles clientes de la plateforme (console Kogia Group). Al-Nour est
  // l'école de démo « vivante » ; les autres sont des abonnements clients. ──
  const schools=[
    {id:"sc1",name:"École Al-Nour",city:"Tunis",plan:"Pro",price:149,status:"active",since:"2025-09-01",studentCount:null,director:"Lina Aderra",email:"direction@alnour.tn",live:true},
    {id:"sc2",name:"École El-Fateh",city:"Sfax",plan:"Essentiel",price:79,status:"active",since:"2025-10-15",studentCount:212,director:"Mounir Kchaou",email:"direction@elfateh.tn"},
    {id:"sc3",name:"Institut Ibn Khaldoun",city:"Sousse",plan:"Pro",price:149,status:"active",since:"2026-01-10",studentCount:385,director:"Salwa Masmoudi",email:"direction@ibnkhaldoun.tn"},
    {id:"sc4",name:"École Les Jasmins",city:"Ariana",plan:"Essentiel",price:79,status:"trial",since:"2026-06-20",studentCount:96,director:"Hatem Baccar",email:"contact@jasmins.tn"},
  ]
  // pointage du personnel : arrivées / sorties réelles (badgeuse virtuelle)
  const staffClock={}
  {
    const Rc=s=>h32('kogia:'+s+':edu-2026-seed')/4294967295
    const staffIds=[...teachers.map(t=>t.id),'u_admin','u_super']
    const pad=n=>String(n).padStart(2,'0')
    for(let dd=1; dd<=21; dd++){
      const date=new Date(Date.now()-dd*86400000); const wd=date.getDay(); if(wd===0||wd===6) continue
      const iso=date.toISOString().slice(0,10); const rec={}
      staffIds.forEach(id=>{
        const r=Rc('clk'+id+iso); if(r<0.05) return                    // absent → pas de pointage
        const inMin=460+Math.floor(Rc('in'+id+iso)*45)                 // 07:40–08:25
        const outMin=1000+Math.floor(Rc('out'+id+iso)*50)              // 16:40–17:30
        rec[id]={in:pad(Math.floor(inMin/60))+':'+pad(inMin%60), out:pad(Math.floor(outMin/60))+':'+pad(outMin%60)}
      })
      staffClock[iso]=rec
    }
  }
  // congés du personnel : demandes datées, approuvées par la Direction
  const D=86400000, iso=o=>new Date(Date.now()+o*D).toISOString().slice(0,10)
  const staffLeaves=[
    {id:"lv1",staffId:"t2",type:"annuel",from:iso(-24),to:iso(-22),days:3,reason:"Congé annuel",status:"approved",at:Date.now()-26*D,by:"Lina Aderra"},
    {id:"lv2",staffId:"u_super",type:"maladie",from:iso(-9),to:iso(-8),days:2,reason:"Grippe (certificat fourni)",status:"approved",at:Date.now()-10*D,by:"Lina Aderra"},
    {id:"lv3",staffId:"t3",type:"annuel",from:iso(6),to:iso(10),days:4,reason:"Voyage familial",status:"pending",at:Date.now()-1*D,by:null},
    {id:"lv4",staffId:"u_admin",type:"exceptionnel",from:iso(-40),to:iso(-40),days:1,reason:"Événement familial",status:"approved",at:Date.now()-42*D,by:"Lina Aderra"},
  ]
  // ── Espace parents : trois activités pour montrer tout le cycle de vie ──
  const socialEvents=demoSocialEvents()

  // ── Poste de sécurité : registre, rondes, main courante ──
  const hm=d=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  const todayISO=dISO(0)
  const visitors=[
    {id:'v1',date:todayISO,name:'Nizar Ben Amor',idType:'CIN',idNumber:'0912****',org:'Papeterie El Amel',purpose:'Livraison',hostName:'Karim Jelassi',
     inAt:'08:12',outAt:'08:31',badge:'V-001',escort:false,escortName:'',vehicle:'214 TU 3120',agentName:'Mongi Zouaoui'},
    {id:'v2',date:todayISO,name:'Sonia Ferchichi',idType:'CIN',idNumber:'0731****',org:'',purpose:'Rencontre avec un enseignant',hostName:'Hela Morjane',
     inAt:'10:05',outAt:null,badge:'V-002',escort:true,escortName:'Dali Brahmi',vehicle:'',agentName:'Mongi Zouaoui'},
  ]
  const rounds=[
    {id:'r1',date:todayISO,agentName:'Mongi Zouaoui',startAt:'07:15',endAt:'07:38',
     points:[{k:'portail',at:'07:15',anomaly:''},{k:'cour',at:'07:20',anomaly:''},{k:'batiment',at:'07:26',anomaly:''},
             {k:'biblio',at:'07:30',anomaly:''},{k:'technique',at:'07:34',anomaly:'Extincteur du couloir : pression basse'},{k:'parking',at:'07:38',anomaly:''}]},
  ]
  const logbook=[
    {id:'l1',at:Date.now()-9*HR, agentName:'Mongi Zouaoui',kind:'prise',place:'Poste de garde',text:"Prise de service. Clés du portail et du bâtiment récupérées."},
    {id:'l2',at:Date.now()-8.5*HR,agentName:'Mongi Zouaoui',kind:'ronde',place:'Périmètre',text:'Ronde du matin effectuée, 6 points de passage.'},
    {id:'l3',at:Date.now()-8.4*HR,agentName:'Mongi Zouaoui',kind:'anomalie',place:'Local technique',text:"Extincteur du couloir : pression basse. Signalé à la Direction."},
    {id:'l4',at:Date.now()-7*HR, agentName:'Mongi Zouaoui',kind:'visiteur',place:'Portail principal',text:'Livraison Papeterie El Amel — badge V-001, sorti à 08:31.'},
  ]

  return {classes,students,teachers,users,applications,journal:[],hrContracts,hrLeaves,hrPayrolls:[],feeSchedule,discounts,invoices:[],receipts:[],reports:[],promotions:[],facilities,bookings:[],memberships:[],accidents,health,pickups,departures:[],milestones:{},payments,evaluations,incidents,requests,behavior:seedBehavior(students),moments:seedMoments(students),canteen:seedCanteen(students),books,routes,homework,events,socialEvents,exams,messages,attendance,staffAttendance,staffLeaves,staffClock,notifications,visitors,rounds,logbook,timetables:genTimetables(classes),settings,schools}
}
// Quelques observations de comportement de démonstration — l'encouragement
// d'abord, pour que l'écran raconte quelque chose dès la première ouverture.
function seedBehavior(students){
  const H=3600000, out=[]
  const pick=(sid,trait,pos,pts,note,hAgo,by='Othman Ounis')=>{
    const s=students.find(x=>x.id===sid); if(!s) return
    out.push({id:'bh_'+sid+'_'+trait+'_'+hAgo,studentId:sid,classId:s.classId,trait,positive:pos,points:pts,note,byId:'t1',byName:by,at:Date.now()-hAgo*H,removed:null})
  }
  pick('s1','entraide',true,2,"A aidé Youssef à ranger la bibliothèque.",3)
  pick('s1','participation',true,1,"",28)
  pick('s2','effort',true,2,"A beaucoup progressé en lecture cette semaine.",5)
  pick('s2','bavardage',false,-1,"",50)
  pick('s3','creativite',true,1,"Belle idée pour le projet de classe.",7)
  pick('s4','respect',true,1,"",26)
  pick('s29','autonomie',true,1,"Range ses affaires tout seul, bravo.",4,'Ines Belhadj')
  pick('s1','progres',true,2,"",72)
  return out
}
// Quelques moments de démonstration. Les images sont de petits dégradés (SVG en
// data-URL) — assez pour montrer la mécanique sans alourdir la base. Dans la vraie
// vie, ce sont des photos compressées côté client (Gallery.jsx).
function seedMoments(students){
  const H=3600000
  const grad=(a,b)=>`data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='400' height='300' fill='url(%23g)'/></svg>`)}`
  const img=(a,b)=>({type:'image',data:grad(a,b),name:'moment.svg'})
  const has=id=>students.some(s=>s.id===id)
  const out=[]
  // un moment « de classe » (crèche) + un moment identifié
  if(has('s29')) out.push({id:'mo_seed1',classId:students.find(s=>s.id==='s29')?.classId||'kg_ns',childIds:[],caption:"Atelier peinture ce matin — tout le monde a adoré !",media:[img('#F9A8D4','#A78BFA'),img('#FDE68A','#FCA5A5')],consentOnly:false,by:'t_ee',byName:'Ines Belhadj',at:Date.now()-3*H,likes:['p1']})
  if(has('s1')) out.push({id:'mo_seed2',classId:students.find(s=>s.id==='s1')?.classId||'c5a',childIds:['s1'],caption:"Amira a lu son premier texte devant la classe. Bravo !",media:[img('#6EE7B7','#3B82F6')],consentOnly:false,by:'t1',byName:'Othman Ounis',at:Date.now()-26*H,likes:[]})
  return out
}
// Un menu de la semaine de démonstration — dont un plat aux arachides le lundi,
// pour que l'ALERTE ALLERGIE se déclenche sur Amira (allergique aux arachides)
// dès la première ouverture : c'est la fonctionnalité qui protège l'enfant.
function seedCanteen(students){
  const dish=(name,allergens=[])=>({name,allergens})
  const menu={
    lun:[dish("Poulet, sauce cacahuète",['arachide']), dish("Riz aux légumes"), dish("Yaourt",['lait'])],
    mar:[dish("Poisson pané",['poisson','gluten']), dish("Purée de pommes de terre",['lait']), dish("Compote de pommes")],
    mer:[dish("Pâtes bolognaise",['gluten']), dish("Salade verte"), dish("Fruit de saison")],
    jeu:[dish("Omelette",['oeuf']), dish("Haricots verts"), dish("Fromage blanc",['lait'])],
    ven:[dish("Couscous aux légumes",['gluten']), dish("Salade"), dish("Flan",['lait','oeuf'])],
  }
  // inscrire à la cantine quelques enfants, dont Amira (s1) et Adam (s29) —
  // ceux qui portent une allergie, pour que la démonstration ait du sens.
  const subs=['s1','s2','s3','s29','s4'].filter(id=>students.some(s=>s.id===id))
  return { menu, subscribers: subs }
}
// `levels` : les niveaux que l'école accueille RÉELLEMENT. C'est ce qui décide
// des modules visibles (core/src/levels.js). L'école de démo fait crèche ET
// primaire — c'est justement le cas que personne d'autre ne sait servir.
export const DEFAULT_SETTINGS={ levels:['nursery','prekg','kg1','kg2','g1','g2','g3','g4','g5','g6'], schoolName:'École Al-Nour', shortName:'Al-Nour', city:'Tunis', year:'2025–2026', director:'Lina Aderra', phone:'+216 71 000 000', email:'contact@alnour.tn', address:'Avenue Habib Bourguiba, Tunis', brand:BRAND.indigo, logoText:'AN', currency:'DT' }
export const settings=()=>({...DEFAULT_SETTINGS, ...(db().settings||{})})
export function saveSettings(patch){ return mutate(d=>{ d.settings={...DEFAULT_SETTINGS, ...(d.settings||{}), ...patch} }) }
// ── Chargement + MIGRATION ──────────────────────────────────────────────────
// La clé de stockage ne contient plus le numéro de version : elle était incrémentée
// à chaque évolution du schéma (coreon_db_v17 → v18 …), ce qui abandonnait la base
// précédente et RÉINSTALLAIT les données de démonstration par-dessus les vraies
// données de l'école. La version vit désormais DANS la base (`_v`) et on migre.
const COLLECTIONS={classes:[],students:[],teachers:[],users:[],evaluations:[],incidents:[],requests:[],behavior:[],moments:[],canteen:{},books:[],routes:[],homework:[],events:[],socialEvents:[],exams:[],messages:[],notifications:[],staffLeaves:[],schools:[],visitors:[],rounds:[],logbook:[],payments:{},attendance:{},staffAttendance:{},staffClock:{},timetables:{}}

function migrate(d){
  const from=d._v||0
  for(const [k,def] of Object.entries(COLLECTIONS)) if(d[k]==null) d[k]=Array.isArray(def)?[]:{}
  if(!Object.keys(d.timetables).length) d.timetables=genTimetables(d.classes)
  if(!d.settings) d.settings={...DEFAULT_SETTINGS}

  if(from<21){
    // Poste de sécurité : registre des visiteurs, rondes, main courante.
    d.visitors=d.visitors||[]; d.rounds=d.rounds||[]; d.logbook=d.logbook||[]
    // les activités connaissent désormais leur espace et leur volet sécurité
    d.socialEvents.forEach(e=>{ if(!e.space) e.space='parent'; if(!e.security) e.security=null })
  }

  // ── Comptes et contenus de démonstration manquants ────────────────────────
  // Migrer le schéma ne suffit pas : une base créée avant l'ajout d'un rôle n'a
  // jamais reçu son compte. C'est ainsi que l'agent de sécurité n'existait tout
  // simplement pas sur les navigateurs déjà installés — le bouton de démo aussi.
  // Garde-fou : on ne complète QUE l'école de démonstration ; jamais les données
  // d'une vraie école (reconnue à son nom d'établissement).
  const isDemoSchool = !d.settings || d.settings.schoolName === DEFAULT_SETTINGS.schoolName
  if(isDemoSchool){
    demoUsers().forEach(u=>{ if(!d.users.some(x=>x.id===u.id)) d.users.push({...u}) })
    // rétablir le lien parent↔enfant des comptes réintroduits (les deux côtés)
    d.users.filter(u=>u.role==='parent').forEach(p=>{
      ;(p.childIds||[]).forEach(id=>{ const s=d.students.find(x=>x.id===id); if(s && !s.parentId) s.parentId=p.id })
    })
    demoSocialEvents().forEach(e=>{ if(!d.socialEvents.some(x=>x.id===e.id)) d.socialEvents.push({...e}) })
  }
  if(from<20){
    // Espace parents : les parents ont besoin d'une civilité pour les activités
    // réservées aux mères ou aux pères. On ne devine pas — on laisse vide.
    d.users.filter(u=>u.role==='parent').forEach(p=>{ if(p.gender===undefined) p.gender=null })
  }
  if(from<19){
    // les notifications de rôle peuvent désormais cibler une classe (cf. notify.js)
    d.notifications.forEach(n=>{ if(n.classId===undefined) n.classId=null })
    // répare la dissymétrie historique student.parentId ↔ user.childIds
    d.users.filter(u=>u.role==='parent').forEach(p=>{ p.childIds=(p.childIds||[]).filter(id=>d.students.some(s=>s.id===id)) })
    d.students.forEach(s=>{
      if(!s.parentId) return
      const p=d.users.find(u=>u.id===s.parentId)
      if(!p){ s.parentId=null; return }
      p.childIds=p.childIds||[]
      if(!p.childIds.includes(s.id)) p.childIds.push(s.id)
    })
    d.users.filter(u=>u.role==='parent').forEach(p=>{
      p.childIds.forEach(id=>{ const s=d.students.find(x=>x.id===id); if(s&&!s.parentId) s.parentId=p.id })
    })
  }
  d._v=SCHEMA
  return d
}

function load(){
  try{ const raw=getItem(KEY); if(raw) return JSON.parse(raw) }catch{ /* corrompu */ }
  // reprise d'une base écrite par une version antérieure (clé versionnée)
  for(const legacy of LEGACY_KEYS){
    try{ const raw=getItem(legacy); if(raw){ const d=JSON.parse(raw); removeItem(legacy); return d } }catch{ /* ignore */ }
  }
  return null
}

export function db(){
  let d=load()
  const fresh=!d
  if(fresh) d=seed()
  const before=d._v
  d=migrate(d)
  if(fresh||before!==d._v) save(d)
  return d
}
export function setTimetableCell(classId,pi,di,cell){ return mutate(d=>{ d.timetables=d.timetables||{}; d.timetables[classId]=d.timetables[classId]||Array.from({length:6},()=>Array(5).fill(null)); d.timetables[classId][pi]=d.timetables[classId][pi]||Array(5).fill(null); d.timetables[classId][pi][di]=cell }) }
// Une sauvegarde qui échoue n'est plus silencieuse : elle RÉPOND (false) et
// prévient l'application (onSaveFailure → un toast, une bannière). Avaler
// l'échec a déjà produit un faux reçu de candidature — plus jamais.
let onFail=null
export function onSaveFailure(fn){ onFail=fn }
export function save(d){
  const ok=setItem(KEY,JSON.stringify(d))
  if(!ok&&onFail){ try{ onFail() }catch{ /* le garde-fou ne casse rien */ } }
  return ok
}
export function mutate(fn){const d=db();fn(d);save(d);return d}
export function resetDb(){removeItem(KEY)}
export const uid=(p="id")=>p+"_"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3)

// ── lien parent ↔ enfant ────────────────────────────────────────────────────
// Il existe des deux côtés : `student.parentId` ET `user.childIds`. La page Élèves
// n'écrivait que le premier, la page Comptes que le second, alors que l'application
// lit les deux : selon l'écran ayant créé le lien, le parent ne recevait aucune
// notification, ou bien ne voyait ni ses paiements ni le suivi en direct.
// Ces fonctions écrivent toujours les DEUX côtés.
function attach(d, s, parentId){
  if(s.parentId && s.parentId!==parentId){
    const old=d.users.find(u=>u.id===s.parentId)
    if(old) old.childIds=(old.childIds||[]).filter(id=>id!==s.id)
  }
  s.parentId=parentId||null
  if(parentId){
    const p=d.users.find(u=>u.id===parentId)
    if(p){ p.childIds=p.childIds||[]; if(!p.childIds.includes(s.id)) p.childIds.push(s.id) }
  }
}
export function setStudentParent(d, studentId, parentId){
  const s=d.students.find(x=>x.id===studentId); if(s) attach(d,s,parentId)
}
export function setParentChildren(d, parentId, childIds=[]){
  const p=d.users.find(u=>u.id===parentId); if(!p) return
  ;(p.childIds||[]).filter(id=>!childIds.includes(id)).forEach(id=>{
    const s=d.students.find(x=>x.id===id); if(s && s.parentId===parentId) s.parentId=null
  })
  p.childIds=[]
  childIds.forEach(id=>{ const s=d.students.find(x=>x.id===id); if(s) attach(d,s,parentId) })
}

// La clé d'un appel : `${classId}_${iso}`. Un identifiant de classe peut LUI-MÊME
// contenir des « _ » (kg_ns, kg_pk…) — on coupe donc au DERNIER underscore, jamais
// au premier. Couper au premier rendait /app/attendance blanc pour la direction
// (« Invalid time value », trouvé au smoke test du 2026-07-15) et faussait en
// silence l'agrégation de présence du tableau de bord pour la petite enfance.
export const attKey=(classId,iso)=>classId+'_'+iso
export function attParts(key){ const i=key.lastIndexOf('_'); return { classId:key.slice(0,i), iso:key.slice(i+1) } }

export const studentById=id=>db().students.find(s=>s.id===id)
export const classById=id=>db().classes.find(c=>c.id===id)
export const studentsOfClass=cid=>db().students.filter(s=>s.classId===cid)
export const userById=id=>db().users.find(u=>u.id===id)
