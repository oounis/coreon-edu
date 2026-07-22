import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { login, loginAs } from '@core/auth.js'
import { BRAND, N } from '@core/tokens.js'
import { ROLE } from '@core/theme.js'
import { db } from '@core/db.js'
import { Mark } from '../components/ui.jsx'
import { t } from '@core/i18n.js'
import LangSwitch from '../components/Lang.jsx'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'

// Refonte 2026-07-18 : l'écran de connexion devient la première impression du
// PRODUIT, pas un formulaire gris. Langage aligné sur kogiagroup.com (héros
// sombre, halos, verre, aperçu produit) MAIS dans la famille de Coreon Edu :
// le VIOLET (tokens.js — « une école n'est pas une banque »). Aucune couleur
// hors jetons ; le logo n'apparaît qu'en haut ; mouvement coupé si réduit.
export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false); const [err, setErr] = useState('')
  const go = () => {
    const u = login(email, pw)
    if (u && !u.disabled) nav('/app')
    else setErr(u && u.disabled ? t('Ce compte a été désactivé. Contactez la direction.') : t('E-mail ou mot de passe incorrect.'))
  }
  const quick = db().users
    .filter(u => ['schooladmin', 'admin', 'teacher', 'supervisor', 'security', 'parent'].includes(u.role))
    .filter((u, i, a) => a.findIndex(x => x.role === u.role) === i)
  const stats = [['121', 'Élèves'], ['96%', 'Présence'], ['8', 'À décider']]

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_.95fr]" style={{ background: N.canvas }}>
      <style>{`
        @keyframes lgF1{to{transform:translate(50px,42px) scale(1.16)}}
        @keyframes lgF2{to{transform:translate(-42px,52px) scale(1.1)}}
        .lg-blob{position:absolute;border-radius:50%;pointer-events:none}
        .lg-b1{animation:lgF1 17s cubic-bezier(.2,.8,.2,1) infinite alternate}
        .lg-b2{animation:lgF2 21s cubic-bezier(.2,.8,.2,1) infinite alternate}
        .lg-input{transition:border-color .16s,box-shadow .16s}
        .lg-input:focus{outline:none;border-color:#7539E4;box-shadow:0 0 0 3px rgba(117,57,228,.16)}
        .lg-cta{transition:transform .16s cubic-bezier(.2,.8,.2,1),box-shadow .16s,filter .16s}
        .lg-cta:hover{transform:translateY(-2px);box-shadow:0 16px 30px -12px rgba(117,57,228,.6);filter:brightness(1.05)}
        .lg-cta:active{transform:translateY(0)}
        .lg-pill{transition:border-color .15s,background .15s,transform .15s}
        .lg-pill:hover{transform:translateY(-1px);border-color:#C4B0FB;background:#F6F3FF}
        @media (prefers-reduced-motion:reduce){.lg-b1,.lg-b2{animation:none}}
      `}</style>

      {/* ── PANNEAU MARQUE — sombre, violet, cinématique ── */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden text-white"
        style={{ background: `linear-gradient(155deg,#1C1046 0%,#0C0A26 55%,${N.abyss} 100%)` }}>
        <span className="lg-blob lg-b1" style={{ width: 460, height: 460, background: BRAND.action, opacity: .5, filter: 'blur(72px)', top: -120, left: -110 }} />
        <span className="lg-blob lg-b2" style={{ width: 360, height: 360, background: BRAND.cyan, opacity: .2, filter: 'blur(80px)', bottom: -90, right: -70 }} />
        <span className="lg-blob" style={{ width: 300, height: 300, background: BRAND.mark, opacity: .3, filter: 'blur(90px)', top: '34%', left: '42%' }} />

        <div className="relative flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(255,255,255,.14)' }}><Mark size={24} className="text-white" /></span>
          <span className="font-extrabold text-lg lowercase tracking-tight">coreon <span className="font-normal opacity-70">edu</span></span>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
            style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)' }}>
            <Sparkles size={13} /> {t('Pas un ERP scolaire de plus')}
          </div>
          <h1 className="font-extrabold tracking-tight" style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(2.1rem,3.3vw,3.1rem)', lineHeight: 1.08, maxWidth: '15ch' }}>
            {t("L'école qu'on a envie d'ouvrir.")}
          </h1>
          <p className="mt-5 text-white/75 leading-relaxed" style={{ maxWidth: '42ch' }}>
            Évaluer une classe en 30&nbsp;secondes, suivre la journée de son enfant en direct, organiser la vie commune : web et mobile, les mêmes données.
          </p>

          {/* aperçu produit : une carte de verre aux chiffres vivants */}
          <div className="mt-8 rounded-2xl p-4 w-full max-w-sm"
            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', backdropFilter: 'blur(8px)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white/70">Tableau de bord · aujourd'hui</span>
              <span className="w-6 h-6 rounded-lg" style={{ background: `linear-gradient(135deg,${BRAND.action},${BRAND.mark})` }} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {stats.map(([n, l], i) => (
                <div key={l} className="rounded-xl p-2.5" style={{ background: i === 1 ? `linear-gradient(135deg,${BRAND.action},${BRAND.hover})` : 'rgba(255,255,255,.06)' }}>
                  <div className="font-extrabold text-lg leading-none" style={{ fontFamily: 'Sora, sans-serif' }}>{n}</div>
                  <div className="text-[10px] text-white/60 mt-1">{l}</div>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-1.5 mt-3 h-10">
              {[42, 66, 54, 82, 70, 92].map((h, i) => (
                <span key={i} className="flex-1 rounded-t" style={{ height: h + '%', background: `linear-gradient(180deg,${BRAND.mark},${BRAND.action})`, opacity: .85 }} />
              ))}
            </div>
          </div>
        </div>

        <div className="relative text-white/55 text-sm">par Kogia Group · © 2026 · Tunisie</div>
      </div>

      {/* ── FORMULAIRE ── */}
      {/* overflow-hidden : le halo décoratif fait 440px de large et débordait de
          25px sur téléphone (390px), créant une barre de défilement horizontale.
          Il est décoratif — on le coupe, on ne rétrécit pas la page. */}
      <div className="relative flex items-center justify-center p-6 sm:p-10 overflow-hidden">
        <div className="absolute pointer-events-none" style={{ width: 440, height: 440, borderRadius: '50%', background: BRAND.mark, filter: 'blur(100px)', opacity: .1 }} />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease: [.2, .8, .2, 1] }} className="relative w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Mark size={30} style={{ color: BRAND.mark }} />
            <span className="font-extrabold lowercase tracking-tight">coreon <span className="text-sm font-normal" style={{ color: BRAND.action }}>edu</span></span>
          </div>

          <div className="bg-white rounded-3xl border border-line p-7 sm:p-8" style={{ boxShadow: '0 30px 60px -28px rgba(14,33,53,.28)' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-2xl font-extrabold" style={{ fontFamily: 'Sora, sans-serif' }}>{t('Bon retour')}</h2>
              <LangSwitch />
            </div>
            <p className="text-muted text-sm mb-6">{t('Connectez-vous à votre portail.')}</p>

            <div className="space-y-3">
              <div className="relative">
                <Mail size={17} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input className="lg-input w-full rounded-xl border border-line bg-white ps-11 pe-3 py-3 text-sm"
                  type="email" autoComplete="username" value={email} placeholder={t('E-mail')}
                  onChange={e => { setEmail(e.target.value); setErr('') }} />
              </div>
              <div className="relative">
                <Lock size={17} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input className="lg-input w-full rounded-xl border border-line bg-white ps-11 pe-11 py-3 text-sm"
                  type={showPw ? 'text' : 'password'} autoComplete="current-password" value={pw} placeholder={t('Mot de passe')}
                  onChange={e => { setPw(e.target.value); setErr('') }} onKeyDown={e => e.key === 'Enter' && go()} />
                <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? t('Masquer le mot de passe') : t('Afficher le mot de passe')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {err && <div className="text-sm text-coral">{typeof err === 'string' ? err : t('E-mail ou mot de passe incorrect.')}</div>}
              {/* CR-013 : il n'existait AUCUN moyen de récupérer un accès. */}
              <div className="flex justify-end">
                <Link to="/mot-de-passe-oublie" className="text-xs font-semibold text-muted hover:text-ink">
                  {t('Mot de passe oublié ?')}
                </Link>
              </div>
              <button onClick={go}
                className="lg-cta w-full flex items-center justify-center gap-2 rounded-xl text-white font-bold text-sm py-3.5 mt-1"
                style={{ background: `linear-gradient(135deg,${BRAND.action},${BRAND.mark})`, boxShadow: '0 10px 24px -10px rgba(117,57,228,.6)' }}>
                {t('Se connecter')} <ArrowRight size={17} />
              </button>
            </div>

            <div className="mt-7 pt-6" style={{ borderTop: `1px solid ${N.line}` }}>
              <div className="text-xs font-semibold text-muted mb-2.5">{t('Démo · connexion en un clic :')}</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { loginAs('u_owner'); nav('/app') }}
                  className="lg-pill text-xs font-semibold px-3 py-1.5 rounded-full border border-line bg-white" style={{ color: ROLE.owner.color }}>
                  Kogia Group ({t(ROLE.owner.label)})
                </button>
                {quick.map(u => { const r = ROLE[u.role]; return (
                  <button key={u.id} onClick={() => { loginAs(u.id); nav('/app') }}
                    className="lg-pill text-xs font-semibold px-3 py-1.5 rounded-full border border-line bg-white" style={{ color: r.color }}>
                    {t(r.label)}
                  </button>
                )})}
              </div>
              <div className="text-[12px] text-muted mt-3 leading-relaxed">ex : direction@alnour.tn / admin · enseignant@alnour.tn / teacher · securite@alnour.tn / secu</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
