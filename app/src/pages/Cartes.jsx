import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { renderToStaticMarkup } from 'react-dom/server'
import { CARDS } from '../cards.js'
import { PageHead, Modal, Btn, Field, Input, Mark } from '../components/ui.jsx'
import { Heart, Download, Printer } from 'lucide-react'
import toast from 'react-hot-toast'

const rgb=hex=>{const n=parseInt(hex.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255]}
function heart(doc,cx,cy,s,c){ doc.setFillColor(c[0],c[1],c[2]); doc.circle(cx-s*0.45,cy-s*0.22,s*0.5,'F'); doc.circle(cx+s*0.45,cy-s*0.22,s*0.5,'F'); doc.triangle(cx-s*0.92,cy-s*0.02,cx+s*0.92,cy-s*0.02,cx,cy+s*0.95,'F') }

// flat vector motif — the card's icon inside soft concentric accent circles
function Motif({ card, size=200 }){
  const I=card.Icon
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width={size} height={size}>
      <circle cx="100" cy="100" r="80" fill={card.accent} opacity=".13"/>
      <circle cx="100" cy="100" r="58" fill={card.accent} opacity=".17"/>
      <circle cx="36" cy="54" r="5" fill={card.accent} opacity=".35"/>
      <circle cx="166" cy="66" r="4" fill={card.accent} opacity=".3"/>
      <circle cx="154" cy="152" r="6" fill={card.accent} opacity=".25"/>
      <circle cx="44" cy="148" r="3.5" fill={card.accent} opacity=".3"/>
      <I x={62} y={62} width={76} height={76} color={card.ink} strokeWidth={1.4}/>
    </svg>
  )
}
function motifPNG(card, px=560){
  return new Promise((res,rej)=>{
    const svg=renderToStaticMarkup(<Motif card={card} size={px}/>)
    const img=new Image()
    img.onload=()=>{ const c=document.createElement('canvas'); c.width=px; c.height=px; c.getContext('2d').drawImage(img,0,0,px,px); res(c.toDataURL('image/png')) }
    img.onerror=rej
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)
  })
}

async function buildPDF(card, name){
  const doc=new jsPDF({unit:'mm',format:'a6'}); const W=105,H=148
  const a=rgb(card.accent), b=rgb(card.bg), k=rgb(card.ink)
  doc.setFillColor(b[0],b[1],b[2]); doc.rect(0,0,W,H,'F')
  doc.setDrawColor(a[0],a[1],a[2]); doc.setLineWidth(0.5); doc.roundedRect(8,8,W-16,H-16,6,6,'S')
  doc.setFillColor(b[0],b[1],b[2]); doc.rect(W/2-6,6.4,12,3.2,'F'); heart(doc,W/2,8,2.4,a)
  const im=await motifPNG(card); const s=64; doc.addImage(im,'PNG',(W-s)/2,22,s,s,undefined,'FAST')
  doc.setTextColor(k[0],k[1],k[2]); doc.setFont('times','italic'); doc.setFontSize(18)
  doc.text(doc.splitTextToSize(card.text,W-30),W/2,104,{align:'center'})
  const foot=(name&&name.trim()?`POUR ${name.trim().toUpperCase()}  ·  `:'')+'KOGIA EDU'
  doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(a[0],a[1],a[2]); doc.setCharSpace(1)
  doc.text(foot,W/2,H-17,{align:'center'}); doc.setCharSpace(0)
  return doc
}

// on-screen card that mirrors the printed design
function CardFace({ card, name }){
  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{aspectRatio:'105/148', background:card.bg}}>
      <div className="absolute rounded-2xl" style={{inset:'7%', border:`1.5px solid ${card.accent}`}}/>
      <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-2" style={{top:'7%', background:card.bg}}><Heart size={16} style={{color:card.accent,fill:card.accent}}/></span>
      <div className="absolute inset-x-0 top-[11%] h-[46%] flex items-center justify-center"><Motif card={card} size="70%"/></div>
      <div className="absolute inset-x-0 top-[58%] h-[27%] px-[13%] grid place-items-center"><p className="font-serif italic leading-snug text-center" style={{color:card.ink,fontSize:'clamp(12px,3vw,18px)'}}>{card.text}</p></div>
      <div className="absolute bottom-[10.5%] inset-x-0 flex justify-center items-center gap-1 opacity-90"><Mark size={13}/><span className="text-[9px] font-extrabold tracking-[.18em]" style={{color:card.accent}}>{name&&name.trim()?`POUR ${name.trim().toUpperCase()} · `:''}KOGIA EDU</span></div>
    </div>
  )
}

export default function Cartes(){
  const [open,setOpen]=useState(null); const [busy,setBusy]=useState(false); const [name,setName]=useState('')
  const download=async(card)=>{ setBusy(true); try{ (await buildPDF(card,name)).save(`carte-${card.id}${name?'-'+name.trim():''}.pdf`); toast.success('Carte prête — PDF téléchargé') }catch{ toast.error('Impossible de générer le PDF') } setBusy(false) }
  const print=async(card)=>{ setBusy(true); try{ const url=(await buildPDF(card,name)).output('bloburl'); window.open(url,'_blank') }catch{ toast.error('Impossible d’ouvrir l’aperçu') } setBusy(false) }
  return (<>
    <PageHead title="Cartes à imprimer" sub="De jolies cartes illustrées, prêtes à imprimer ou à partager."
      action={<Field label="Prénom de l’enfant (optionnel)"><Input value={name} onChange={e=>setName(e.target.value)} maxLength={16} placeholder="ex. Amira" className="w-52"/></Field>}/>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 max-w-4xl">
      {CARDS.map(c=>(
        <button key={c.id} onClick={()=>setOpen(c)} className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition">
          <CardFace card={c} name={name}/>
          <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition bg-black/20 pointer-events-none">
            <span className="flex items-center gap-2 bg-white text-ink font-bold text-sm px-4 py-2 rounded-full shadow"><Download size={15}/> Ouvrir</span>
          </div>
        </button>
      ))}
    </div>

    <Modal open={!!open} onClose={()=>setOpen(null)} size="lg"
      title={open?<span className="flex items-center gap-2"><Heart size={15} style={{color:open.accent,fill:open.accent}}/> Carte à imprimer</span>:''}
      footer={open&&<><div className="flex-1 text-xs text-muted self-center">Format carte A6 · prêt à imprimer</div>
        <Btn variant="ghost" onClick={()=>print(open)} disabled={busy}><Printer size={15}/> Imprimer</Btn>
        <Btn onClick={()=>download(open)} disabled={busy}><Download size={15}/> {busy?'…':'Télécharger le PDF'}</Btn></>}>
      {open&&<div className="max-w-[300px] mx-auto"><CardFace card={open} name={name}/></div>}
    </Modal>
  </>)
}
