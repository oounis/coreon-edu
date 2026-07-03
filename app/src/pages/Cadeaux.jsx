import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { current } from '../auth.js'
import { db, studentById, classById } from '../db.js'
import { PageHead, Card, Btn, Modal, Field, Select } from '../components/ui.jsx'
import { Tag, Mail, Bookmark, Download, Gift, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const img=n=>`${import.meta.env.BASE_URL}library/${n}.jpg`
const IMGS=Array.from({length:50},(_,i)=>i+1)
function loadImg(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src }) }
async function toData(src){ const i=await loadImg(src); const c=document.createElement('canvas'); c.width=i.naturalWidth; c.height=i.naturalHeight; c.getContext('2d').drawImage(i,0,0); return {url:c.toDataURL('image/jpeg',0.86), w:i.naturalWidth, h:i.naturalHeight} }
const fit=(iw,ih,bw,bh)=>{ const r=Math.min(bw/iw,bh/ih); return {w:iw*r,h:ih*r} }
const rgb=hex=>{const n=parseInt(hex.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255]}

const GIFTS=[
  {key:'labels', title:'Étiquettes de cahiers', desc:'Une planche de 10 étiquettes à coller sur les cahiers et le cartable.', Icon:Tag, color:'#6C5CE7', defImg:42},
  {key:'card',   title:'Carte de vœux',        desc:'Une jolie carte personnalisée : Aïd, anniversaire, bravo…', Icon:Mail, color:'#FF6B81', defImg:12},
  {key:'bookmark',title:'Marque-pages',        desc:'Des marque-pages à imprimer et découper pour la lecture.', Icon:Bookmark, color:'#22C55E', defImg:16},
]
const OCC={
  bravo:   {t:'Bravo',              m:'Félicitations pour tes beaux efforts, continue comme ça !'},
  aid:     {t:'Joyeux Aïd',         m:'Que cette fête t’apporte joie et bonheur.'},
  anniv:   {t:'Joyeux anniversaire',m:'Passe une merveilleuse journée pleine de surprises !'},
  nouvelan:{t:'Bonne année',        m:'Plein de réussite et de sourires pour cette nouvelle année.'},
  vacances:{t:'Bonnes vacances',    m:'Repose-toi bien et amuse-toi comme il faut !'},
}

async function pdfLabels(name, cls, n){
  const doc=new jsPDF({unit:'mm',format:'a4'}); const im=await toData(img(n))
  const W=210,H=297,M=12,gx=8,gy=6,cols=2,rows=5
  const lw=(W-2*M-gx)/cols, lh=(H-2*M-(rows-1)*gy)/rows
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const x=M+c*(lw+gx), y=M+r*(lh+gy)
    doc.setDrawColor(220,224,232); doc.setFillColor(250,250,253); doc.roundedRect(x,y,lw,lh,3,3,'FD')
    const s=lh-16; doc.addImage(im.url,'JPEG',x+5,y+(lh-s)/2,s,s,undefined,'FAST')
    const tx=x+5+s+7, tw=lw-s-20
    doc.setTextColor(120,125,140); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text('Ce cahier appartient à',tx,y+13)
    doc.setTextColor(30,36,51); doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text(doc.splitTextToSize(name,tw),tx,y+21)
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(140,145,160); doc.text(cls||'',tx,y+lh-7)
  }
  doc.save(`etiquettes-${name}.pdf`)
}
async function pdfCard(name, occ, n, color){
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a5'}); const W=210,H=148,[R,G,B]=rgb(color)
  doc.setFillColor(R,G,B); doc.rect(0,0,W,H,'F')
  doc.setFillColor(255,255,255); doc.roundedRect(7,7,W-14,H-14,5,5,'F')
  const im=await toData(img(n)); const f=fit(im.w,im.h,W*0.4,H-36); doc.addImage(im.url,'JPEG',16,(H-f.h)/2,f.w,f.h,undefined,'FAST')
  const tx=16+W*0.4+8, o=OCC[occ]
  doc.setTextColor(R,G,B); doc.setFont('helvetica','bold'); doc.setFontSize(24); doc.text(o.t,tx,H/2-8,{maxWidth:W-tx-14})
  doc.setFontSize(28); doc.text(`${name.split(' ')[0]} !`,tx,H/2+6,{maxWidth:W-tx-14})
  doc.setTextColor(90,95,110); doc.setFont('helvetica','normal'); doc.setFontSize(12); doc.text(o.m,tx,H/2+20,{maxWidth:W-tx-14})
  doc.setFontSize(8); doc.setTextColor(160,165,180); doc.text('Avec toute l’affection de ton école · Kogia Edu',tx,H-18)
  doc.save(`carte-${occ}-${name}.pdf`)
}
async function pdfBookmarks(name, cls, n, color){
  const doc=new jsPDF({unit:'mm',format:'a4'}); const im=await toData(img(n)); const W=210,H=297,[R,G,B]=rgb(color)
  const M=14, gap=10, cols=4, bw=(W-2*M-(cols-1)*gap)/cols, bh=H-2*M
  for(let c=0;c<cols;c++){ const x=M+c*(bw+gap), y=M
    doc.setFillColor(R,G,B); doc.roundedRect(x,y,bw,bh,4,4,'F')
    doc.setFillColor(255,255,255); doc.roundedRect(x+3,y+3,bw-6,bh-6,3,3,'F')
    const s=bw-14; doc.addImage(im.url,'JPEG',x+7,y+8,s,s,undefined,'FAST')
    doc.setTextColor(R,G,B); doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text(doc.splitTextToSize(name,bw-10),x+bw/2,y+16+s,{align:'center'})
    doc.setTextColor(120,125,140); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text('Bonne lecture !',x+bw/2,y+30+s,{align:'center'})
    for(let k=0;k<9;k++){ doc.setFillColor(R,G,B); doc.circle(x+bw/2,y+50+s+k*22,1.4,'F') }
    doc.setFontSize(7); doc.setTextColor(170); doc.text(cls||'',x+bw/2,bh+M-6,{align:'center'})
  }
  doc.save(`marque-pages-${name}.pdf`)
}

export default function Cadeaux(){
  const u=current(); const d=db()
  const isParent=u.role==='parent'
  const students = isParent ? (u.childIds||[]).map(studentById).filter(Boolean) : d.students
  const [sid,setSid]=useState(students[0]?.id)
  const student=students.find(s=>s.id===sid)||students[0]
  const cls=student?classById(student.classId):null
  const [gift,setGift]=useState(null); const [pick,setPick]=useState(42); const [occ,setOcc]=useState('bravo'); const [busy,setBusy]=useState(false)

  const openGift=g=>{ setGift(g); setPick(g.defImg) }
  const make=async()=>{ if(!student)return; setBusy(true)
    try{
      if(gift.key==='labels') await pdfLabels(student.name, cls?.name, pick)
      else if(gift.key==='card') await pdfCard(student.name, occ, pick, gift.color)
      else await pdfBookmarks(student.name, cls?.name, pick, gift.color)
      toast.success('Cadeau prêt — PDF téléchargé 🎁')
    }catch{ toast.error('Impossible de générer le PDF') }
    setBusy(false)
  }

  if(!student) return <Card className="p-10 text-center text-muted">Aucun enfant associé à ce compte.</Card>

  return (<>
    <PageHead title="Le Coin des Cadeaux" sub="De jolis cadeaux personnalisés à imprimer pour votre enfant."
      action={students.length>1&&<Field label={isParent?'Enfant':'Élève'}><Select value={sid} onChange={e=>setSid(e.target.value)}>{students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>}/>

    <div className="grid sm:grid-cols-3 gap-5">
      {GIFTS.map(g=>(
        <button key={g.key} onClick={()=>openGift(g)} className="card p-6 text-left hover:shadow-xl hover:-translate-y-0.5 transition relative overflow-hidden">
          <span className="absolute right-0 top-0 w-24 h-24 rounded-full -mr-8 -mt-8" style={{background:g.color+'14'}}/>
          <span className="relative w-12 h-12 rounded-2xl grid place-items-center text-white" style={{background:g.color}}><g.Icon size={22}/></span>
          <h3 className="relative font-extrabold text-lg mt-4">{g.title}</h3>
          <p className="relative text-sm text-muted mt-1">{g.desc}</p>
          <div className="relative flex items-center gap-1 text-xs font-bold mt-3" style={{color:g.color}}><Gift size={13}/> Créer pour {student.name.split(' ')[0]}</div>
        </button>
      ))}
    </div>

    <Modal open={!!gift} onClose={()=>setGift(null)} size="2xl"
      title={gift?<span className="flex items-center gap-2"><gift.Icon size={16} style={{color:gift.color}}/> {gift.title} · {student.name.split(' ')[0]}</span>:''}
      footer={gift&&<><div className="flex-1 text-xs text-muted self-center">Format A4/A5 · prêt à imprimer</div><Btn variant="ghost" onClick={()=>setGift(null)}>Fermer</Btn><Btn onClick={make} disabled={busy}><Download size={15}/> {busy?'…':'Télécharger le PDF'}</Btn></>}>
      {gift&&<div className="grid md:grid-cols-[1fr_260px] gap-5">
        {/* live preview */}
        <div>
          <div className="text-xs font-bold uppercase text-muted mb-2">Aperçu</div>
          <Preview gift={gift} name={student.name} cls={cls?.name} n={pick} occ={occ}/>
        </div>
        {/* options */}
        <div>
          {gift.key==='card' && <Field label="Occasion"><Select value={occ} onChange={e=>setOcc(e.target.value)}>{Object.entries(OCC).map(([k,v])=><option key={k} value={k}>{v.t}</option>)}</Select></Field>}
          <div className="text-xs font-semibold text-muted mt-3 mb-1.5">Choisir l’illustration</div>
          <div className="grid grid-cols-4 gap-1.5 max-h-[260px] overflow-y-auto scroll-thin pr-1">
            {IMGS.map(n=>(
              <button key={n} onClick={()=>setPick(n)} className={`relative rounded-lg overflow-hidden border-2 ${pick===n?'':'border-transparent'}`} style={pick===n?{borderColor:gift.color}:{}}>
                <img src={img(n)} alt="" loading="lazy" className="w-full h-12 object-cover"/>
                {pick===n&&<span className="absolute inset-0 grid place-items-center" style={{background:gift.color+'55'}}><Check size={16} className="text-white"/></span>}
              </button>
            ))}
          </div>
        </div>
      </div>}
    </Modal>
  </>)
}

function Preview({ gift, name, cls, n, occ }){
  if(gift.key==='card'){ const o={bravo:'Bravo',aid:'Joyeux Aïd',anniv:'Joyeux anniversaire',nouvelan:'Bonne année',vacances:'Bonnes vacances'}[occ]
    return (<div className="rounded-2xl p-3" style={{background:gift.color}}>
      <div className="bg-white rounded-xl p-4 flex items-center gap-4 min-h-[200px]">
        <img src={img(n)} className="w-2/5 object-contain" alt=""/>
        <div><div className="text-2xl font-extrabold leading-tight" style={{color:gift.color}}>{o}<br/>{name.split(' ')[0]} !</div>
          <div className="text-sm text-muted mt-2">Avec toute l’affection de ton école 💛</div></div>
      </div></div>)
  }
  if(gift.key==='bookmark'){ return (<div className="flex gap-3 justify-center">
    {[0,1].map(i=><div key={i} className="rounded-xl p-1.5 w-24" style={{background:gift.color}}><div className="bg-white rounded-lg p-2 text-center"><img src={img(n)} className="w-full aspect-square object-cover rounded" alt=""/><div className="font-bold text-sm mt-1" style={{color:gift.color}}>{name.split(' ')[0]}</div><div className="text-[10px] text-muted">Bonne lecture !</div></div></div>)}
    <div className="self-center text-xs text-muted">…× 4 sur la planche</div></div>)
  }
  // labels
  return (<div className="grid grid-cols-2 gap-2">
    {[0,1,2,3].map(i=><div key={i} className="border border-line rounded-xl p-2 flex items-center gap-2 bg-canvas/40">
      <img src={img(n)} className="w-12 h-12 object-cover rounded-lg" alt=""/>
      <div><div className="text-[10px] text-muted">Ce cahier appartient à</div><div className="font-bold text-sm">{name}</div><div className="text-[10px] text-muted">{cls}</div></div>
    </div>)}
    <div className="col-span-2 text-xs text-muted text-center">La planche contient 10 étiquettes.</div>
  </div>)
}
