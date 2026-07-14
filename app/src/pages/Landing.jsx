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
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mark, STATUS } from '../components/ui.jsx'
import { ROLE } from '@core/theme.js'
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
  [UserPlus,'Pré-inscription & admissions','Le parent dépose en ligne, avec ses pièces. La candidature devient l’élève sans jamais ressaisir — le parcours entier est tracé.',A],
  [NotebookPen,'Journal du jour','Repas, sieste, change, humeur — un geste, pas un formulaire. Le parent le lit le soir même.','#0BA5D8'],
  [BookUser,'Dossier de l’enfant','Personnes autorisées à récupérer l’enfant, vaccins, jalons de développement. La règle la plus grave du métier, tenue par le système.',STATUS.danger],
  [ClipboardCheck,'Évaluation quotidienne','Toute la classe évaluée en 30 secondes, partagée en direct avec la direction et les parents.',STATUS.ok],
  [Radio,'Suivi en direct','Où en est la journée de mon enfant, maintenant — cours, cantine, récréation, infirmerie.','#8B5CF6'],
  [Wallet,'Comptabilité défendable','Barème par niveau, remises tracées, factures, reçus numérotés, avoirs. Une facture émise ne se modifie jamais.',STATUS.warn],
  [Users,'RH & paie','Contrats, congés avec circuit d’approbation, paie calculée sur les faits. Personne ne valide sa propre demande.','#0E7FB8'],
  [FileBadge,'Bulletins & passage','Notes et acquis observés, passage d’année daté et irréversible, archives. Rien ne s’efface, tout s’explique.','#12946F'],
  [Waves,'Location des installations','Piscine, terrains, salles — une seconde ligne de revenus, sans jamais déloger un cours. La pédagogie passe avant l’argent.','#22D3EE'],
  [ShieldAlert,'Sécurité & incidents','Registre des visiteurs, rondes, main courante, incidents tracés jusqu’à leur résolution.',STATUS.danger],
  [MessageSquare,'Communication parents','Annonces ciblées, messages, notifications par classe — sans groupe WhatsApp.','#A78BFA'],
  [Plug,'Interopérabilité OneRoster','Vos données exportées au standard OneRoster v1.2 en un clic. Huit fichiers, un manifest, zéro négociation.','#0BA5D8'],
]

const PORTALS = [
  ['schooladmin',UserCog,'Direction : ce qui attend sa décision, comptes, frais et vie de l’établissement.'],
  ['admin',Users,'Administration : admissions, élèves, présence et opérations du quotidien.'],
  ['teacher',GraduationCap,'Enseignant : la classe de l’instant à l’écran, évaluation en un geste, journal du jour.'],
  ['supervisor',Eye,'Surveillant : présence, incidents et discipline sur le terrain.'],
  ['security',ShieldCheck,'Sécurité : registre des visiteurs, rondes et soirées à couvrir.'],
  ['parent',HeartHandshake,'Parent : tous ses enfants — crèche et primaire — dans un seul compte.'],
  ['owner',Building2,'Plateforme : provisioning des écoles, abonnements et support.'],
]

const PRICING = [
  ['Essentiel','79',['Jusqu’à 150 élèves','Un cycle (petite enfance ou primaire)','Admissions en ligne','Portail parents','Support e-mail'],false],
  ['Pro','149',['Élèves illimités','Les deux cycles, sous un même toit','Tous les modules, RH & comptabilité','Export OneRoster illimité','Support prioritaire'],true],
  ['Groupe','Sur devis',['Plusieurs établissements','Tableau consolidé','Rôles & permissions avancés','Accompagnement dédié','Formation sur site'],false],
]

const FAQ = [
  ['Quels niveaux couvrez-vous ?','De la crèche à la 6ème année : Crèche, Pré-maternelle, Maternelle 1 et 2, puis les six niveaux du primaire. Chaque école déclare SES niveaux, et ne voit que les modules qui la concernent — une crèche n’a pas d’emploi du temps, une école primaire n’a pas de journal de change.'],
  ['Et si j’ai un enfant en crèche et un autre en primaire ?','C’est exactement pour vous que Coreon EDU existe. Un seul compte parent : le journal du jour du petit et les évaluations du grand, dans la même application.'],
  ['Nos données nous appartiennent-elles vraiment ?','Oui, et ce n’est pas une phrase : l’export OneRoster v1.2 (le standard international) est intégré et se fait en un clic, sans demande ni frais. Vous pouvez partir quand vous voulez — c’est précisément pour ça que vous resterez.'],
  ['L’arabe est-il disponible ?','Pas encore — il est en préparation, et c’est notre priorité après la version actuelle. L’interface est aujourd’hui en français.'],
  ['Faut-il installer quelque chose ?','Non. Coreon EDU fonctionne dans le navigateur, sur ordinateur, tablette et mobile.'],
  ['Combien de temps pour démarrer ?','Une journée : on importe vos classes et vos élèves, on crée les comptes, et l’école tourne le lendemain.'],
]

export default function Landing(){
  const nav=useNavigate(); const [faq,setFaq]=useState(0)
  return (
    <div className="bg-white text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/85 border-b border-line">
        <div className="mx-auto max-w-[1120px] px-5 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2"><Mark size={30}/><span className="font-extrabold lowercase tracking-tight">coreon <span className="text-sm font-normal" style={{color:A}}>edu</span></span></a>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted">
            <a href="#deux-mondes" className="hover:text-ink">Deux mondes</a>
            <a href="#modules" className="hover:text-ink">Modules</a>
            <a href="#donnees" className="hover:text-ink">Vos données</a>
            <a href="#tarifs" className="hover:text-ink">Tarifs</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={()=>nav('/inscription')} className={`${BTN_MD} text-muted hover:text-ink hover:bg-canvas`}>Pré-inscription</button>
            <button onClick={()=>nav('/login')} className={`${BTN_MD} text-muted hover:text-ink hover:bg-canvas`}>Se connecter</button>
            <button onClick={()=>nav('/login')} className={`${BTN_MD} text-white shadow-sm hover:opacity-90`} style={{background:A}}>Démo gratuite</button>
          </div>
        </div>
      </header>

      {/* HERO — la raison d'exister, pas un slogan interchangeable */}
      <section id="top" className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{background:'radial-gradient(60% 60% at 80% 0%, #EEF2FF 0%, transparent 60%), radial-gradient(50% 50% at 0% 20%, #E4F7FE 0%, transparent 55%)'}}/>
        <div className="mx-auto max-w-[1120px] px-5 pt-16 pb-10 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div {...up}>
            <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full" style={{background:'#EEF2FF',color:A}}><Baby size={13}/> Petite enfance + primaire, enfin réunis</div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.08] mt-5">De la crèche à la 6ème,<br/><span style={{color:A}}>un seul toit.</span></h1>
            <p className="text-lg text-muted mt-5 max-w-[52ch]">Les logiciels scolaires ignorent la petite enfance ; les applications de crèche ignorent l’école. Un parent d’un enfant de 3 ans et d’un enfant de 8 ans jongle avec deux applications. <b className="text-ink">Coreon EDU fait les deux — avec un seul compte parent.</b></p>
            <div className="flex flex-wrap gap-3 mt-7">
              <button onClick={()=>nav('/login')} className={`${BTN_LG} text-white shadow-sm hover:opacity-90`} style={{background:A}}>Essayer la démo <ArrowRight size={18}/></button>
              <a href="#deux-mondes" className={`${BTN_LG} bg-white border border-line hover:bg-canvas`}>Comment c’est possible</a>
            </div>
            <div className="flex items-center gap-5 mt-7 text-sm text-muted flex-wrap">
              <span className="flex items-center gap-1.5"><Check size={16} style={{color:STATUS.ok}}/> Sans installation</span>
              <span className="flex items-center gap-1.5"><Check size={16} style={{color:STATUS.ok}}/> Vos données exportables en 1 clic</span>
              <span className="flex items-center gap-1.5"><Check size={16} style={{color:STATUS.ok}}/> Prêt en 1 jour</span>
            </div>
          </motion.div>
          <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} transition={{duration:.5,delay:.1}}>
            <EvalMock/>
          </motion.div>
        </div>
        {/* chiffres honnêtes : rien d'inventé, tout est vérifiable dans le produit */}
        <div className="mx-auto max-w-[1120px] px-5 pb-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[['2 cycles','petite enfance + primaire'],['30 s','pour évaluer une classe'],['1 clic','pour exporter vos données'],['7','portails par rôle']].map(([n,l])=>(
              <div key={l} className="card p-5 text-center"><div className="text-3xl font-extrabold" style={{color:A}}>{n}</div><div className="text-xs text-muted mt-1">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* DEUX MONDES, UN SEUL TOIT */}
      <section id="deux-mondes" className="bg-canvas border-y border-line py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <motion.div {...up} className="text-center max-w-[62ch] mx-auto mb-10">
            <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>Le trou du marché</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3">Deux métiers différents.<br/>Une seule plateforme qui les respecte.</h2>
            <p className="text-muted mt-3">Chaque école déclare ses niveaux ; chaque module sait quels niveaux il sert. Une crèche ne voit jamais un module de primaire — et inversement.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div {...up} className="card p-7">
              <span className="w-12 h-12 rounded-2xl grid place-items-center" style={{background:'#FCE7F3',color:'#BE185D'}}><Baby size={22}/></span>
              <h3 className="font-bold mt-4 text-lg">La petite enfance</h3>
              <p className="text-sm text-muted mt-1">Crèche · Pré-maternelle · Maternelles</p>
              <ul className="mt-4 space-y-2.5">
                {['Journal du jour : repas, sieste, change, humeur','Personnes autorisées à récupérer l’enfant','Carnet de vaccination et jalons de développement','Déclaration d’accident avec accusé du parent'].map(t=>(
                  <li key={t} className="flex items-start gap-2.5 text-sm"><Check size={15} className="mt-0.5 shrink-0" style={{color:'#BE185D'}}/>{t}</li>))}
              </ul>
            </motion.div>
            <motion.div {...up} className="card p-7">
              <span className="w-12 h-12 rounded-2xl grid place-items-center" style={{background:'#EEF2FF',color:A}}><GraduationCap size={22}/></span>
              <h3 className="font-bold mt-4 text-lg">L’école primaire</h3>
              <p className="text-sm text-muted mt-1">1ère → 6ème année</p>
              <ul className="mt-4 space-y-2.5">
                {['Évaluation quotidienne partagée en direct','Présence, retards, alertes aux parents','Bulletins, passage d’année, archives','Emploi du temps et suivi par matière'].map(t=>(
                  <li key={t} className="flex items-start gap-2.5 text-sm"><Check size={15} className="mt-0.5 shrink-0" style={{color:A}}/>{t}</li>))}
              </ul>
            </motion.div>
          </div>
          <motion.div {...up} className="card p-6 mt-6 flex items-center gap-4 flex-wrap justify-center text-center">
            <HeartHandshake size={22} style={{color:A}}/>
            <p className="text-sm font-semibold max-w-[64ch]">Et le parent qui a un enfant de chaque côté ? <span style={{color:A}}>Un seul compte.</span> Le journal du petit et le bulletin du grand, dans la même application, le même soir.</p>
          </motion.div>
        </div>
      </section>

      {/* SIGNATURE — l'évaluation 30 s */}
      <section className="mx-auto max-w-[1120px] px-5 py-16">
        <motion.div {...up} className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1"><EvalMock compact/></div>
          <div className="order-1 lg:order-2">
            <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>Notre idée fondatrice</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3 leading-tight">Évaluer toute la classe<br/>en 30 secondes. Chaque jour.</h2>
            <p className="text-muted mt-4 max-w-[46ch]">L’enseignant voit la classe de l’instant à l’écran, glisse chaque élève dans un niveau, ajoute un badge — et la direction comme les parents le voient en direct. On observe un enfant, on ne le compare à personne.</p>
            <ul className="mt-5 space-y-3">
              {['Glisser-déposer : Excellent · Bien · Moyen · Insuffisant','Badges de motivation, jamais de classement public','Les parents suivent la progression leçon par leçon'].map(t=>(
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
            <div className="text-xs font-bold uppercase tracking-widest" style={{color:STATUS.danger}}>La confiance, prouvée</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3">« Personne ne m’a prévenu. »<br/>Cette phrase ne peut plus exister.</h2>
            <p className="text-muted mt-3">Un accident n’est pas un formulaire : c’est une chaîne de confiance entre l’école et la famille — chaque maillon est signé et daté.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[[HeartPulse,'1 · Le témoin déclare','L’adulte qui a vu pointe la blessure sur un schéma corporel et raconte. Il n’invente pas de jargon — il montre.'],
              [Eye,'2 · Un autre valide','Celui qui déclare ne valide jamais. Deux paires d’yeux, toujours — c’est ce qui rend le document crédible.'],
              [MessageSquare,'3 · Le parent est prévenu','La déclaration validée part au parent. Envoyé n’est pas lu, lu n’est pas signé — le système fait la différence.'],
              [Check,'4 · Le parent signe','L’accusé de réception du parent clôt la chaîne. Sans signature, l’école voit qui relancer. Rien ne s’efface, jamais.']].map(([Icon,t,d],i)=>(
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
          <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>Complet là où ça compte</div>
          <h2 className="text-3xl md:text-4xl font-extrabold mt-3">Les modules d’un vrai ERP</h2>
          <p className="text-muted mt-3">Les modules de base sont complets et sans surprise. Nos idées — le journal, le suivi en direct, la chaîne d’accident — sont ce que personne d’autre n’a.</p>
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
            <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>Interopérabilité</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3 leading-tight">Vos données sont à vous.<br/>Un clic, et elles sortent.</h2>
            <p className="text-muted mt-4 max-w-[52ch]">Au Royaume-Uni, l’autorité de la concurrence a dû ouvrir une enquête contre un éditeur scolaire dominant qui verrouillait contractuellement l’export des données des écoles — leurs propres données.</p>
            <p className="mt-3 max-w-[52ch] font-semibold">Nous avons construit l’inverse : l’export <b style={{color:A}}>OneRoster v1.2</b> — le standard international — est un bouton du produit. Huit fichiers CSV, un manifest, aucune demande à formuler, aucun frais.</p>
            <p className="text-muted mt-3 text-sm">Vous pouvez partir quand vous voulez. C’est précisément pour ça que vous resterez.</p>
          </motion.div>
          <motion.div {...up} className="card p-6">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="font-bold text-sm flex items-center gap-2"><Plug size={16} style={{color:A}}/> Export OneRoster v1.2</div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{background:STATUS.okSoft,color:STATUS.ok}}>CONFORME</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {['manifest.csv','orgs.csv','academicSessions.csv','courses.csv','classes.csv','users.csv','enrollments.csv','demographics.csv'].map(f=>(
                <div key={f} className="flex items-center justify-between text-sm rounded-lg px-3 py-1.5 bg-canvas">
                  <span className="font-mono text-[13px]">{f}</span><Check size={14} style={{color:STATUS.ok}}/>
                </div>
              ))}
            </div>
            <button onClick={()=>nav('/login')} className={`${BTN_MD} w-full mt-4 text-white`} style={{background:A}}><Download size={15}/> Voir dans la démo</button>
          </motion.div>
        </div>
      </section>

      {/* LES RÈGLES — la section confiance, VRAIE, à la place des faux témoignages */}
      <section className="mx-auto max-w-[1120px] px-5 py-16">
        <motion.div {...up} className="text-center max-w-[62ch] mx-auto mb-10">
          <div className="text-xs font-bold uppercase tracking-widest" style={{color:A}}>Écrites dans le cœur du produit</div>
          <h2 className="text-3xl md:text-4xl font-extrabold mt-3">Les règles qui ne se négocient pas</h2>
          <p className="text-muted mt-3">Elles ne vivent pas dans l’interface — elles vivent dans le moteur, et aucun écran ne peut les contourner.</p>
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
            <a href="#modules" className="hover:text-ink">Modules</a>
            <a href="#donnees" className="hover:text-ink">Vos données</a>
            <a href="#tarifs" className="hover:text-ink">Tarifs</a>
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
