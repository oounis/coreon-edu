// ════════════════════════════════════════════════════════════════════════════
// LA PAGE D'ACCUEIL — la première impression du produit, donc de l'entreprise.
//
// LE POSITIONNEMENT (docs/PLAN.md §0, recherche vérifiée 3-0) : les ERP
// scolaires ne savent pas faire la petite enfance ; les plateformes petite
// enfance ne savent pas faire l'école. Un parent avec un enfant de 3 ans et un
// de 8 ans dans le même établissement a besoin de DEUX applications aujourd'hui.
// Coreon EDU fait les deux, sous un seul toit, avec un seul compte parent.
// Ce n'est pas une fonctionnalité : c'est la raison d'exister du produit —
// et donc le titre de cette page.
//
// CE QUE CETTE PAGE NE FAIT PLUS (2026-07-14) :
//  - Les TÉMOIGNAGES INVENTÉS ont été supprimés. « On n'invente rien — ni un
//    chiffre, ni un client » (règle n°7). Elle vaut aussi pour le marketing.
//  - Elle ne montre plus de modules ÉTEINTS (transport, bibliothèque, examens
//    sont off dans features.js) — on ne vend pas ce qu'on a désactivé.
//  - Elle ne dit plus « pensé pour les écoles tunisiennes » : l'ambition est
//    internationale (PLAN §0), la Tunisie est le premier marché, pas le produit.
//  - Elle ne promet plus l'arabe au présent : il est EN PRÉPARATION, et on
//    l'écrit comme ça.
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mark, STATUS } from '../components/ui.jsx'
import { ROLE } from '@core/theme.js'
import { t } from '@core/i18n.js'
import {
  ArrowRight, ClipboardCheck, Wallet, ShieldAlert, MessageSquare, Check, ChevronDown,
  Baby, GraduationCap, Users, Building2, UserCog, Eye, HeartHandshake, ShieldCheck,
  Star, TrendingUp, Handshake, HeartPulse, NotebookPen, BookUser, UserPlus, Waves,
  FileBadge, Plug, Radio, Download, Landmark
} from 'lucide-react'

const up = { initial:{opacity:0,y:20}, whileInView:{opacity:1,y:0}, viewport:{once:true,margin:'-60px'}, transition:{duration:.5} }
const BTN="inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition active:scale-[.98]"
const BTN_MD=`${BTN} text-sm px-4 py-2.5`, BTN_LG=`${BTN} text-sm px-5 py-3`
const A='#7539E4'   // le violet Coreon Edu — KOGIA_HARMONY §4.2

// Les modules qu'on montre sont les modules qui EXISTENT et sont ALLUMÉS.
const MODULES = [
  [UserPlus,t('Pré-inscription & admissions'),t('Le parent dépose en ligne, avec ses pièces. La candidature devient l’élève sans jamais ressaisir — le parcours entier est tracé.'),A],
  [NotebookPen,t('Journal du jour'),t('Repas, sieste, change, humeur — un geste, pas un formulaire. Le parent le lit le soir même.'),'#0BA5D8'],
  [BookUser,t('Dossier de l’enfant'),t('Personnes autorisées à récupérer l’enfant, vaccins, jalons de développement. La règle la plus grave du métier, tenue par le système.'),STATUS.danger],
  [ClipboardCheck,t('Évaluation quotidienne'),t('Toute la classe évaluée en 30 secondes, partagée en direct avec la direction et les parents.'),STATUS.ok],
  [Radio,t('Suivi en direct'),t('Où en est la journée de mon enfant, maintenant — cours, cantine, récréation, infirmerie.'),'#8B5CF6'],
  [Wallet,t('Comptabilité défendable'),t('Barème par niveau, remises tracées, factures, reçus numérotés, avoirs. Une facture émise ne se modifie jamais.'),STATUS.warn],
  [Users,t('RH & paie'),t('Contrats, congés avec circuit d’approbation, paie calculée sur les faits. Personne ne valide sa propre demande.'),'#0E7FB8'],
  [FileBadge,t('Bulletins & passage'),t('Notes et acquis observés, passage d’année daté et irréversible, archives. Rien ne s’efface, tout s’explique.'),'#12946F'],
  [Waves,t('Location des installations'),t('Piscine, terrains, salles — une seconde ligne de revenus, sans jamais déloger un cours. La pédagogie passe avant l’argent.'),'#22D3EE'],
  [ShieldAlert,t('Sécurité & incidents'),t('Registre des visiteurs, rondes, main courante, incidents tracés jusqu’à leur résolution.'),STATUS.danger],
  [MessageSquare,t('Communication parents'),t('Annonces ciblées, messages, notifications par classe — sans groupe WhatsApp.'),'#A78BFA'],
  [Plug,t('Interopérabilité OneRoster'),t('Vos données exportées au standard OneRoster v1.2 en un clic. Huit fichiers, un manifest, zéro négociation.'),'#0BA5D8'],
]

const PORTALS = [
  ['schooladmin',UserCog,t('Direction : ce qui attend sa décision, comptes, frais et vie de l’établissement.')],
  ['admin',Users,t('Administration : admissions, élèves, présence et opérations du quotidien.')],
  ['teacher',GraduationCap,t('Enseignant : la classe de l’instant à l’écran, évaluation en un geste, journal du jour.')],
  ['supervisor',Eye,t('Surveillant : présence, incidents et discipline sur le terrain.')],
  ['security',ShieldCheck,t('Sécurité : registre des visiteurs, rondes et soirées à couvrir.')],
  ['parent',HeartHandshake,t('Parent : tous ses enfants — crèche et primaire — dans un seul compte.')],
  ['owner',Building2,t('Plateforme : provisioning des écoles, abonnements et support.')],
]

const PRICING = [
  [t('Essentiel'),'79',[t('Jusqu’à 150 élèves'),t('Un cycle (petite enfance ou primaire)'),t('Admissions en ligne'),t('Portail parents'),t('Support e-mail')],false],
  [t('Pro'),'149',[t('Élèves illimités'),t('Les deux cycles, sous un même toit'),t('Tous les modules, RH & comptabilité'),t('Export OneRoster illimité'),t('Support prioritaire')],true],
  [t('Groupe'),t('Sur devis'),[t('Plusieurs établissements'),t('Tableau consolidé'),t('Rôles & permissions avancés'),t('Accompagnement dédié'),t('Formation sur site')],false],
]

const FAQ = [
  [t('Quels niveaux couvrez-vous ?'),t('De la crèche à la 6ème année : Crèche, Pré-maternelle, Maternelle 1 et 2, puis les six niveaux du primaire. Chaque école déclare SES niveaux, et ne voit que les modules qui la concernent — une crèche n’a pas d’emploi du temps, une école primaire n’a pas de journal de change.')],
  [t('Et si j’ai un enfant en crèche et un autre en primaire ?'),t('C’est exactement pour vous que Coreon EDU existe. Un seul compte parent : le journal du jour du petit et les évaluations du grand, dans la même application.')],
  [t('Nos données nous appartiennent-elles vraiment ?'),t('Oui, et ce n’est pas une phrase : l’export OneRoster v1.2 (le standard international) est intégré et se fait en un clic, sans demande ni frais. Vous pouvez partir quand vous voulez — c’est précisément pour ça que vous resterez.')],
  [t('L’arabe est-il disponible ?'),t('Pas encore — il est en préparation, et c’est notre priorité après la version actuelle. L’interface est aujourd’hui en français.')],
  [t('Faut-il installer quelque chose ?'),t('Non. Coreon EDU fonctionne dans le navigateur, sur ordinateur, tablette et mobile.')],
  [t('Combien de temps pour démarrer ?'),t('Une journée : on importe vos classes et vos élèves, on crée les comptes, et l’école tourne le lendemain.')],
]

// ── ANCRES ─────────────────────────────────────────────────────────────────
// L'application tourne sur HashRouter : le hash EST la route. Un <a href="#modules">
// classique posait donc la route « /modules », que le routeur ne connaît pas —
// la route * renvoyait aussitôt vers « / » et annulait le hash AVANT que le
// navigateur ait pu défiler. Résultat : les cinq entrées du menu ne faisaient
// STRICTEMENT RIEN. On défile donc nous-mêmes, sans jamais toucher au hash.
const SECTIONS = [
  ['deux-mondes', 'Deux mondes'],
  ['modules', 'Modules'],
  ['donnees', 'Vos données'],
  ['tarifs', 'Tarifs'],
  ['faq', 'FAQ'],
]
const HEADER_H = 64   // hauteur de l'en-tête collant (h-16) — sinon le titre passe dessous

function scrollToSection(id){
  const el = document.getElementById(id)
  if(!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const y = el.getBoundingClientRect().top + window.scrollY - HEADER_H
  window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' })
}

/** Quelle section occupe l'écran ? Donne l'état actif que le menu n'avait pas. */
function useActiveSection(){
  const [active, setActive] = useState('')
  useEffect(() => {
    const ids = ['top', ...SECTIONS.map(s => s[0])]
    const els = ids.map(id => document.getElementById(id)).filter(Boolean)
    if(!els.length) return
    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0]
      if(visible) setActive(visible.target.id)
    }, { rootMargin: `-${HEADER_H + 8}px 0px -55% 0px`, threshold: [0, .25, .5, 1] })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
  return active
}

/** Une entrée de menu : défile vraiment, et se marque quand on y est.
    Un <button> et non un <a> : la cible n'est pas une URL — sous HashRouter,
    prétendre le contraire est justement ce qui cassait la navigation. */
function SectionLink({ id, children, active, className='' }){
  const on = active === id
  return (
    <button type="button" onClick={() => scrollToSection(id)}
      aria-current={on ? 'true' : undefined}
      className={`${className} transition-colors ${on ? 'font-semibold' : 'hover:text-ink'}`}
      style={on ? { color: A } : undefined}>
      {children}
    </button>
  )
}

export default function Landing(){
  const nav=useNavigate(); const [faq,setFaq]=useState(0)
  const active=useActiveSection()
  return (
    <div className="bg-white text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/85 border-b border-line">
        <div className="mx-auto max-w-[1120px] px-5 h-16 flex items-center justify-between">
          <button type="button" onClick={()=>scrollToSection('top')} className="flex items-center gap-2"><Mark size={30}/><span className="font-extrabold lowercase tracking-tight">coreon <span className="text-sm font-normal" style={{color:A}}>edu</span></span></button>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted">
            {SECTIONS.map(([id,label])=>(
              <SectionLink key={id} id={id} active={active}>{t(label)}</SectionLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={()=>nav('/inscription')} className={`${BTN_MD} text-muted hover:text-ink hover:bg-canvas`}>{t('Pré-inscription')}</button>
            <button onClick={()=>nav('/login')} className={`${BTN_MD} text-muted hover:text-ink hover:bg-canvas`}>{t('Se connecter')}</button>
            <button onClick={()=>nav('/login')} className={`${BTN_MD} text-white shadow-sm hover:opacity-90`} style={{background:A}}>{t('Démo gratuite')}</button>
          </div>
        </div>
      </header>

      {/* HERO — la raison d'exister, pas un slogan interchangeable */}
      <section id="top" className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{background:'radial-gradient(60% 60% at 80% 0%, #EEF2FF 0%, transparent 60%), radial-gradient(50% 50% at 0% 20%, #E4F7FE 0%, transparent 55%)'}}/>
        <div className="mx-auto max-w-[1120px] px-5 pt-16 pb-10 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div {...up}>
            <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full" style={{background:'#EEF2FF',color:A}}><Baby size={13}/> {t('Petite enfance + primaire, enfin réunis')}</div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.08] mt-5">{t('De la crèche à la 6ème,')}<br/><span style={{color:A}}>{t('un seul toit.')}</span></h1>
            <p className="text-lg text-muted mt-5 max-w-[52ch]">{t('Les logiciels scolaires ignorent la petite enfance ; les applications de crèche ignorent l’école. Un parent d’un enfant de 3 ans et d’un enfant de 8 ans jongle avec deux applications.')} <b className="text-ink">{t('Coreon EDU fait les deux — avec un seul compte parent.')}</b></p>
            <div className="flex flex-wrap gap-3 mt-7">
              <button onClick={()=>nav('/login')} className={`${BTN_LG} text-white shadow-sm hover:opacity-90`} style={{background:A}}>{t('Essayer la démo')} <ArrowRight size={18}/></button>
              <button type="button" onClick={()=>scrollToSection('deux-mondes')} className={`${BTN_LG} bg-white border border-line hover:bg-canvas`}>{t('Comment c’est possible')}</button>
            </div>
            <div className="flex items-center gap-5 mt-7 text-sm text-muted flex-wrap">
              <span className="flex items-center gap-1.5"><Check size={16} style={{color:STATUS.ok}}/> {t('Sans installation')}</span>
              <span className="flex items-center gap-1.5"><Check size={16} style={{color:STATUS.ok}}/> {t('Vos données exportables en 1 clic')}</span>
              <span className="flex items-center gap-1.5"><Check size={16} style={{color:STATUS.ok}}/> {t('Prêt en 1 jour')}</span>
            </div>
          </motion.div>
          <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} transition={{duration:.5,delay:.1}}>
            <EvalMock/>
          </motion.div>
        </div>
        {/* chiffres honnêtes : rien d'inventé, tout est vérifiable dans le produit */}
        <div className="mx-auto max-w-[1120px] px-5 pb-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[[t('2 cycles'),t('petite enfance + primaire')],[t('30 s'),t('pour évaluer une classe')],[t('1 clic'),t('pour exporter vos données')],['7',t('portails par rôle')]].map(([n,l])=>(
              <div key={l} className="card p-5 text-center"><div className="text-3xl font-extrabold" style={{color:A}}>{n}</div><div className="text-xs text-muted mt-1">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* DEUX MONDES, UN SEUL TOIT */}
      <section id="deux-mondes" className="bg-canvas border-y border-line py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <motion.div {...up} className="text-center max-w-[62ch] mx-auto mb-10">
            <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>{t('Le trou du marché')}</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3">{t('Deux métiers différents.')}<br/>{t('Une seule plateforme qui les respecte.')}</h2>
            <p className="text-muted mt-3">{t('Chaque école déclare ses niveaux ; chaque module sait quels niveaux il sert. Une crèche ne voit jamais un module de primaire — et inversement.')}</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div {...up} className="card p-7">
              <span className="w-12 h-12 rounded-2xl grid place-items-center" style={{background:'#FCE7F3',color:'#BE185D'}}><Baby size={22}/></span>
              <h3 className="font-bold mt-4 text-lg">{t('La petite enfance')}</h3>
              <p className="text-sm text-muted mt-1">{t('Crèche · Pré-maternelle · Maternelles')}</p>
              <ul className="mt-4 space-y-2.5">
                {[t('Journal du jour : repas, sieste, change, humeur'),t('Personnes autorisées à récupérer l’enfant'),t('Carnet de vaccination et jalons de développement'),t('Déclaration d’accident avec accusé du parent')].map(t=>(
                  <li key={t} className="flex items-start gap-2.5 text-sm"><Check size={15} className="mt-0.5 shrink-0" style={{color:'#BE185D'}}/>{t}</li>))}
              </ul>
            </motion.div>
            <motion.div {...up} className="card p-7">
              <span className="w-12 h-12 rounded-2xl grid place-items-center" style={{background:'#EEF2FF',color:A}}><GraduationCap size={22}/></span>
              <h3 className="font-bold mt-4 text-lg">{t('L’école primaire')}</h3>
              <p className="text-sm text-muted mt-1">{t('1ère → 6ème année')}</p>
              <ul className="mt-4 space-y-2.5">
                {[t('Évaluation quotidienne partagée en direct'),t('Présence, retards, alertes aux parents'),t('Bulletins, passage d’année, archives'),t('Emploi du temps et suivi par matière')].map(t=>(
                  <li key={t} className="flex items-start gap-2.5 text-sm"><Check size={15} className="mt-0.5 shrink-0" style={{color:A}}/>{t}</li>))}
              </ul>
            </motion.div>
          </div>
          <motion.div {...up} className="card p-6 mt-6 flex items-center gap-4 flex-wrap justify-center text-center">
            <HeartHandshake size={22} style={{color:A}}/>
            <p className="text-sm font-semibold max-w-[64ch]">{t('Et le parent qui a un enfant de chaque côté ?')} <span style={{color:A}}>{t('Un seul compte.')}</span> {t('Le journal du petit et le bulletin du grand, dans la même application, le même soir.')}</p>
          </motion.div>
        </div>
      </section>

      {/* SIGNATURE — l'évaluation 30 s */}
      <section className="mx-auto max-w-[1120px] px-5 py-16">
        <motion.div {...up} className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1"><EvalMock compact/></div>
          <div className="order-1 lg:order-2">
            <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>{t('Notre idée fondatrice')}</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3 leading-tight">{t('Évaluer toute la classe')}<br/>{t('en 30 secondes. Chaque jour.')}</h2>
            <p className="text-muted mt-4 max-w-[46ch]">{t('L’enseignant voit la classe de l’instant à l’écran, glisse chaque élève dans un niveau, ajoute un badge — et la direction comme les parents le voient en direct. On observe un enfant, on ne le compare à personne.')}</p>
            <ul className="mt-5 space-y-3">
              {[t('Glisser-déposer : Excellent · Bien · Moyen · Insuffisant'),t('Badges de motivation, jamais de classement public'),t('Les parents suivent la progression leçon par leçon')].map(t=>(
                <li key={t} className="flex items-start gap-3"><span className="w-6 h-6 rounded-full grid place-items-center shrink-0 mt-0.5" style={{background:'#EEF2FF',color:A}}><Check size={14}/></span><span className="text-sm">{t}</span></li>
              ))}
            </ul>
          </div>
        </motion.div>
      </section>

      {/* LA CHAÎNE D'ACCIDENT — le motif le plus difficile à copier */}
      <section className="bg-canvas border-y border-line py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <motion.div {...up} className="text-center max-w-[62ch] mx-auto mb-10">
            <div className="text-xs font-bold uppercase tracking-widest" style={{color:STATUS.danger}}>{t('La confiance, prouvée')}</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3">{t('« Personne ne m’a prévenu. »')}<br/>{t('Cette phrase ne peut plus exister.')}</h2>
            <p className="text-muted mt-3">{t('Un accident n’est pas un formulaire : c’est une chaîne de confiance entre l’école et la famille — chaque maillon est signé et daté.')}</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[[HeartPulse,t('1 · Le témoin déclare'),t('L’adulte qui a vu pointe la blessure sur un schéma corporel et raconte. Il n’invente pas de jargon — il montre.')],
              [Eye,t('2 · Un autre valide'),t('Celui qui déclare ne valide jamais. Deux paires d’yeux, toujours — c’est ce qui rend le document crédible.')],
              [MessageSquare,t('3 · Le parent est prévenu'),t('La déclaration validée part au parent. Envoyé n’est pas lu, lu n’est pas signé — le système fait la différence.')],
              [Check,t('4 · Le parent signe'),t('L’accusé de réception du parent clôt la chaîne. Sans signature, l’école voit qui relancer. Rien ne s’efface, jamais.')]].map(([Icon,t,d],i)=>(
              <motion.div key={t} {...up} transition={{duration:.4,delay:i*.06}} className="card p-6">
                <span className="w-11 h-11 rounded-2xl grid place-items-center" style={{background:STATUS.dangerSoft,color:STATUS.danger}}><Icon size={20}/></span>
                <h3 className="font-bold mt-4 text-[15px]">{t}</h3>
                <p className="text-sm text-muted mt-1.5">{d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULES — ceux qui existent, allumés */}
      <section id="modules" className="mx-auto max-w-[1120px] px-5 py-16">
        <motion.div {...up} className="text-center max-w-[60ch] mx-auto mb-10">
          <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>{t('Complet là où ça compte')}</div>
          <h2 className="text-3xl md:text-4xl font-extrabold mt-3">{t('Les modules d’un vrai ERP')}</h2>
          <p className="text-muted mt-3">{t('Les modules de base sont complets et sans surprise. Nos idées — le journal, le suivi en direct, la chaîne d’accident — sont ce que personne d’autre n’a.')}</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {MODULES.map(([Icon,t,d,c],i)=>(
            <motion.div key={t} {...up} transition={{duration:.4,delay:i*.03}} className="card p-6 hover:shadow-xl transition">
              <span className="w-12 h-12 rounded-2xl grid place-items-center" style={{background:c+'1A',color:c}}><Icon size={22}/></span>
              <h3 className="font-bold mt-4">{t}</h3>
              <p className="text-sm text-muted mt-1.5">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VOS DONNÉES — l'arme commerciale, dite sobrement */}
      <section id="donnees" className="bg-canvas border-y border-line py-16">
        <div className="mx-auto max-w-[1120px] px-5 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div {...up}>
            <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>{t('Interopérabilité')}</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3 leading-tight">{t('Vos données sont à vous.')}<br/>{t('Un clic, et elles sortent.')}</h2>
            <p className="text-muted mt-4 max-w-[52ch]">{t('Au Royaume-Uni, l’autorité de la concurrence a dû ouvrir une enquête contre un éditeur scolaire dominant qui verrouillait contractuellement l’export des données des écoles — leurs propres données.')}</p>
            <p className="mt-3 max-w-[52ch] font-semibold">{t('Nous avons construit l’inverse : l’export')} <b style={{color:A}}>OneRoster v1.2</b> {t('— le standard international — est un bouton du produit. Huit fichiers CSV, un manifest, aucune demande à formuler, aucun frais.')}</p>
            <p className="text-muted mt-3 text-sm">{t('Vous pouvez partir quand vous voulez. C’est précisément pour ça que vous resterez.')}</p>
          </motion.div>
          <motion.div {...up} className="card p-6">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="font-bold text-sm flex items-center gap-2"><Plug size={16} style={{color:A}}/> {t('Export OneRoster v1.2')}</div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{background:STATUS.okSoft,color:STATUS.ok}}>{t('CONFORME')}</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {['manifest.csv','orgs.csv','academicSessions.csv','courses.csv','classes.csv','users.csv','enrollments.csv','demographics.csv'].map(f=>(
                <div key={f} className="flex items-center justify-between text-sm rounded-lg px-3 py-1.5 bg-canvas">
                  <span className="font-mono text-[13px]">{f}</span><Check size={14} style={{color:STATUS.ok}}/>
                </div>
              ))}
            </div>
            <button onClick={()=>nav('/login')} className={`${BTN_MD} w-full mt-4 text-white`} style={{background:A}}><Download size={15}/> {t('Voir dans la démo')}</button>
          </motion.div>
        </div>
      </section>

      {/* LES RÈGLES — la section confiance, VRAIE, à la place des faux témoignages */}
      <section className="mx-auto max-w-[1120px] px-5 py-16">
        <motion.div {...up} className="text-center max-w-[62ch] mx-auto mb-10">
          <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>{t('Écrites dans le cœur du produit')}</div>
          <h2 className="text-3xl md:text-4xl font-extrabold mt-3">{t('Les règles qui ne se négocient pas')}</h2>
          <p className="text-muted mt-3">{t('Elles ne vivent pas dans l’interface — elles vivent dans le moteur, et aucun écran ne peut les contourner.')}</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[[BookUser,'Un enfant ne part jamais avec quelqu’un qui n’est pas sur la liste.'],
            [Eye,'Deux paires d’yeux sur chaque déclaration d’accident : qui déclare ne valide pas.'],
            [Users,'Personne ne valide sa propre demande — congé ou dépense.'],
            [Landmark,'Une facture émise ne se modifie pas : on l’annule par un avoir daté et motivé.'],
            [ShieldCheck,'On archive, on ne supprime jamais un dossier scolaire.'],
            [Star,'On observe un enfant, on ne le note pas — et on ne le compare à personne.']].map(([Icon,t],i)=>(
            <motion.div key={t} {...up} transition={{duration:.4,delay:i*.04}} className="card p-6 flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{background:'#EEF2FF',color:A}}><Icon size={18}/></span>
              <p className="text-sm font-semibold">{t}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PORTALS */}
      <section id="portails" className="bg-canvas border-y border-line py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <motion.div {...up} className="text-center max-w-[60ch] mx-auto mb-10">
            <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>Un portail par rôle</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3">Chacun voit ce qui le concerne</h2>
            <p className="text-muted mt-3">Accès refusé par défaut, ouvert par rôle. Un parent ne voit jamais les finances ; un enseignant, jamais un autre établissement.</p>
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
              {pop&&<span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[12px] font-bold text-white px-3 py-1 rounded-full" style={{background:A}}>Le plus complet</span>}
              <div className="font-bold text-lg">{name}</div>
              <div className="mt-2 flex items-end gap-1"><span className="text-4xl font-extrabold">{price}</span>{price!=='Sur devis'&&<span className="text-muted mb-1 text-sm">TND / mois</span>}</div>
              <ul className="mt-5 space-y-2.5">{feats.map(f=><li key={f} className="flex items-start gap-2 text-sm"><Check size={16} className="mt-0.5 shrink-0" style={{color:STATUS.ok}}/>{f}</li>)}</ul>
              <button onClick={()=>nav('/login')} className={`${BTN_LG} w-full mt-6 ${pop?'text-white shadow-sm hover:opacity-90':'bg-white border border-line hover:bg-canvas'}`} style={pop?{background:A}:{}}>Commencer</button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-canvas border-y border-line">
        <div className="mx-auto max-w-[760px] px-5 py-16">
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
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1120px] px-5 py-16">
        <motion.div {...up} className="rounded-3xl p-10 md:p-14 text-center text-white relative overflow-hidden" style={{background:'linear-gradient(135deg,#7539E4,#22D3EE)'}}>
          <h2 className="text-3xl md:text-4xl font-extrabold">Voyez les deux mondes par vous-même.</h2>
          <p className="mt-3 text-white/85 max-w-[54ch] mx-auto">Ouvrez la démo avec le compte parent : un enfant en crèche, un enfant en 5ème — une seule application. C’est toute la démonstration.</p>
          <button onClick={()=>nav('/login')} className={`${BTN_LG} mt-7 bg-white shadow-sm hover:opacity-90`} style={{color:A}}>Démarrer la démo <ArrowRight size={18}/></button>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1120px] px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2"><Mark size={26}/><span className="font-extrabold lowercase text-ink">coreon <span className="font-normal" style={{color:A}}>edu</span></span></div>
          <div className="flex items-center gap-5">
            <button type="button" onClick={()=>scrollToSection('modules')} className="hover:text-ink">{t('Modules')}</button>
            <button type="button" onClick={()=>scrollToSection('donnees')} className="hover:text-ink">{t('Vos données')}</button>
            <button type="button" onClick={()=>scrollToSection('tarifs')} className="hover:text-ink">{t('Tarifs')}</button>
            <a href="https://kogiagroup.com" className="hover:text-ink">Kogia Group</a>
          </div>
          <div>© 2026 Kogia Group</div>
        </div>
      </footer>
    </div>
  )
}

// --- la maquette produit (évaluation par glisser-déposer) ---
function EvalMock({ compact }){
  const buckets=[['Excellent',STATUS.ok,STATUS.okSoft,['AB','YT']],['Bien',STATUS.info,STATUS.infoSoft,['LK','SM']],['Moyen',STATUS.warn,STATUS.warnSoft,['HB']],['Insuffisant',STATUS.danger,STATUS.dangerSoft,['NJ']]]
  return (
    <div className="card p-4 shadow-2xl" style={{boxShadow:'0 30px 60px -25px rgba(117,57,228,.45)'}}>
      <div className="flex items-center justify-between px-1 pb-3 border-b border-line">
        <div><div className="font-bold text-sm">5ème A · Mathématiques</div><div className="text-[12px] text-muted">Participation en classe · maintenant</div></div>
        <span className="text-[11px] font-bold px-2 py-1 rounded-full text-white" style={{background:STATUS.live}}>● EN DIRECT</span>
      </div>
      <div className={`grid grid-cols-2 gap-2.5 mt-3 ${compact?'':'sm:grid-cols-4'}`}>
        {buckets.map(([label,c,soft,kids])=>(
          <div key={label} className="rounded-xl p-2.5" style={{background:soft}}>
            <div className="text-[12px] font-bold mb-2" style={{color:c}}>{label}</div>
            <div className="flex flex-wrap gap-1.5">
              {kids.map(k=><span key={k} className="w-8 h-8 rounded-full grid place-items-center text-white text-[12px] font-bold" style={{background:c}}>{k}</span>)}
              <span className="w-8 h-8 rounded-full grid place-items-center text-[12px] border-2 border-dashed" style={{borderColor:c,color:c}}>+</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
        <div className="flex gap-1">{[[Star,STATUS.warn],[TrendingUp,STATUS.ok],[Handshake,A]].map(([I,c],i)=><span key={i} className="w-8 h-8 rounded-lg grid place-items-center bg-canvas" style={{color:c}}><I size={15}/></span>)}</div>
        <button className="text-xs font-bold text-white px-4 py-2 rounded-lg" style={{background:A}}>Enregistrer & partager</button>
      </div>
    </div>
  )
}
