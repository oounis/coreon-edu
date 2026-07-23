// Tarifs (/tarifs) — un prix clair, par école, en euros (CR-003).
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { STATUS } from '../../components/ui.jsx'
import { t } from '@core/i18n.js'
import { up, A, BTN_LG, PRICING, Cta } from './shared.jsx'

export default function PricingPage(){
  const nav = useNavigate()
  return (
    <>
      <section className="mx-auto max-w-[1120px] px-5 pt-16 pb-8">
        <motion.div {...up} className="text-center max-w-[60ch] mx-auto mb-10">
          <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>{t('Tarifs simples')}</div>
          <h2 className="text-3xl md:text-4xl font-extrabold mt-3">{t('Un prix clair, par école')}</h2>
          <p className="text-muted mt-3">{t('Sans engagement. Essai gratuit. Payez au mois.')}</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PRICING.map(([name,price,feats,pop])=>(
            <motion.div key={name} {...up} className={`card p-7 relative ${pop?'ring-2 shadow-2xl':''}`} style={pop?{borderColor:A,boxShadow:'0 24px 50px -20px '+A}:{}}>
              {pop&&<span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[12px] font-bold text-white px-3 py-1 rounded-full" style={{background:A}}>{t('Le plus complet')}</span>}
              <div className="font-bold text-lg">{name}</div>
              <div className="mt-2 flex items-end gap-1"><span className="text-4xl font-extrabold">{/^\d/.test(price)?`€${price}`:price}</span>{/^\d/.test(price)&&<span className="text-muted mb-1 text-sm">{t('€ / mois')}</span>}</div>
              <ul className="mt-5 space-y-2.5">{feats.map(f=><li key={f} className="flex items-start gap-2 text-sm"><Check size={16} className="mt-0.5 shrink-0" style={{color:STATUS.ok}}/>{f}</li>)}</ul>
              <button onClick={()=>nav('/login')} className={`${BTN_LG} w-full mt-6 ${pop?'text-white shadow-sm hover:opacity-90':'bg-white border border-line hover:bg-canvas'}`} style={pop?{background:A}:{}}>{t('Commencer')}</button>
            </motion.div>
          ))}
        </div>
      </section>
      <Cta/>
    </>
  )
}
