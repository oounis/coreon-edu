import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { jsPDF } from 'jspdf'
import { STORIES, storyImg } from '../stories.js'
import { PageHead, Card, Btn, Modal } from '../components/ui.jsx'
import { BookOpen, ChevronLeft, ChevronRight, Download, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

function loadImg(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src }) }
async function toData(src){ const i=await loadImg(src); const c=document.createElement('canvas'); c.width=i.naturalWidth; c.height=i.naturalHeight; c.getContext('2d').drawImage(i,0,0); return {url:c.toDataURL('image/jpeg',0.85), w:i.naturalWidth, h:i.naturalHeight} }
const fit=(iw,ih,bw,bh)=>{ const r=Math.min(bw/iw,bh/ih); return {w:iw*r,h:ih*r} }

async function downloadStory(story){
  const doc=new jsPDF({orientation:'portrait',unit:'pt',format:'a5'})
  const W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight(), M=26
  // cover
  doc.setFillColor(story.color); doc.rect(0,0,W,H,'F')
  const cov=await toData(storyImg(story.cover)); const cf=fit(cov.w,cov.h,W-2*M,H*0.5)
  doc.addImage(cov.url,'JPEG',(W-cf.w)/2,H*0.2,cf.w,cf.h,undefined,'FAST')
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(19)
  doc.text(story.title,W/2,H*0.2+cf.h+40,{align:'center',maxWidth:W-2*M})
  doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.text(story.subtitle,W/2,H*0.2+cf.h+62,{align:'center',maxWidth:W-2*M})
  doc.setFontSize(9); doc.text('Le Coin des Histoires · Kogia Edu',W/2,H-24,{align:'center'})
  // pages
  for(let i=0;i<story.pages.length;i++){ const p=story.pages[i]
    doc.addPage(); doc.setFillColor(252,252,253); doc.rect(0,0,W,H,'F')
    const im=await toData(storyImg(p.n)); const f=fit(im.w,im.h,W-2*M,H*0.62)
    doc.addImage(im.url,'JPEG',(W-f.w)/2,M,f.w,f.h,undefined,'FAST')
    doc.setTextColor(40,40,50); doc.setFont('helvetica','normal'); doc.setFontSize(13)
    doc.text(p.t,W/2,M+f.h+34,{align:'center',maxWidth:W-2*M-20})
    doc.setTextColor(150,150,160); doc.setFontSize(9); doc.text(`${i+1} / ${story.pages.length}`,W/2,H-20,{align:'center'})
  }
  doc.save(`${story.id}-kogia.pdf`)
}

export default function Magazine(){
  const [open,setOpen]=useState(null); const [pg,setPg]=useState(0); const [busy,setBusy]=useState('')
  const story=open; const page=story?story.pages[pg]:null
  const go=d=>setPg(p=>Math.min(story.pages.length-1,Math.max(0,p+d)))
  const dl=async(s)=>{ setBusy(s.id); try{ await downloadStory(s); toast.success('Histoire téléchargée (PDF)') }catch{ toast.error('Téléchargement impossible') } setBusy('') }

  return (<>
    <PageHead title="Le Coin des Histoires" sub="Petits magazines illustrés à lire et à partager avec les enfants."/>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {STORIES.map(s=>(
        <motion.div key={s.id} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} className="card overflow-hidden flex flex-col">
          <button onClick={()=>{setOpen(s);setPg(0)}} className="relative block text-left" style={{background:s.color+'12'}}>
            <div className="aspect-[4/3] overflow-hidden grid place-items-center p-3">
              <img src={storyImg(s.cover)} alt="" className="max-h-full max-w-full object-contain drop-shadow"/>
            </div>
            <span className="absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{background:s.color}}>{s.cat}</span>
          </button>
          <div className="p-4 flex flex-col flex-1">
            <h3 className="font-extrabold leading-tight">{s.title}</h3>
            <p className="text-sm text-muted mt-0.5">{s.subtitle}</p>
            <div className="text-xs text-muted mt-1">{s.pages.length} pages</div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-line">
              <Btn className="flex-1" onClick={()=>{setOpen(s);setPg(0)}}><BookOpen size={15}/> Lire</Btn>
              <Btn variant="ghost" onClick={()=>dl(s)} disabled={busy===s.id}><Download size={15}/> {busy===s.id?'…':'PDF'}</Btn>
            </div>
          </div>
        </motion.div>
      ))}
    </div>

    <Modal open={!!story} onClose={()=>setOpen(null)} size="2xl"
      title={story?<span className="flex items-center gap-2"><Sparkles size={16} style={{color:story.color}}/> {story.title}</span>:''}
      footer={story&&<><Btn variant="ghost" onClick={()=>dl(story)} disabled={busy===story.id}><Download size={15}/> Télécharger le PDF</Btn><div className="flex-1"/>
        <Btn variant="ghost" onClick={()=>go(-1)} disabled={pg===0}><ChevronLeft size={16}/></Btn>
        <span className="text-sm text-muted self-center">{pg+1} / {story.pages.length}</span>
        <Btn onClick={()=>go(1)} disabled={pg===story.pages.length-1}>Suivant <ChevronRight size={16}/></Btn></>}>
      {page&&<div>
        <div className="rounded-2xl grid place-items-center p-3" style={{background:story.color+'10',minHeight:280}}>
          <AnimatePresence mode="wait"><motion.img key={pg} src={storyImg(page.n)} alt="" initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}} transition={{duration:.25}} className="max-h-[46vh] max-w-full object-contain drop-shadow-lg"/></AnimatePresence>
        </div>
        <p className="text-center text-lg font-semibold mt-4 px-2 leading-snug">{page.t}</p>
      </div>}
    </Modal>
  </>)
}
