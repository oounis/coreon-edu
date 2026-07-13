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
// question qu'on peut poser plus tard. Les PIÈCES ne sont pas demandées ici —
// elles se règlent avec l'école, après. Une page qui exige un scan d'acte de
// naissance à 22h ne reçoit aucune candidature.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apply } from '@core/admissions.js'
import { settings } from '@core/db.js'
import { LEVELS, schoolLevels } from '@core/levels.js'
import { Card, Btn, Input, Field, Mark } from '../components/ui.jsx'
import { Ic } from '../icons.jsx'

const empty = { childName: '', dob: '', level: '', parentName: '', parentPhone: '', parentEmail: '', note: '' }

export default function Inscription() {
  const s = settings()
  const levels = schoolLevels(s)                 // l'école ne propose que SES niveaux
  const [f, setF] = useState(empty)
  const [err, setErr] = useState({})
  const [done, setDone] = useState(null)
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: null })) }

  const submit = () => {
    const e = {}
    if (!f.childName.trim()) e.childName = 'Le nom de l’enfant est requis.'
    if (!f.dob) e.dob = 'La date de naissance est requise.'
    if (!f.level) e.level = 'Choisissez un niveau.'
    if (!f.parentName.trim()) e.parentName = 'Votre nom est requis.'
    if (!/^[\d\s+]{8,}$/.test(f.parentPhone)) e.parentPhone = 'Un numéro joignable, s’il vous plaît.'
    if (Object.keys(e).length) return setErr(e)
    setDone(apply(f))
  }

  // ── Reçu. Le parent repart avec une référence : il peut rappeler et être suivi.
  if (done) {
    return (
      <Screen>
        <Card className="p-8 text-center">
          <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4 accent-soft accent-text">
            <Ic n="Check" size={28} />
          </span>
          <h1 className="text-2xl font-extrabold">Candidature reçue.</h1>
          <p className="text-muted mt-2 max-w-md mx-auto">
            L’école va l’examiner et vous recontactera au <b>{done.parentPhone}</b>.
            Les pièces à fournir vous seront demandées à ce moment-là — rien à envoyer maintenant.
          </p>
          <div className="mt-5 inline-block rounded-xl border border-line px-5 py-3">
            <div className="text-xs font-bold text-muted uppercase tracking-wider">Votre référence</div>
            <div className="text-xl font-extrabold tabular-nums">{done.id.toUpperCase()}</div>
          </div>
          <p className="text-xs text-muted mt-4">Notez-la : elle nous permet de retrouver le dossier de {done.childName}.</p>
          <div className="mt-6">
            <Link to="/"><Btn variant="ghost">Retour à l’accueil</Btn></Link>
          </div>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen>
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold">Pré-inscription</h1>
        <p className="text-muted mt-2 max-w-lg mx-auto">
          Quelques informations, une minute. Aucun document à joindre maintenant —
          l’école vous dira quoi apporter.
        </p>
      </div>

      <Card className="p-6 grid gap-4">
        <Field label="Nom et prénom de l’enfant *" error={err.childName}>
          <Input value={f.childName} onChange={e => set('childName', e.target.value)} placeholder="Adam Ben Salah" />
        </Field>

        <Field label="Date de naissance *" error={err.dob}>
          <Input type="date" value={f.dob} onChange={e => set('dob', e.target.value)} />
        </Field>

        <div>
          <div className="text-sm font-semibold mb-1.5">Niveau demandé *</div>
          <div className="flex flex-wrap gap-2">
            {LEVELS.filter(l => levels.includes(l.key)).map(l => (
              <button key={l.key} type="button" onClick={() => set('level', l.key)}
                className={`px-3 py-2 rounded-xl text-[13px] font-bold border transition
                  ${f.level === l.key ? 'text-white border-transparent accent-bg' : 'bg-white border-line text-ink hover:border-ink/25'}`}>
                {l.label}
              </button>
            ))}
          </div>
          {err.level && <div className="text-xs font-semibold mt-1.5 text-coral">{err.level}</div>}
        </div>

        <div className="border-t border-line pt-4 mt-1">
          <div className="text-sm font-bold mb-3">Le parent ou tuteur</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Votre nom *" error={err.parentName}>
              <Input value={f.parentName} onChange={e => set('parentName', e.target.value)} placeholder="Karim Ben Salah" />
            </Field>
            <Field label="Téléphone *" error={err.parentPhone}>
              <Input value={f.parentPhone} onChange={e => set('parentPhone', e.target.value)} placeholder="+216 20 000 000" />
            </Field>
          </div>
          <Field label="E-mail (facultatif)">
            <Input type="email" value={f.parentEmail} onChange={e => set('parentEmail', e.target.value)} placeholder="karim@mail.tn" />
          </Field>
        </div>

        <Field label="Un mot pour l’école (facultatif)">
          <textarea rows={3} value={f.note} onChange={e => set('note', e.target.value)}
            placeholder="Il vient d’une autre école, il est allergique aux arachides…"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm accent-ring" />
        </Field>

        <Btn size="lg" className="w-full justify-center" onClick={submit}>
          Envoyer ma candidature <Ic n="ArrowRight" size={16} />
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
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-2.5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl grid place-items-center accent-bg text-white">
              <Mark size={22} />
            </span>
            <span className="font-extrabold lowercase tracking-tight">
              coreon <span className="accent-text">edu</span>
            </span>
          </Link>
          <span className="text-sm text-muted ml-auto">{settings()?.schoolName}</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">{children}</main>
      <footer className="text-center text-xs text-muted pb-8">par Kogia Group</footer>
    </div>
  )
}
