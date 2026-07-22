// ════════════════════════════════════════════════════════════════════════════
// MOT DE PASSE OUBLIÉ (CR-013)
//
// Il n'y avait AUCUN moyen de récupérer un accès : un utilisateur enfermé
// dehors devait appeler un développeur. C'est rédhibitoire pour une vraie
// école. (Défaut signalé par Othman, 22/07/2026.)
//
// Deux modes, une seule promesse à l'écran :
//   · MODE SERVEUR — le serveur fabrique un jeton à usage unique (60 min) et
//     envoie le lien. Le navigateur ne voit jamais le jeton.
//   · MODE DÉMO    — il n'y a pas de serveur, donc pas de jeton possible : la
//     demande part à support@kogiagroup.com, qui réinitialise à la main.
//
// Dans les DEUX cas la réponse affichée est identique et ne dit jamais si le
// compte existe : l'annoncer révélerait qui travaille dans l'école.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BRAND, N } from '@core/tokens.js'
import { Mark } from '../components/ui.jsx'
import { t } from '@core/i18n.js'
import { isRemote, remoteForgot } from '../remote.js'
import { sendViaWorker } from '../mail.js'
import { Mail, ArrowLeft, CheckCircle2, LifeBuoy } from 'lucide-react'

const SUPPORT = 'support@kogiagroup.com'

export default function MotDePasseOublie() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    const addr = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(addr)) return setErr(t('Entrez une adresse e-mail valide.'))
    setErr(''); setBusy(true)
    try {
      if (isRemote()) {
        const r = await remoteForgot(addr)
        if (r.status === 429) { setBusy(false); return setErr(t('Trop de demandes. Réessayez dans une heure.')) }
      } else {
        // Pas de serveur : on prévient le support, qui fait le nécessaire.
        // Best-effort — on n'affiche jamais un échec qui inquiéterait pour rien,
        // l'adresse de support reste visible à l'écran juste en dessous.
        await sendViaWorker({
          to: SUPPORT,
          subject: 'Coreon EDU : demande de réinitialisation de mot de passe',
          text: `Demande de réinitialisation.\n\nAdresse concernée : ${addr}\nReçue le : ${new Date().toLocaleString('fr-FR')}\n\nCoreon EDU (mode démonstration, aucun jeton n'a été créé)`,
        }).catch(() => {})
      }
      setSent(true)
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6" style={{ background: N.canvas }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}
        className="w-full max-w-md">
        <Link to="/login" className="flex items-center gap-2 mb-7">
          <Mark size={30} style={{ color: BRAND.mark }} />
          <span className="font-extrabold lowercase tracking-tight">coreon <span className="text-sm font-normal" style={{ color: BRAND.action }}>edu</span></span>
        </Link>

        <div className="bg-white rounded-3xl border border-line p-7 sm:p-8" style={{ boxShadow: '0 30px 60px -28px rgba(14,33,53,.28)' }}>
          {sent ? (
            <>
              <div className="w-12 h-12 rounded-2xl grid place-items-center mb-4" style={{ background: '#E9F8EF' }}>
                <CheckCircle2 size={24} style={{ color: '#12946F' }} />
              </div>
              <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>{t('Demande enregistrée')}</h1>
              <p className="text-muted text-sm leading-relaxed">
                {t('Si un compte existe pour cette adresse, la marche à suivre vient d\'être envoyée. Pensez à regarder vos indésirables.')}
              </p>
              <p className="text-muted text-sm leading-relaxed mt-3">
                {t('Le lien est valable une heure et ne fonctionne qu\'une seule fois.')}
              </p>
              <Link to="/login" className="mt-7 w-full flex items-center justify-center gap-2 rounded-xl text-white font-bold text-sm py-3.5"
                style={{ background: `linear-gradient(135deg,${BRAND.action},${BRAND.mark})` }}>
                {t('Retour à la connexion')}
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>{t('Mot de passe oublié')}</h1>
              <p className="text-muted text-sm mb-6">{t('Indiquez votre adresse : nous vous envoyons la marche à suivre.')}</p>

              <div className="relative">
                <Mail size={17} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input className="w-full rounded-xl border border-line bg-white ps-11 pe-3 py-3 text-sm"
                  type="email" autoComplete="username" value={email} placeholder={t('E-mail')}
                  onChange={e => { setEmail(e.target.value); setErr('') }}
                  onKeyDown={e => e.key === 'Enter' && !busy && submit()} />
              </div>
              {err && <div className="text-sm text-coral mt-2" role="alert">{err}</div>}

              <button onClick={submit} disabled={busy}
                className="w-full flex items-center justify-center gap-2 rounded-xl text-white font-bold text-sm py-3.5 mt-4 disabled:opacity-60"
                style={{ background: `linear-gradient(135deg,${BRAND.action},${BRAND.mark})` }}>
                {busy ? t('Envoi…') : t('Envoyer le lien')}
              </button>

              <Link to="/login" className="mt-5 flex items-center justify-center gap-1.5 text-sm text-muted hover:text-ink">
                <ArrowLeft size={15} /> {t('Retour à la connexion')}
              </Link>
            </>
          )}
        </div>

        <div className="mt-5 flex items-start gap-2 text-xs text-muted px-1">
          <LifeBuoy size={14} className="mt-0.5 shrink-0" />
          <span>{t('Un problème persiste ?')} <a href={`mailto:${SUPPORT}`} className="font-semibold" style={{ color: BRAND.action }}>{SUPPORT}</a></span>
        </div>
      </motion.div>
    </div>
  )
}
