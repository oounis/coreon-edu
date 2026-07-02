import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mark } from '../components/ui.jsx'
import { ROLE } from '../theme.js'
import {
  Zap, ArrowRight, ClipboardCheck, CalendarCheck, Wallet, BookOpen, ShieldAlert, MessageSquare,
  Bus, CalendarDays, Award, ShieldCheck, Globe, Check, Star, ChevronDown, Sparkles, Lock,
  GraduationCap, Users, Building2, UserCog, Eye, HeartHandshake, Phone, Mail
} from 'lucide-react'

const up = { initial:{opacity:0,y:20}, whileInView:{opacity:1,y:0}, viewport:{once:true,margin:'-60px'}, transition:{duration:.5} }

const MODULES = [
  [ClipboardCheck,'Évaluation express','Notez toute la classe en 30 s par glisser-déposer — 5 questions, des badges, une note. Partagé en direct.','#6C5CE7'],
  [CalendarCheck,'Présence','Appel en un tap, retards et absences suivis, alertes automatiques aux parents.','#36C5F0'],
  [Wallet,'Frais & paiements','Frais de scolarité mensuels, reçus, relances et suivi des impayés — clair pour la direction et les parents.','#2BD9A8'],
  [BookOpen,'Devoirs & examens','Devoirs, calendrier des examens, bulletins imprimables — enseignants, élèves et parents alignés.','#FFA62B'],
  [ShieldAlert,'Incidents & discipline','Signalements, suivi et résolution — la vie scolaire tracée et transparente.','#FF6B81'],
  [MessageSquare,'Communication parents','Annonces, messages et notifications — l’école et les familles connectées.','#A78BFA'],
  [Bus,'Transport','Circuits, arrêts et suivi — les parents savent où en est le bus.','#0BA5D8'],
  [CalendarDays,'Événements & bibliothèque','Agenda de l’école, réservations, prêts de livres — tout au même endroit.','#E59A12'],
]
const PORTALS = [
  ['owner',Building2,'Vue multi-écoles, finances consolidées et pilotage du groupe.'],
  ['schooladmin',UserCog,'Direction : comptes, enseignants, frais et vie de l’établissement.'],
  ['admin',Users,'Administration : élèves, présence, examens et opérations du quotidien.'],
  ['teacher',GraduationCap,'Enseignant : la classe de l’instant à l’écran, évaluation en un geste.'],
  ['supervisor',Eye,'Surveillant : présence, incidents et discipline sur le terrain.'],
  ['parent',HeartHandshake,'Parent : notes, présence, paiements et messages de l’école.'],
]
const PRICING = [
  ['Essentiel','79',['Jusqu’à 150 élèves','Évaluations + présence','Frais & paiements','Portail parents','Support e-mail'],false],
  ['Pro','149',['Élèves illimités','Tous les modules','Examens, transport, bibliothèque','Bulletins PDF & imprimables','Support prioritaire'],true],
  ['Groupe','Sur devis',['Plusieurs écoles','Tableau propriétaire consolidé','Rôles & permissions avancés','Accompagnement dédié','Formation sur site'],false],
]
const FAQ = [
  ['Est-ce adapté au système tunisien ?','Oui — Primaire, Collège et Lycée, filières (Sciences, Maths, Éco-Gestion…), années et matières tunisiennes sont intégrés. Interface en français, prête pour l’arabe.'],
  ['Faut-il installer quelque chose ?','Non. Coreon Edu fonctionne dans le navigateur, sur ordinateur, tablette et mobile. Rien à installer.'],
  ['Nos données sont-elles en sécurité ?','Accès par rôle strict (chaque portail ne voit que ce qui le concerne), sessions protégées et export contrôlé de vos données.'],
  ['Combien de temps pour démarrer ?','Une journée. On importe vos classes et élèves, on crée les comptes, et vos enseignants évaluent dès le lendemain.'],
]

export default function Landing(){
  const nav=useNavigate(); const [faq,setFaq]=useState(0)
  const A='#6C5CE7'
  return (
    <div className="bg-white text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/85 border-b border-line">
        <div className="mx-auto max-w-[1120px] px-5 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2"><Mark size={30}/><span className="font-extrabold lowercase tracking-tight">kogia <span className="text-sm font-normal" style={{color:A}}>edu</span></span></a>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted">
            <a href="#modules" className="hover:text-ink">Fonctionnalités</a>
            <a href="#portails" className="hover:text-ink">Portails</a>
            <a href="#tarifs" className="hover:text-ink">Tarifs</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={()=>nav('/login')} className="text-sm font-semibold px-4 py-2 rounded-xl hover:bg-canvas">Se connecter</button>
            <button onClick={()=>nav('/login')} className="text-sm font-semibold px-4 py-2 rounded-xl text-white shadow-lg" style={{background:A,boxShadow:'0 8px 20px -8px '+A}}>Démo gratuite</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{background:'radial-gradient(60% 60% at 80% 0%, #EEEBFF 0%, transparent 60%), radial-gradient(50% 50% at 0% 20%, #E4F7FE 0%, transparent 55%)'}}/>
        <div className="mx-auto max-w-[1120px] px-5 pt-16 pb-10 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div {...up}>
            <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full" style={{background:'#EEEBFF',color:A}}><Zap size={13}/> La gestion scolaire, enfin simple · 🇹🇳</div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.08] mt-5">Toute votre école,<br/>sur <span style={{color:A}}>une seule</span> plateforme.</h1>
            <p className="text-lg text-muted mt-5 max-w-[48ch]">Évaluations, présence, frais, examens, incidents et communication avec les parents. Pensé pour les écoles tunisiennes — <b className="text-ink">rapide, clair, sécurisé.</b></p>
            <div className="flex flex-wrap gap-3 mt-7">
              <button onClick={()=>nav('/login')} className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white shadow-xl" style={{background:A,boxShadow:'0 14px 30px -10px '+A}}>Essayer la démo <ArrowRight size={18}/></button>
              <a href="#modules" className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold border border-line hover:border-ink/20">Voir les fonctionnalités</a>
            </div>
            <div className="flex items-center gap-5 mt-7 text-sm text-muted">
              <span className="flex items-center gap-1.5"><Check size={16} style={{color:'#2BD9A8'}}/> Sans installation</span>
              <span className="flex items-center gap-1.5"><Check size={16} style={{color:'#2BD9A8'}}/> Français & arabe</span>
              <span className="flex items-center gap-1.5"><Check size={16} style={{color:'#2BD9A8'}}/> Prêt en 1 jour</span>
            </div>
          </motion.div>
          <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} transition={{duration:.5,delay:.1}}>
            <EvalMock/>
          </motion.div>
        </div>
        {/* stats */}
        <div className="mx-auto max-w-[1120px] px-5 pb-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[['30 s','pour évaluer une classe'],['6','portails par rôle'],['14+','modules intégrés'],['100%','système tunisien']].map(([n,l])=>(
              <div key={l} className="card p-5 text-center"><div className="text-3xl font-extrabold" style={{color:A}}>{n}</div><div className="text-xs text-muted mt-1">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* SIGNATURE FEATURE */}
      <section className="mx-auto max-w-[1120px] px-5 py-16">
        <motion.div {...up} className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1"><EvalMock compact/></div>
          <div className="order-1 lg:order-2">
            <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>La fonctionnalité qui change tout</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3 leading-tight">Évaluez toute la classe<br/>en 30 secondes.</h2>
            <p className="text-muted mt-4 max-w-[46ch]">Fini les carnets. L’enseignant voit la classe de l’instant à l’écran, glisse chaque élève dans un niveau, ajoute un badge et une note — et tout est partagé en direct avec la direction et les parents.</p>
            <ul className="mt-5 space-y-3">
              {['Glisser-déposer les élèves : Excellent · Bien · Moyen · Insuffisant','Badges de motivation (élève du jour, progrès, esprit d’équipe…)','Résultats visibles instantanément par la direction et les parents'].map(t=>(
                <li key={t} className="flex items-start gap-3"><span className="w-6 h-6 rounded-full grid place-items-center shrink-0 mt-0.5" style={{background:'#EEEBFF',color:A}}><Check size={14}/></span><span className="text-sm">{t}</span></li>
              ))}
            </ul>
          </div>
        </motion.div>
      </section>

      {/* MODULES */}
      <section id="modules" className="bg-canvas border-y border-line py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <motion.div {...up} className="text-center max-w-[60ch] mx-auto mb-10">
            <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>Tout ce qu’une école utilise</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3">Une plateforme, tous les modules</h2>
            <p className="text-muted mt-3">Remplacez le papier, les groupes WhatsApp et cinq applications différentes par une seule.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {MODULES.map(([Icon,t,d,c],i)=>(
              <motion.div key={t} {...up} transition={{duration:.4,delay:i*.04}} className="card p-6 hover:shadow-xl transition">
                <span className="w-12 h-12 rounded-2xl grid place-items-center" style={{background:c+'1A',color:c}}><Icon size={22}/></span>
                <h3 className="font-bold mt-4">{t}</h3>
                <p className="text-sm text-muted mt-1.5">{d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PORTALS */}
      <section id="portails" className="mx-auto max-w-[1120px] px-5 py-16">
        <motion.div {...up} className="text-center max-w-[60ch] mx-auto mb-10">
          <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>Un portail par rôle</div>
          <h2 className="text-3xl md:text-4xl font-extrabold mt-3">Chacun voit ce qui le concerne</h2>
          <p className="text-muted mt-3">Blanc + une couleur. Simple pour chaque utilisateur, sécurisé pour l’école.</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PORTALS.map(([r,Icon,d],i)=>{const role=ROLE[r];return(
            <motion.div key={r} {...up} transition={{duration:.4,delay:i*.05}} className="card p-6 relative overflow-hidden">
              <span className="absolute right-0 top-0 w-24 h-24 rounded-full -mr-8 -mt-8" style={{background:role.soft}}/>
              <span className="relative w-12 h-12 rounded-2xl grid place-items-center text-white" style={{background:role.color}}><Icon size={22}/></span>
              <h3 className="relative font-bold mt-4">{role.label}</h3>
              <p className="relative text-sm text-muted mt-1.5">{d}</p>
            </motion.div>
          )})}
        </div>
      </section>

      {/* WHY / TRUST */}
      <section className="bg-canvas border-y border-line py-16">
        <div className="mx-auto max-w-[1120px] px-5 grid md:grid-cols-3 gap-6">
          {[[Globe,'100% tunisien','Primaire · Collège · Lycée, filières et matières officielles. Français aujourd’hui, arabe prêt.'],
            [ShieldCheck,'Sécurisé par rôle','Chaque portail est cloisonné : un parent ne voit jamais les finances, un enseignant jamais un autre établissement.'],
            [Sparkles,'Adopté en un jour','Import des classes, création des comptes, et l’école tourne dès le lendemain — sans formation lourde.']].map(([Icon,t,d])=>(
            <motion.div key={t} {...up} className="card p-7">
              <span className="w-12 h-12 rounded-2xl grid place-items-center" style={{background:'#EEEBFF',color:A}}><Icon size={22}/></span>
              <h3 className="font-bold mt-4 text-lg">{t}</h3><p className="text-sm text-muted mt-2">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="tarifs" className="mx-auto max-w-[1120px] px-5 py-16">
        <motion.div {...up} className="text-center max-w-[60ch] mx-auto mb-10">
          <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>Tarifs simples</div>
          <h2 className="text-3xl md:text-4xl font-extrabold mt-3">Un prix clair, par école</h2>
          <p className="text-muted mt-3">Sans engagement. Essai gratuit. Payez au mois.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PRICING.map(([name,price,feats,pop])=>(
            <motion.div key={name} {...up} className={`card p-7 relative ${pop?'ring-2 shadow-2xl':''}`} style={pop?{borderColor:A,boxShadow:'0 24px 50px -20px '+A}:{}}>
              {pop&&<span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold text-white px-3 py-1 rounded-full" style={{background:A}}>Le plus choisi</span>}
              <div className="font-bold text-lg">{name}</div>
              <div className="mt-2 flex items-end gap-1"><span className="text-4xl font-extrabold">{price}</span>{price!=='Sur devis'&&<span className="text-muted mb-1 text-sm">TND / mois</span>}</div>
              <ul className="mt-5 space-y-2.5">{feats.map(f=><li key={f} className="flex items-start gap-2 text-sm"><Check size={16} className="mt-0.5 shrink-0" style={{color:'#2BD9A8'}}/>{f}</li>)}</ul>
              <button onClick={()=>nav('/login')} className={`w-full rounded-xl py-3 mt-6 font-semibold ${pop?'text-white':'border border-line hover:border-ink/20'}`} style={pop?{background:A}:{}}>Commencer</button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-canvas border-y border-line py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <div className="grid md:grid-cols-3 gap-5">
            {[['« En 30 secondes, toute la classe est évaluée et les parents sont au courant le soir même. »','Directrice — École Al-Nour, Tunis'],
              ['« Les impayés se sont réglés tout seuls : les parents voient enfin clair sur les frais. »','Administration — Collège privé, Sfax'],
              ['« Un seul endroit pour la présence, les notes et les annonces. On a arrêté WhatsApp. »','Enseignant — Lycée, Sousse']].map(([q,a])=>(
              <motion.div key={a} {...up} className="card p-6">
                <div className="flex gap-0.5 mb-3">{[...Array(5)].map((_,i)=><Star key={i} size={15} fill="#FFC24B" stroke="#FFC24B"/>)}</div>
                <p className="text-sm">{q}</p><div className="text-xs text-muted mt-4 font-semibold">{a}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-[760px] px-5 py-16">
        <motion.h2 {...up} className="text-3xl md:text-4xl font-extrabold text-center mb-8">Questions fréquentes</motion.h2>
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

      {/* CTA */}
      <section className="mx-auto max-w-[1120px] px-5 pb-16">
        <motion.div {...up} className="rounded-3xl p-10 md:p-14 text-center text-white relative overflow-hidden" style={{background:'linear-gradient(135deg,#6C5CE7,#36C5F0)'}}>
          <h2 className="text-3xl md:text-4xl font-extrabold">Prêt à moderniser votre école ?</h2>
          <p className="mt-3 text-white/85 max-w-[52ch] mx-auto">Testez Coreon Edu gratuitement — choisissez un rôle et découvrez la plateforme en un clic.</p>
          <button onClick={()=>nav('/login')} className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 mt-7 font-bold bg-white" style={{color:A}}>Démarrer la démo <ArrowRight size={18}/></button>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1120px] px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2"><Mark size={26}/><span className="font-extrabold lowercase text-ink">kogia <span className="font-normal" style={{color:A}}>edu</span></span></div>
          <div className="flex items-center gap-5"><a href="#modules" className="hover:text-ink">Fonctionnalités</a><a href="#tarifs" className="hover:text-ink">Tarifs</a><span className="flex items-center gap-1.5"><Mail size={14}/> contact@kogia.tn</span></div>
          <div>© 2026 Kogia Group · 🇹🇳 Tunisie</div>
        </div>
      </footer>
    </div>
  )
}

// --- small product mock (drag-drop evaluation preview) ---
function EvalMock({ compact }){
  const A='#6C5CE7'
  const buckets=[['Excellent','#2BD9A8','#E2FBF3',['AB','YT']],['Bien','#36C5F0','#E4F7FE',['LK','SM']],['Moyen','#FFA62B','#FFF1DD',['HB']],['Insuffisant','#FF6B81','#FFE8EC',['NJ']]]
  return (
    <div className="card p-4 shadow-2xl" style={{boxShadow:'0 30px 60px -25px rgba(108,92,231,.45)'}}>
      <div className="flex items-center justify-between px-1 pb-3 border-b border-line">
        <div><div className="font-bold text-sm">5ème A · Mathématiques</div><div className="text-[11px] text-muted">Participation en classe · maintenant</div></div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{background:'#2BD9A8'}}>● EN DIRECT</span>
      </div>
      <div className={`grid grid-cols-2 gap-2.5 mt-3 ${compact?'':'sm:grid-cols-4'}`}>
        {buckets.map(([label,c,soft,kids])=>(
          <div key={label} className="rounded-xl p-2.5" style={{background:soft}}>
            <div className="text-[11px] font-bold mb-2" style={{color:c}}>{label}</div>
            <div className="flex flex-wrap gap-1.5">
              {kids.map(k=><span key={k} className="w-8 h-8 rounded-full grid place-items-center text-white text-[11px] font-bold" style={{background:c}}>{k}</span>)}
              <span className="w-8 h-8 rounded-full grid place-items-center text-[11px] border-2 border-dashed" style={{borderColor:c,color:c}}>+</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
        <div className="flex gap-1">{['⭐','📈','🤝'].map(e=><span key={e} className="w-8 h-8 rounded-lg grid place-items-center bg-canvas">{e}</span>)}</div>
        <button className="text-xs font-bold text-white px-4 py-2 rounded-lg" style={{background:A}}>Enregistrer & partager</button>
      </div>
    </div>
  )
}
