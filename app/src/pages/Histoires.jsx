import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BOOKS, THEMES, art } from '../books.js'
import { PageHead } from '../components/ui.jsx'
import { Mark } from '../components/ui.jsx'
import { ChevronLeft, ChevronRight, X, Star, BookOpen, Play } from 'lucide-react'

const STARS=[[8,12],[22,30],[15,68],[30,50],[44,18],[58,40],[70,15],[82,55],[90,30],[76,72],[50,82],[36,88],[64,84],[12,45],[88,80]]
function Stars(){ return <div className="absolute inset-0 pointer-events-none">
  {STARS.map(([x,y],i)=><Star key={i} size={i%3?9:13} className="absolute text-white" style={{left:`${x}%`,top:`${y}%`,opacity:i%2?.5:.85,fill:'currentColor'}}/>)}
</div> }

function Logo({ ink }){ return (
  <div className="flex items-center gap-1.5 opacity-90"><Mark size={20}/>
    <span className="font-extrabold lowercase text-sm tracking-tight" style={{color:ink}}>kogia <span className="font-normal opacity-70">edu</span></span></div>
) }

function Corners({ color }){ return <>
  {['left-3 top-3','right-3 top-3','left-3 bottom-3','right-3 bottom-3'].map(p=>
    <Star key={p} size={12} className={`absolute ${p}`} style={{color,fill:'currentColor'}}/>)}
</> }

function Slide({ slide, book, idx, total }){
  const t=THEMES[slide.theme]
  return (
    <div className="relative w-full h-full rounded-[26px] overflow-hidden" style={{background:t.bg}}>
      {t.stars && <Stars/>}
      <div className="absolute rounded-[18px] pointer-events-none" style={{inset:14, border:`2px solid ${t.frame}`}}/>
      <Corners color={t.frame}/>
      <div className="relative h-full flex flex-col items-center justify-between text-center px-6 py-8 md:px-10 md:py-10">
        {slide.kind==='cover' && <>
          <div className="text-[11px] font-bold tracking-[.34em] uppercase" style={{color:t.sub}}>Le Coin des Histoires</div>
          <div className="flex-1 grid place-items-center py-2">
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight" style={{color:t.ink}}>{book.title}</h1>
              <p className="mt-2 text-sm md:text-base" style={{color:t.sub}}>{book.subtitle}</p>
              <img src={art(book.cover.art[0])} alt="" className="mx-auto mt-5 max-h-[38vh] drop-shadow-2xl"/>
            </div>
          </div>
          <Logo ink={t.ink}/>
        </>}
        {slide.kind==='page' && <>
          <div className="flex-1 w-full grid place-items-center">
            <div className="flex items-end justify-center gap-1">
              {slide.art.map((n,i)=><img key={n} src={art(n)} alt="" className="drop-shadow-2xl" style={{maxHeight:i? '26vh':'42vh'}}/>)}
            </div>
          </div>
          <div className="w-full max-w-2xl rounded-2xl px-6 py-5 shadow-lg" style={{background:t.panel,color:t.ink,backdropFilter:t.stars?'blur(2px)':'none'}}>
            <p className="text-lg md:text-2xl font-semibold leading-relaxed">{slide.text}</p>
          </div>
          <div className="flex items-center justify-between w-full mt-3"><Logo ink={t.ink}/><span className="text-xs font-semibold" style={{color:t.sub}}>{idx} / {total}</span></div>
        </>}
        {slide.kind==='end' && <>
          <div className="flex-1 grid place-items-center"><Star size={64} className="text-white" style={{fill:'currentColor',opacity:.9}}/></div>
          <div><h2 className="text-4xl font-extrabold" style={{color:t.ink}}>{slide.title}</h2>
            <p className="mt-2 max-w-md" style={{color:t.sub}}>{slide.text}</p></div>
          <Logo ink={t.ink}/>
        </>}
      </div>
    </div>
  )
}

function Reader({ book, onClose }){
  const slides=useMemo(()=>[ {kind:'cover',theme:book.cover.theme}, ...book.pages.map(p=>({kind:'page',...p})), {kind:'end',...book.end} ],[book])
  const total=slides.length
  const [i,setI]=useState(0); const [dir,setDir]=useState(0)
  const go=d=>setI(v=>{ const n=v+d; if(n<0||n>=total) return v; setDir(d); return n })
  useEffect(()=>{ const k=e=>{ if(e.key==='ArrowRight')go(1); else if(e.key==='ArrowLeft')go(-1); else if(e.key==='Escape')onClose() }
    window.addEventListener('keydown',k); return ()=>window.removeEventListener('keydown',k) },[total])
  const pageNo=i===0?0:i===total-1?0:i
  return (
    <div className="fixed inset-0 z-[60] bg-ink/80 backdrop-blur-sm grid place-items-center p-3 sm:p-6" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-11 h-11 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white z-10"><X size={20}/></button>
      <button onClick={e=>{e.stopPropagation();go(-1)}} disabled={i===0} className="hidden sm:grid absolute left-4 place-items-center w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white disabled:opacity-20 z-10"><ChevronLeft size={26}/></button>
      <button onClick={e=>{e.stopPropagation();go(1)}} disabled={i===total-1} className="hidden sm:grid absolute right-4 place-items-center w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white disabled:opacity-20 z-10"><ChevronRight size={26}/></button>

      <div className="relative w-full max-w-[540px] select-none" style={{aspectRatio:'3/4',maxHeight:'86vh'}} onClick={e=>e.stopPropagation()}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div key={i} custom={dir} className="absolute inset-0"
            initial={{opacity:0,x:dir>=0?60:-60}} animate={{opacity:1,x:0}} exit={{opacity:0,x:dir>=0?-60:60}} transition={{duration:.32,ease:'easeOut'}}>
            <Slide slide={slides[i]} book={book} idx={pageNo} total={book.pages.length}/>
          </motion.div>
        </AnimatePresence>
        {/* tap zones on mobile */}
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
  const t=THEMES[book.cover.theme]
  return (
    <button onClick={onClick} className="group text-left rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition w-full">
      <div className="relative aspect-[3/4]" style={{background:t.bg}}>
        <Stars/>
        <div className="absolute rounded-xl pointer-events-none" style={{inset:10,border:`2px solid ${t.frame}`}}/>
        <div className="relative h-full flex flex-col items-center justify-between p-5 text-center">
          <div className="text-[9px] font-bold tracking-[.28em] uppercase" style={{color:t.sub}}>Kogia Edu</div>
          <img src={art(book.cover.art[0])} alt="" className="max-h-[54%] drop-shadow-xl group-hover:scale-105 transition"/>
          <div><h3 className="text-xl font-extrabold leading-tight" style={{color:t.ink}}>{book.title}</h3>
            <p className="text-[11px] mt-1" style={{color:t.sub}}>{book.subtitle}</p></div>
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
