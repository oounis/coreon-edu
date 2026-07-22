// ════════════════════════════════════════════════════════════════════════════
// LA PRÉ-INSCRIPTION EN LIGNE — la porte d'entrée. PUBLIQUE, sans compte.
//
// C'est le parent qui dépose la candidature. Pas la secrétaire. C'est tout
// l'intérêt : l'école ne ressaisit RIEN, et la donnée entre dans le système à la
// source, tapée par celui qui la connaît.
//
// (Recherche 3-0 : la continuité candidature → dossier élève, sans ressaisie, est
// le point de douleur que PowerSchool et Infinite Campus vendent tous les deux en
// module premium. Cette page est la moitié qui manquait.)
//
// Un parent tunisien remplit ça sur un téléphone, souvent debout, parfois avec un
// enfant dans les bras. Donc : une seule colonne, des gros champs, aucune
// question qu'on peut poser plus tard.
//
// LES PIÈCES sont téléversables ici, mais AUCUNE n'est bloquante : une page qui
// exige un scan d'acte de naissance à 22h ne reçoit aucune candidature. Le parent
// joint ce qu'il a ; l'école réclame le reste. Ce qui est REÇU est un vrai fichier,
// pas une case cochée — c'est le défaut qu'Othman a trouvé le 2026-07-14.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apply, docsFor } from '@core/admissions.js'
import Attach from '../components/Attach.jsx'
import { settings } from '@core/db.js'
import { LEVELS, schoolLevels } from '@core/levels.js'
import { Card, Btn, Input, Field, Mark } from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import { isRemote, remoteApply } from '../remote.js'
import { mailReady } from '../mail.js'
import { t } from '@core/i18n.js'
import LangSwitch from '../components/Lang.jsx'

const empty = { childName: '', dob: '', level: '', parentName: '', parentPhone: '', parentEmail: '', note: '' }

export default function Inscription() {
  const s = settings()
  const levels = schoolLevels(s)                 // l'école ne propose que SES niveaux
  const [f, setF] = useState(empty)
  const [files, setFiles] = useState([])
  const [err, setErr] = useState({})
  const [fatal, setFatal] = useState(null)   // l'enregistrement a échoué : on le DIT
  const [done, setDone] = useState(null)     // { app, filesDropped }
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: null })) }

  const submit = async () => {
    const e = {}
    if (!f.childName.trim()) e.childName = t('Le nom de l’enfant est requis.')
    if (!f.dob) e.dob = t('La date de naissance est requise.')
    if (!f.level) e.level = t('Choisissez un niveau.')
    if (!f.parentName.trim()) e.parentName = t('Votre nom est requis.')
    if (!/^[\d\s+]{8,}$/.test(f.parentPhone)) e.parentPhone = t('Un numéro joignable, s’il vous plaît.')
    if (Object.keys(e).length) return setErr(e)
    // apply() VÉRIFIE que le dossier est réellement écrit — le reçu ne ment pas.
    // En mode serveur, la candidature part au serveur de l'école : mêmes règles.
    const r = isRemote() ? await remoteApply({ ...f, files }) : apply({ ...f, files })
    if (r.error) return setFatal(r.error)
    setDone(r)
  }

  // ── Reçu. Le parent repart avec une référence : il peut rappeler et être suivi.
  // Le reçu dit la VÉRITÉ : si les pièces n'ont pas pu être conservées
  // (stockage plein), on l'écrit — on ne fait pas semblant de les détenir.
  if (done) {
    const a = done.app
    return (
      <Screen>
        <Card className="p-8 text-center">
          <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4 accent-soft accent-text">
            <Ic n="Check" size={28} />
          </span>
          <h1 className="text-2xl font-extrabold">{t('Candidature reçue.')}</h1>
          <p className="text-muted mt-2 max-w-md mx-auto">
            L’école va l’examiner et vous recontactera au <b>{a.parentPhone}</b>.
            {done.filesDropped
              ? <> <b>Vos pièces n’ont pas pu être conservées</b> (mémoire de l’appareil pleine) — l’école vous les redemandera, la candidature est bien enregistrée.</>
              : a.files?.length
                ? <> Nous avons bien reçu <b>{a.files.length} pièce(s)</b>.</>
                : <> Les pièces manquantes vous seront demandées.</>}
          </p>
          {a.parentEmail && mailReady() && (
            <p className="text-muted mt-2 max-w-md mx-auto">
              Un accusé de réception vient d’être envoyé à <b>{a.parentEmail}</b> — vous serez informé(e) par email à chaque étape (pièces, décision, inscription).
            </p>
          )}
          {a.parentEmail && !mailReady() && (
            <p className="text-muted mt-2 max-w-md mx-auto">
              Vous serez informé(e) à <b>{a.parentEmail}</b> à chaque étape (pièces, décision, inscription).
            </p>
          )}
          <div className="mt-5 inline-block rounded-xl border border-line px-5 py-3">
            <div className="text-xs font-bold text-muted uppercase tracking-wider">{t('Votre référence')}</div>
            <div className="text-xl font-extrabold tabular-nums">{a.id.toUpperCase()}</div>
          </div>
          <p className="text-xs text-muted mt-4">Notez-la : elle nous permet de retrouver le dossier de {a.childName}.</p>
          <div className="mt-6">
            <Link to="/"><Btn variant="ghost">{t('Retour à l’accueil')}</Btn></Link>
          </div>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen>
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold">{t('Pré-inscription')}</h1>
        <p className="text-muted mt-2 max-w-lg mx-auto">
          {t('Quelques informations, une minute. Joignez les pièces si vous les avez — sinon l’école vous les demandera.')}
        </p>
      </div>

      <Card className="p-6 grid gap-4">
        <Field label={t('Nom et prénom de l’enfant *')} error={err.childName}>
          <Input value={f.childName} onChange={e => set('childName', e.target.value)} placeholder="Adam Ben Salah" />
        </Field>

        <Field label={t('Date de naissance *')} error={err.dob}>
          <Input type="date" value={f.dob} onChange={e => set('dob', e.target.value)} />
        </Field>

        <div>
          <div className="text-sm font-semibold mb-1.5">{t('Niveau demandé *')}</div>
          <div className="flex flex-wrap gap-2">
            {LEVELS.filter(l => levels.includes(l.key)).map(l => (
              <button key={l.key} type="button" onClick={() => set('level', l.key)}
                className={`px-3 py-2 rounded-xl text-[13px] font-bold border transition
                  ${f.level === l.key ? 'text-white border-transparent accent-bg' : 'bg-white border-line text-ink hover:border-ink/25'}`}>
                {t(l.label)}
              </button>
            ))}
          </div>
          {err.level && <div className="text-xs font-semibold mt-1.5 text-coral">{err.level}</div>}
        </div>

        <div className="border-t border-line pt-4 mt-1">
          <div className="text-sm font-bold mb-3">{t('Le parent ou tuteur')}</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t('Votre nom *')} error={err.parentName}>
              <Input value={f.parentName} onChange={e => set('parentName', e.target.value)} placeholder="Karim Ben Salah" />
            </Field>
            <Field label={t('Téléphone *')} error={err.parentPhone}>
              <Input value={f.parentPhone} onChange={e => set('parentPhone', e.target.value)} placeholder="+216 20 000 000" />
            </Field>
          </div>
          <Field label={t('E-mail (facultatif)')}>
            <Input type="email" value={f.parentEmail} onChange={e => set('parentEmail', e.target.value)} placeholder="karim@mail.tn" />
          </Field>
        </div>

        {/* LES PIÈCES. L'ancienne version n'en demandait AUCUNE, alors que l'écran
            Inscriptions parlait de « pièces à fournir » : le produit promettait un
            document qu'il n'avait jamais reçu. Corrigé (défaut trouvé par Othman).
            Rien n'est OBLIGATOIRE ici : une page qui exige un scan à 22h ne reçoit
            aucune candidature. Le parent joint ce qu'il a ; l'école réclamera le reste. */}
        {f.level && (
          <div className="border-t border-line pt-4">
            <div className="text-sm font-bold mb-1">{t('Pièces (facultatif maintenant)')}</div>
            <p className="text-xs text-muted mb-3">
              {t('Joignez ce que vous avez sous la main — une photo prise au téléphone suffit. Ce qui manque, l’école vous le demandera.')} <b>{t('Rien n’est bloquant à cette étape.')}</b>
            </p>
            <Attach
              types={docsFor(f.level)}
              value={files}
              onChange={setFiles} />
          </div>
        )}

        <Field label={t('Un mot pour l’école (facultatif)')}>
          <textarea rows={3} value={f.note} onChange={e => set('note', e.target.value)}
            placeholder="Il vient d’une autre école, il est allergique aux arachides…"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm accent-ring" />
        </Field>

        {fatal && (
          <div className="rounded-xl border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: '#C2410C55', background: '#C2410C10', color: '#C2410C' }}>
            {fatal}
          </div>
        )}
        <Btn size="lg" className="w-full justify-center" onClick={submit}>
          {t('Envoyer ma candidature')} <Ic n="ArrowRight" size={16} className="rtl:-scale-x-100" />
        </Btn>
        <p className="text-xs text-muted text-center">
          Vos informations ne servent qu’à cette candidature. {s?.schoolName || 'L’école'} est la seule à les voir.
        </p>
      </Card>
    </Screen>
  )
}

/** La coquille publique : la marque en haut, rien d'autre. */
function Screen({ children }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 py-4 flex items-center gap-2.5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl grid place-items-center accent-bg text-white">
              <Mark size={22} />
            </span>
            <span className="font-extrabold lowercase tracking-tight">
              coreon <span className="accent-text">edu</span>
            </span>
          </Link>
          <span className="ms-auto flex items-center gap-3"><span className="text-sm text-muted">{settings()?.schoolName}</span><LangSwitch/></span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 sm:px-8 py-10">{children}</main>
      <footer className="text-center text-xs text-muted pb-8">{t('par Kogia Group')}</footer>
    </div>
  )
}
