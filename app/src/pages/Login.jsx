import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { login, loginAs } from '@core/auth.js'
import { BRAND, N } from '@core/tokens.js'
import { ROLE } from '@core/theme.js'
import { db } from '@core/db.js'
import { Mark } from '../components/ui.jsx'
import { EvalMock } from './site/shared.jsx'
import { t } from '@core/i18n.js'
import LangSwitch from '../components/Lang.jsx'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'

// CR-011 — direction « Clair éditorial » (choisie par Othman, 2026-07-23).
// L'écran de connexion quitte le sombre cinématique pour un parti pris CLAIR,
// aligné sur kogiagroup.com (le site clair validé, Lighthouse 99) : il dit
// « école », pas « banque ». Formulaire à gauche sur un dégradé lavande, panneau
// marque à droite montrant la VRAIE maquette produit (l'évaluation en direct).
// Le violet Coreon reste l'accent (tokens.js) ; aucune couleur hors jetons ; le
// logo n'apparaît qu'en haut ; mouvement coupé si réduit ; 0 débordement à 390px.
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
    .filter(u => ['schooladmin', 'admin', 'hr', 'accountant', 'teacher', 'supervisor', 'security', 'parent'].includes(u.role))
    .filter((u, i, a) => a.findIndex(x => x.role === u.role) === i)

  return (
    <div className="min-h-screen grid lg:grid-cols-[.95fr_1.05fr]" style={{ background: N.canvas }}>
      <style>{`
        .lg-input{transition:border-color .16s,box-shadow .16s}
        .lg-input:focus{outline:none;border-color:#7539E4;box-shadow:0 0 0 3px rgba(117,57,228,.16)}
        .lg-cta{transition:transform .16s cubic-bezier(.2,.8,.2,1),box-shadow .16s,filter .16s}
        .lg-cta:hover{transform:translateY(-2px);box-shadow:0 16px 30px -12px rgba(117,57,228,.5);filter:brightness(1.04)}
        .lg-cta:active{transform:translateY(0)}
        .lg-pill{transition:border-color .15s,background .15s,transform .15s}
        .lg-pill:hover{transform:translateY(-1px);border-color:#C4B0FB;background:#F6F3FF}
      `}</style>

      {/* ── FORMULAIRE (à gauche) ── */}
      {/* overflow-hidden : le halo décoratif est large et débordait de ~25px sur
          téléphone (390px). Il est décoratif : on le coupe, on ne rétrécit pas. */}
      <div className="relative flex items-center justify-center p-6 sm:p-10 overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#FFFFFF 0%,#F3F0FF 100%)' }}>
        <div className="absolute pointer-events-none" style={{ width: 440, height: 440, borderRadius: '50%', background: BRAND.mark, filter: 'blur(110px)', opacity: .08, top: -80, left: -80 }} />
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease: [.2, .8, .2, 1] }} className="relative w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <Mark size={30} style={{ color: BRAND.mark }} />
            <span className="font-extrabold lowercase tracking-tight">coreon <span className="text-sm font-normal" style={{ color: BRAND.action }}>edu</span></span>
          </div>

          <div className="bg-white rounded-3xl border border-line p-7 sm:p-8" style={{ boxShadow: '0 30px 60px -30px rgba(14,33,53,.22)' }}>
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
              <div className="text-xs font-semibold text-muted mb-2.5">{t('Essai · connexion en un clic :')}</div>
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

      {/* ── PANNEAU MARQUE (à droite) — clair, la maquette produit en direct ── */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#F4F2FF 0%,#EAF6FB 100%)' }}>
        <span className="absolute rounded-full pointer-events-none" style={{ width: 360, height: 360, background: BRAND.action, opacity: .06, filter: 'blur(90px)', top: -80, right: -60 }} />
        <span className="absolute rounded-full pointer-events-none" style={{ width: 300, height: 300, background: BRAND.cyan, opacity: .08, filter: 'blur(90px)', bottom: -70, left: -50 }} />

        <div className="relative inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full w-fit"
          style={{ background: '#FFFFFF', border: `1px solid ${N.line}`, color: BRAND.hover }}>
          <Sparkles size={13} /> {t('De la crèche au primaire')}
        </div>

        <div className="relative">
          <h1 className="font-extrabold tracking-tight text-ink" style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(2rem,3vw,2.9rem)', lineHeight: 1.1, maxWidth: '16ch' }}>
            {t('Toute votre école, sur une seule plateforme.')}
          </h1>
          <p className="mt-5 text-muted leading-relaxed" style={{ maxWidth: '44ch' }}>
            {t('Admissions, évaluation quotidienne, finances et communication : la petite enfance et le primaire réunis dans un seul espace, sur le web comme sur mobile.')}
          </p>
          <div className="mt-8 w-full max-w-md">
            <EvalMock compact />
          </div>
        </div>

        <div className="relative text-muted text-sm">par Kogia Group · © 2026</div>
      </div>
    </div>
  )
}
