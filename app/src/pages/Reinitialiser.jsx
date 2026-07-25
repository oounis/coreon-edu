// ════════════════════════════════════════════════════════════════════════════
// POSER LE NOUVEAU MOT DE PASSE (CR-013)
//
// On arrive ici par le lien reçu par email : #/reinitialiser?token=…
// Le jeton n'est jamais fabriqué ni validé dans le navigateur — le serveur
// seul décide. Réinitialiser ferme aussi toutes les sessions ouvertes du
// compte : si quelqu'un était déjà entré, il se retrouve dehors.
//
// Cet écran n'a de sens qu'en MODE SERVEUR. En démonstration, il n'existe pas
// de jeton : on le dit franchement plutôt que d'afficher un formulaire qui ne
// pourrait rien faire.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BRAND, N } from '@core/tokens.js'
import { Mark } from '../components/ui.jsx'
import { t } from '@core/i18n.js'
import { isRemote, remoteReset } from '../remote.js'
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'

const MIN = 8
// HashRouter : la requête vit APRÈS le hash (#/reinitialiser?token=…),
// donc location.search est vide — on lit le hash nous-mêmes.
const tokenFromUrl = () => {
  const h = window.location.hash || ''
  const q = h.indexOf('?')
  return q < 0 ? '' : new URLSearchParams(h.slice(q + 1)).get('token') || ''
}

export default function Reinitialiser() {
  const nav = useNavigate()
  const [token] = useState(tokenFromUrl)
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (pw.length < MIN) return setErr(t('Le mot de passe doit faire au moins 8 caractères.'))
    if (pw !== pw2) return setErr(t('Les deux mots de passe ne sont pas identiques.'))
    setErr(''); setBusy(true)
    const r = await remoteReset(token, pw)
    setBusy(false)
    if (r.status === 200) { setDone(true); setTimeout(() => nav('/login'), 2600) }
    else setErr(r.error || t('Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.'))
  }

  const unusable = !isRemote() || !token

  return (
    <div className="min-h-screen grid place-items-center p-6" style={{ background: N.canvas }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }} className="w-full max-w-md">
        <Link to="/login" className="flex items-center gap-2 mb-7">
          <Mark size={30} style={{ color: BRAND.mark }} />
          <span className="font-extrabold lowercase tracking-tight">coreon <span className="text-sm font-normal" style={{ color: BRAND.action }}>edu</span></span>
        </Link>

        <div className="bg-white rounded-3xl border border-line p-7 sm:p-8" style={{ boxShadow: '0 30px 60px -28px rgba(14,33,53,.28)' }}>
          {done ? (
            <>
              <div className="w-12 h-12 rounded-2xl grid place-items-center mb-4" style={{ background: '#E9F8EF' }}>
                <CheckCircle2 size={24} style={{ color: '#12946F' }} />
              </div>
              <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>{t('Mot de passe modifié')}</h1>
              <p className="text-muted text-sm leading-relaxed">{t('Toutes les sessions ouvertes de ce compte ont été fermées. Redirection vers la connexion…')}</p>
            </>
          ) : unusable ? (
            <>
              <div className="w-12 h-12 rounded-2xl grid place-items-center mb-4" style={{ background: '#FEF3E2' }}>
                <AlertTriangle size={24} style={{ color: '#B45309' }} />
              </div>
              <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>{t('Lien inutilisable')}</h1>
              <p className="text-muted text-sm leading-relaxed">
                {!token
                  ? t('Ce lien est incomplet. Ouvrez-le directement depuis l\'email reçu.')
                  : t('Sans serveur connecté, aucun lien de réinitialisation n\'est valable ici. Écrivez à support@kogiagroup.com.')}
              </p>
              <Link to="/mot-de-passe-oublie" className="mt-7 w-full flex items-center justify-center rounded-xl text-white font-bold text-sm py-3.5"
                style={{ background: `linear-gradient(135deg,${BRAND.action},${BRAND.mark})` }}>
                {t('Demander un nouveau lien')}
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>{t('Nouveau mot de passe')}</h1>
              <p className="text-muted text-sm mb-6">{t('Au moins 8 caractères. Choisissez-en un que vous n\'utilisez nulle part ailleurs.')}</p>

              {[[pw, setPw, t('Nouveau mot de passe')], [pw2, setPw2, t('Confirmer le mot de passe')]].map(([val, set, ph], i) => (
                <div className="relative mb-3" key={i}>
                  <Lock size={17} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input className="w-full rounded-xl border border-line bg-white ps-11 pe-11 py-3 text-sm"
                    type={show ? 'text' : 'password'} autoComplete="new-password" value={val} placeholder={ph}
                    onChange={e => { set(e.target.value); setErr('') }}
                    onKeyDown={e => e.key === 'Enter' && !busy && submit()} />
                  {i === 0 && (
                    <button type="button" onClick={() => setShow(s => !s)}
                      aria-label={show ? t('Masquer le mot de passe') : t('Afficher le mot de passe')}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1">
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  )}
                </div>
              ))}
              {err && <div className="text-sm text-coral mt-1" role="alert">{err}</div>}

              <button onClick={submit} disabled={busy}
                className="w-full flex items-center justify-center rounded-xl text-white font-bold text-sm py-3.5 mt-3 disabled:opacity-60"
                style={{ background: `linear-gradient(135deg,${BRAND.action},${BRAND.mark})` }}>
                {busy ? t('Enregistrement…') : t('Enregistrer le mot de passe')}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
