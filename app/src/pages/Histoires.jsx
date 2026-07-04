import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BOOKS, art } from '../books.js'
import { PageHead, Mark } from '../components/ui.jsx'
import { ChevronLeft, ChevronRight, X, BookOpen, Play, Heart } from 'lucide-react'

// soft darker shade of a page bg, for the frame/accents
const shade = (hex,f=0.82)=>{const n=parseInt(hex.slice(1),16);const r=Math.round(((n>>16)&255)*f),g=Math.round(((n>>8)&255)*f),b=Math.round((n&255)*f);return `rgb(${r},${g},${b})`}

function Logo({ ink='#8A7A63' }){ return (
  <div className="flex items-center gap-1.5"><Mark size={18}/>
    <span className="font-extrabold lowercase text-sm tracking-tight" style={{color:ink}}>kogia <span className="font-normal opacity-70">edu</span></span></div>
) }

function Slide({ slide, book, idx, total }){
  const bg=slide.bg||'#F6C9C9'
  return (
    <div className="relative w-full h-full rounded-[26px] overflow-hidden" style={{background:`radial-gradient(120% 80% at 50% 32%, #ffffff88 0%, ${bg} 60%, ${shade(bg,0.9)} 100%)`}}>
      <div className="absolute inset-0 rounded-[26px] pointer-events-none" style={{boxShadow:`inset 0 0 0 3px ${shade(bg,0.8)}55, inset 0 0 0 11px #ffffff30`}}/>

      {slide.kind==='cover' && <>
        <div className="absolute inset-0 flex items-center justify-center p-8"><img src={art(book.cover.img)} alt="" className="max-h-[62%] max-w-[82%] object-contain drop-shadow-2xl"/></div>
        <div className="absolute inset-x-0 top-0 px-6 pt-8 pb-12 text-center" style={{background:`linear-gradient(to bottom, ${shade(bg,0.72)}, transparent)`}}>
          <div className="text-[10px] font-bold tracking-[.34em] uppercase text-white/90 flex items-center justify-center gap-1.5"><Heart size={11} className="fill-white/90"/> Le Coin des Histoires</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-2 leading-tight drop-shadow">{book.title}</h1>
          <p className="text-white/90 text-sm mt-1">{book.subtitle}</p>
        </div>
        <div className="absolute bottom-4 inset-x-0 flex justify-center"><Logo ink="#fff"/></div>
      </>}

      {slide.kind==='page' && <>
        <div className="absolute inset-x-0 top-0 bottom-[30%] flex items-center justify-center p-6 pt-8"><img src={art(slide.img)} alt="" className="max-h-full max-w-[86%] object-contain drop-shadow-2xl"/></div>
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-4">
          <div className="max-w-xl mx-auto rounded-2xl bg-white/85 backdrop-blur-sm px-6 py-4 shadow-lg">
            <p className="text-center text-[15px] md:text-xl font-semibold leading-relaxed text-[#5B4636]">{slide.text}</p>
          </div>
          <div className="flex items-center justify-between mt-2.5 max-w-xl mx-auto"><Logo/><span className="text-xs font-bold" style={{color:shade(bg,0.6)}}>{idx} / {total}</span></div>
        </div>
      </>}

      {slide.kind==='end' && <>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
          {slide.img && <img src={art(slide.img)} alt="" className="max-h-[42%] object-contain drop-shadow-2xl"/>}
          <Heart size={30} className="fill-[#E8748A] text-[#E8748A]"/>
          <h2 className="text-4xl font-extrabold text-[#6E3A46]">{slide.title}</h2>
          <p className="text-[#8A5A66] max-w-sm">{slide.text}</p>
          <div className="mt-2"><Logo ink="#8A5A66"/></div>
        </div>
      </>}
    </div>
  )
}

function Reader({ book, onClose }){
  const slides=useMemo(()=>[ {kind:'cover',...book.cover}, ...book.pages.map(p=>({kind:'page',...p})), {kind:'end',...book.end} ],[book])
  const total=slides.length
  const [i,setI]=useState(0); const [dir,setDir]=useState(0)
  const cur=slides[i]
  const go=d=>setI(v=>{ const n=v+d; if(n<0||n>=total) return v; setDir(d); return n })
  useEffect(()=>{ const k=e=>{ if(e.key==='ArrowRight')go(1); else if(e.key==='ArrowLeft')go(-1); else if(e.key==='Escape')onClose() }
    window.addEventListener('keydown',k); return ()=>window.removeEventListener('keydown',k) },[total])
  return (
    <div className="fixed inset-0 z-[60] bg-ink/80 backdrop-blur-sm grid place-items-center p-3 sm:p-6" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-11 h-11 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white z-10"><X size={20}/></button>
      <button onClick={e=>{e.stopPropagation();go(-1)}} disabled={i===0} className="hidden sm:grid absolute left-4 place-items-center w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white disabled:opacity-20 z-10"><ChevronLeft size={26}/></button>
      <button onClick={e=>{e.stopPropagation();go(1)}} disabled={i===total-1} className="hidden sm:grid absolute right-4 place-items-center w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white disabled:opacity-20 z-10"><ChevronRight size={26}/></button>

      <div className="relative w-full max-w-[540px] select-none" style={{aspectRatio:'3/4',maxHeight:'86vh'}} onClick={e=>e.stopPropagation()}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div key={i} custom={dir} className="absolute inset-0"
            initial={{opacity:0,x:dir>=0?60:-60}} animate={{opacity:1,x:0}} exit={{opacity:0,x:dir>=0?-60:60}} transition={{duration:.32,ease:'easeOut'}}>
            <Slide slide={cur} book={book} idx={cur.kind==='page'?i:0} total={book.pages.length}/>
          </motion.div>
        </AnimatePresence>
        <button className="sm:hidden absolute inset-y-0 left-0 w-1/3" onClick={()=>go(-1)} aria-label="précédent"/>
        <button className="sm:hidden absolute inset-y-0 right-0 w-1/3" onClick={()=>go(1)} aria-label="suivant"/>
      </div>

      <div className="absolute bottom-5 flex items-center gap-1.5" onClick={e=>e.stopPropagation()}>
        {slides.map((_,k)=><button key={k} onClick={()=>{setDir(k>i?1:-1);setI(k)}} className="rounded-full transition-all" style={{width:k===i?22:8,height:8,background:k===i?'#fff':'rgba(255,255,255,.4)'}}/>)}
      </div>
    </div>
  )
}

function Cover({ book, onClick }){
  const bg=book.cover.bg
  return (
    <button onClick={onClick} className="group text-left rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition w-full">
      <div className="relative aspect-[3/4]" style={{background:`radial-gradient(120% 80% at 50% 55%, #ffffff88 0%, ${bg} 65%)`}}>
        <div className="absolute inset-0 flex items-center justify-center p-4 pt-14"><img src={art(book.cover.img)} alt="" className="max-h-[70%] object-contain drop-shadow-xl group-hover:scale-105 transition"/></div>
        <div className="absolute inset-x-0 top-0 px-4 pt-4 pb-8 text-center" style={{background:`linear-gradient(to bottom, ${shade(bg,0.72)}, transparent)`}}>
          <h3 className="text-lg font-extrabold text-white leading-tight drop-shadow">{book.title}</h3>
          <p className="text-[10px] text-white/90 mt-0.5">{book.subtitle}</p>
        </div>
        <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition bg-black/25">
          <span className="flex items-center gap-2 bg-white text-ink font-bold text-sm px-4 py-2 rounded-full shadow"><Play size={15}/> Lire l’histoire</span>
        </div>
      </div>
      <div className="bg-white px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-muted flex items-center gap-1.5"><BookOpen size={14}/> {book.pages.length} pages</span>
        <span className="text-xs font-semibold text-muted">{book.ages}</span>
      </div>
    </button>
  )
}

export default function Histoires(){
  const [open,setOpen]=useState(null)
  return (<>
    <PageHead title="Le Coin des Histoires" sub="De belles histoires illustrées à lire ensemble, directement dans l’application."/>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 max-w-3xl">
      {BOOKS.map(b=><Cover key={b.id} book={b} onClick={()=>setOpen(b)}/>)}
    </div>
    <AnimatePresence>{open && <Reader book={open} onClose={()=>setOpen(null)}/>}</AnimatePresence>
  </>)
}
