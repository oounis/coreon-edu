// FAQ (/faq) — les questions fréquentes, en accordéon.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { t } from '@core/i18n.js'
import { A, FAQ, Cta } from './shared.jsx'

export default function FaqPage(){
  const [faq,setFaq]=useState(0)
  return (
    <>
      <section className="mx-auto max-w-[760px] px-5 pt-16 pb-10">
        <motion.h2 initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.5}} className="text-3xl md:text-4xl font-extrabold text-center mb-8">{t('Questions fréquentes')}</motion.h2>
        <div className="space-y-3">
          {FAQ.map(([q,a],i)=>(
            <div key={i} className="card overflow-hidden">
              <button onClick={()=>setFaq(faq===i?-1:i)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left font-semibold">
                {q}<ChevronDown size={18} className={`shrink-0 transition ${faq===i?'rotate-180':''}`} style={{color:A}}/>
              </button>
              {faq===i&&<div className="px-5 pb-4 text-sm text-muted -mt-1">{a}</div>}
            </div>
          ))}
        </div>
      </section>
      <Cta/>
    </>
  )
}
