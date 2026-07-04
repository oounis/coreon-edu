import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BOOKS, art } from '../books.js'
import { SceneBg, StarChar } from '../components/Scenes.jsx'
import { PageHead, Mark } from '../components/ui.jsx'
import { ChevronLeft, ChevronRight, X, BookOpen, Play } from 'lucide-react'

function Logo({ ink='#8A7A63' }){ return (
  <div className="flex items-center gap-1.5"><Mark size={18}/>
    <span className="font-extrabold lowercase text-sm tracking-tight" style={{color:ink}}>kogia <span className="font-normal opacity-70">edu</span></span></div>
) }

function Figures({ figures=[], star }){ return <>
  {figures.map((f,i)=><img key={i} src={art(f.n)} alt="" className="absolute drop-shadow-2xl"
    style={{ left:f.x, width:f.w, bottom:f.bottom||'29%', transform:`translateX(-50%) ${f.flip?'scaleX(-1)':''}` }}/>)}
  {star && <motion.div className="absolute" style={{ left:star.x, ...(star.top?{top:star.top}:{bottom:star.bottom}), transform:'translateX(-50%)' }}
    animate={{ y:[0,-6,0] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}>
    <StarChar size={star.size||56} mood={star.mood}/></motion.div>}
</> }

function Slide({ slide, book, idx, total }){
  return (
    <div className="relative w-full h-full rounded-[26px] overflow-hidden bg-[#180F45]">
      <SceneBg type={slide.scene}/>
      <div className="absolute inset-0 rounded-[26px] pointer-events-none" style={{boxShadow:'inset 0 0 0 2px rgba(255,255,255,.45), inset 0 0 0 10px rgba(255,255,255,.06)'}}/>

      {slide.kind==='cover' && <>
        <Figures figures={slide.figures} star={slide.star}/>
        <div className="absolute inset-x-0 top-0 px-6 pt-7 pb-12 text-center" style={{background:'linear-gradient(to bottom,rgba(18,12,55,.82) 45%,transparent)'}}>
          <div className="text-[10px] font-bold tracking-[.34em] uppercase text-indigo-200">Le Coin des Histoires</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-2 leading-tight">{book.title}</h1>
          <p className="text-indigo-200 text-sm mt-1">{book.subtitle}</p>
        </div>
        <div className="absolute bottom-4 inset-x-0 flex justify-center"><Logo ink="#fff"/></div>
      </>}

      {slide.kind==='page' && <>
        <Figures figures={slide.figures} star={slide.star}/>
        <div className="absolute inset-x-0 bottom-0 px-6 pt-12 pb-5" style={{background:'linear-gradient(to top,#FFFBF3 60%,rgba(255,251,243,.85) 78%,rgba(255,251,243,0))'}}>
          <p className="text-center text-[15px] md:text-lg font-semibold leading-relaxed text-[#5B4636] max-w-xl mx-auto">{slide.text}</p>
          <div className="flex items-center justify-between mt-3 max-w-xl mx-auto"><Logo/><span className="text-xs font-semibold text-[#BDAD93]">{idx} / {total}</span></div>
        </div>
      </>}

      {slide.kind==='end' && <>
        <div className="absolute inset-0 grid place-items-center pb-16"><motion.div animate={{y:[0,-8,0]}} transition={{duration:3,repeat:Infinity,ease:'easeInOut'}}><StarChar size={90}/></motion.div></div>
        <div className="absolute inset-x-0 bottom-0 px-6 pt-14 pb-8 text-center" style={{background:'linear-gradient(to top,rgba(18,12,55,.9) 55%,transparent)'}}>
          <h2 className="text-4xl font-extrabold text-white">{slide.title}</h2>
          <p className="text-indigo-200 mt-1.5 max-w-sm mx-auto">{slide.text}</p>
          <div className="flex justify-center mt-4"><Logo ink="#fff"/></div>
        </div>
      </>}
    </div>
  )
}

function Reader({ book, onClose }){
  const slides=useMemo(()=>[ {kind:'cover'}, ...book.pages.map(p=>({kind:'page',...p})), {kind:'end',...book.end} ],[book])
  const total=slides.length
  const [i,setI]=useState(0); const [dir,setDir]=useState(0)
  const cur=slides[i]
  const merged=cur.kind==='cover'?{...cur,...book.cover}:cur
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
            <Slide slide={merged} book={book} idx={cur.kind==='page'?i:0} total={book.pages.length}/>
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
  return (
    <button onClick={onClick} className="group text-left rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition w-full">
      <div className="relative aspect-[3/4] bg-[#180F45]">
        <SceneBg type={book.cover.scene}/>
        <Figures figures={book.cover.figures} star={book.cover.star}/>
        <div className="absolute inset-0 rounded-t-2xl pointer-events-none" style={{boxShadow:'inset 0 0 0 2px rgba(255,255,255,.4)'}}/>
        <div className="absolute inset-x-0 top-0 px-4 pt-4 pb-8 text-center" style={{background:'linear-gradient(to bottom,rgba(18,12,55,.8) 45%,transparent)'}}>
          <div className="text-[8px] font-bold tracking-[.28em] uppercase text-indigo-200">Kogia Edu</div>
          <h3 className="text-lg font-extrabold text-white leading-tight mt-1">{book.title}</h3>
          <p className="text-[10px] text-indigo-200 mt-0.5">{book.subtitle}</p>
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
