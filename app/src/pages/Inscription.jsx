// ════════════════════════════════════════════════════════════════════════════
// LA PRÉ-INSCRIPTION EN LIGNE — la porte d'entrée. PUBLIQUE, sans compte.
//
// C'est le parent qui dépose la candidature. Pas la secrétaire. C'est tout
// l'intérêt : l'école ne ressaisit RIEN, et la donnée entre dans le système à la
// source, tapée par celui qui la connaît.
//
// REFONTE 2026-07-22 (CR-008 · CR-009 · CR-010) — le formulaire posait les mêmes
// questions à tout le monde et n'en posait pas assez : l'école ne pouvait pas
// décider sans rappeler la famille. Désormais :
//   · PLUSIEURS ÉTAPES, guidées par le NIVEAU choisi. Un parent de crèche parle
//     sieste et propreté ; un parent de 6ème année parle école précédente et
//     fratrie. Personne ne subit les questions de l'autre.
//   · LA FAMILLE au complet (mère, père, adresse, professions) et la SANTÉ
//     (allergies, médecin, personne à prévenir) — ce qu'il faut pour décider.
//   · DES ENGAGEMENTS explicites, datés et conservés avec la candidature.
//
// Les règles de tout cela vivent dans core/src/enrolment.js : testables sans
// navigateur, partagées avec le mobile. Cet écran ne fait que les afficher.
//
// Un parent remplit ça sur un téléphone, souvent debout, parfois avec un enfant
// dans les bras. Donc : une étape à la fois, de gros champs, et l'on peut
// revenir en arrière sans rien perdre.
//
// LES PIÈCES restent téléversables, et AUCUNE n'est bloquante : une page qui
// exige un scan d'acte de naissance à 22h ne reçoit aucune candidature. Ce qui
// est REÇU est un vrai fichier, pas une case cochée (défaut trouvé par Othman
// le 2026-07-14).
// ════════════════════════════════════════════════════════════════════════════
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { apply, docsFor } from '@core/admissions.js'
import Attach from '../components/Attach.jsx'
import { settings } from '@core/db.js'
import { LEVELS, schoolLevels } from '@core/levels.js'
import { categoryOf, stepsFor, validateStep, TERMS, toApplication } from '@core/enrolment.js'
import { Card, Btn, Input, Field, Mark } from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import { isRemote, remoteApply } from '../remote.js'
import { mailReady } from '../mail.js'
import { t } from '@core/i18n.js'
import LangSwitch from '../components/Lang.jsx'

const empty = {
  childFirstName: '', childLastName: '', dob: '', gender: '', level: '',
  birthPlace: '', nationality: '',
  motherFirstName: '', motherLastName: '', motherPhone: '', motherEmail: '', motherJob: '',
  fatherFirstName: '', fatherLastName: '', fatherPhone: '', fatherEmail: '', fatherJob: '',
  address: { street: '', street2: '', city: '', region: '', postal: '', country: '' },
  hasCondition: '', conditionDetail: '', doctorName: '', doctorPhone: '',
  emergencyName: '', emergencyPhone: '', teachersNote: '',
  rythme: '', periscolaire: '', napHabits: '', mealHabits: '', diaper: '', startDate: '',
  prevSchool: '', prevYears: '', prevLevel: '', siblings: '',
  parentName: '', parentPhone: '', parentEmail: '', note: '', terms: {},
}

export default function Inscription() {
  const s = settings()
  const levels = schoolLevels(s)
  const [f, setF] = useState(empty)
  const [files, setFiles] = useState([])
  const [step, setStep] = useState(0)
  const [err, setErr] = useState({})
  const [fatal, setFatal] = useState(null)
  const [done, setDone] = useState(null)
  const [sending, setSending] = useState(false)

  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: null, _step: null })) }
  const setAddr = (k, v) => setF(p => ({ ...p, address: { ...p.address, [k]: v } }))

  // Le niveau décide des étapes. Tant qu'il n'est pas choisi, on montre le
  // parcours le plus neutre — la première étape est de toute façon la même.
  const category = useMemo(() => (f.level ? categoryOf(f.level) : 'primaire'), [f.level])
  const steps = useMemo(() => stepsFor(category), [category])
  const cur = steps[Math.min(step, steps.length - 1)]
  const last = step >= steps.length - 1

  const next = () => {
    const e = validateStep(cur, f)
    if (Object.keys(e).length) { setErr(e); return }
    setErr({}); setStep(s => Math.min(s + 1, steps.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const back = () => { setErr({}); setStep(s => Math.max(0, s - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const submit = async () => {
    const e = validateStep(cur, f)
    if (Object.keys(e).length) { setErr(e); return }
    setSending(true)
    const payload = { ...toApplication(f), files }
    const r = isRemote() ? await remoteApply(payload) : apply(payload)
    setSending(false)
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
              ? <> <b>Vos pièces n’ont pas pu être conservées</b> (mémoire de l’appareil pleine) : l’école vous les redemandera, la candidature est bien enregistrée.</>
              : a.files?.length
                ? <> Nous avons bien reçu <b>{a.files.length} pièce(s)</b>.</>
                : <> Les pièces manquantes vous seront demandées.</>}
          </p>
          {a.parentEmail && (
            <p className="text-muted mt-2 max-w-md mx-auto">
              {mailReady()
                ? <>Un accusé de réception vient d’être envoyé à <b>{a.parentEmail}</b>. Vous serez informé(e) par email à chaque étape.</>
                : <>Vous serez informé(e) à <b>{a.parentEmail}</b> à chaque étape.</>}
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
          {t('Quelques informations, une minute. Joignez les pièces si vous les avez, sinon l’école vous les demandera.')}
        </p>
      </div>

      <Stepper steps={steps} current={step} onGo={i => { if (i < step) { setErr({}); setStep(i) } }} />

      <Card className="p-6 sm:p-8">
        <div className="mb-5">
          <h2 className="text-xl font-extrabold">{t(cur.title)}</h2>
          {cur.hint && <p className="text-sm text-muted mt-1">{t(cur.hint)}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {cur.fields.map(field => {
            if (field.showIf && !field.showIf(f)) return null
            const wide = ['textarea', 'address', 'files', 'terms', 'chips'].includes(field.type)
            return (
              <div key={field.name} className={wide ? 'sm:col-span-2' : ''}>
                <FieldRender field={field} f={f} set={set} setAddr={setAddr} err={err}
                  levels={levels} files={files} setFiles={setFiles} />
              </div>
            )
          })}
        </div>

        {err._step && (
          <div className="mt-4 rounded-xl border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: '#C2410C55', background: '#C2410C10', color: '#C2410C' }} role="alert">
            {err._step}
          </div>
        )}
        {fatal && (
          <div className="mt-4 rounded-xl border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: '#C2410C55', background: '#C2410C10', color: '#C2410C' }} role="alert">
            {fatal}
          </div>
        )}

        <div className="flex items-center gap-3 mt-7">
          {step > 0 && (
            <Btn variant="ghost" onClick={back}>
              <Ic n="ArrowLeft" size={16} className="rtl:-scale-x-100" /> {t('Retour')}
            </Btn>
          )}
          <span className="ms-auto text-xs text-muted">{t('Étape')} {step + 1} / {steps.length}</span>
          {last
            ? <Btn size="lg" onClick={submit} disabled={sending}>
                {sending ? t('Envoi…') : t('Envoyer ma candidature')} <Ic n="ArrowRight" size={16} className="rtl:-scale-x-100" />
              </Btn>
            : <Btn size="lg" onClick={next}>
                {t('Continuer')} <Ic n="ArrowRight" size={16} className="rtl:-scale-x-100" />
              </Btn>}
        </div>
      </Card>

      <p className="text-xs text-muted text-center mt-4">
        Vos informations ne servent qu’à cette candidature. {s?.schoolName || 'L’école'} est la seule à les voir.
      </p>
    </Screen>
  )
}

/** La barre d'étapes : on voit où l'on en est, et l'on peut revenir en arrière. */
function Stepper({ steps, current, onGo }) {
  return (
    <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'todo'
        return (
          <button key={s.key} type="button" onClick={() => onGo(i)} disabled={i > current}
            aria-current={state === 'now' ? 'step' : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition
              ${state === 'now' ? 'text-white accent-bg'
                : state === 'done' ? 'bg-white border border-line text-ink hover:border-ink/25'
                : 'bg-white border border-line text-muted opacity-60 cursor-default'}`}>
            {state === 'done' && <Ic n="Check" size={12} />}
            {t(s.title)}
          </button>
        )
      })}
    </div>
  )
}

/** Un champ, selon son type. Le module core décrit, l'écran rend. */
function FieldRender({ field, f, set, setAddr, err, levels, files, setFiles }) {
  const label = t(field.label) + (field.req ? ' *' : '')
  const e = err[field.name]

  if (field.type === 'chips') {
    const opts = field.name === 'level'
      ? LEVELS.filter(l => levels.includes(l.key)).map(l => ({ key: l.key, label: l.label }))
      : (field.options || [])
    return (
      <div>
        <div className="text-sm font-semibold mb-1.5">{label}</div>
        <div className="flex flex-wrap gap-2">
          {opts.map(o => (
            <button key={o.key} type="button" onClick={() => set(field.name, o.key)}
              className={`px-3 py-2 rounded-xl text-[13px] font-bold border transition
                ${f[field.name] === o.key ? 'text-white border-transparent accent-bg' : 'bg-white border-line text-ink hover:border-ink/25'}`}>
              {t(o.label)}
            </button>
          ))}
        </div>
        {field.name === 'level' && (
          <p className="text-xs text-muted mt-2">{t('Le niveau choisi détermine les questions suivantes.')}</p>
        )}
        {e && <div className="text-xs font-semibold mt-1.5 text-coral" role="alert">{e}</div>}
      </div>
    )
  }

  if (field.type === 'radio') {
    return (
      <div>
        <div className="text-sm font-semibold mb-1.5">{label}</div>
        <div className="flex flex-wrap gap-2">
          {(field.options || []).map(o => (
            <button key={o} type="button" onClick={() => set(field.name, o)}
              className={`px-3 py-2 rounded-xl text-[13px] font-bold border transition
                ${f[field.name] === o ? 'text-white border-transparent accent-bg' : 'bg-white border-line text-ink hover:border-ink/25'}`}>
              {t(o)}
            </button>
          ))}
        </div>
        {e && <div className="text-xs font-semibold mt-1.5 text-coral" role="alert">{e}</div>}
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <Field label={label} error={e}>
        <textarea rows={3} value={f[field.name] || ''} onChange={ev => set(field.name, ev.target.value)}
          placeholder={field.placeholder ? t(field.placeholder) : ''}
          className="w-full rounded-xl border border-line px-3 py-2 text-sm accent-ring" />
      </Field>
    )
  }

  if (field.type === 'address') {
    const a = f.address || {}
    const cell = (k, lbl, ph) => (
      <Field label={t(lbl)}>
        <Input value={a[k] || ''} onChange={ev => setAddr(k, ev.target.value)} placeholder={ph} />
      </Field>
    )
    return (
      <div>
        <div className="text-sm font-bold mb-3">{label}</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">{cell('street', 'Rue', '12 rue de la Liberté')}</div>
          <div className="sm:col-span-2">{cell('street2', 'Complément d’adresse', 'Appartement, étage')}</div>
          {cell('city', 'Ville', 'Tunis')}
          {cell('region', 'Région ou gouvernorat', 'Tunis')}
          {cell('postal', 'Code postal', '1002')}
          {cell('country', 'Pays', 'Tunisie')}
        </div>
      </div>
    )
  }

  if (field.type === 'files') {
    return (
      <div>
        <div className="text-sm font-bold mb-1">{t('Pièces (facultatif maintenant)')}</div>
        <p className="text-xs text-muted mb-3">
          {t('Joignez ce que vous avez sous la main : une photo prise au téléphone suffit. Ce qui manque, l’école vous le demandera.')} <b>{t('Rien n’est bloquant à cette étape.')}</b>
        </p>
        <Attach types={docsFor(f.level)} value={files} onChange={setFiles} />
      </div>
    )
  }

  if (field.type === 'terms') {
    const checked = f.terms || {}
    const toggle = k => set('terms', { ...checked, [k]: !checked[k] })
    const all = TERMS.every(x => checked[x.key])
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold">{t('Ce à quoi vous vous engagez')}</div>
          <button type="button" onClick={() => set('terms', all ? {} : Object.fromEntries(TERMS.map(x => [x.key, true])))}
            className="text-xs font-semibold accent-text hover:underline">
            {all ? t('Tout décocher') : t('Tout accepter')}
          </button>
        </div>
        <div className="rounded-xl border border-line divide-y divide-line">
          {TERMS.map(x => (
            <label key={x.key} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-canvas">
              <input type="checkbox" checked={!!checked[x.key]} onChange={() => toggle(x.key)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-ring" />
              <span className="text-[13px] leading-relaxed">{t(x.text)}</span>
            </label>
          ))}
        </div>
        {e && <div className="text-xs font-semibold mt-1.5 text-coral" role="alert">{e}</div>}
        <p className="text-xs text-muted mt-2">
          {t('Votre acceptation est enregistrée avec la date, et jointe à la candidature.')}
        </p>
      </div>
    )
  }

  // text · date · tel · email
  return (
    <Field label={label} error={e}>
      <Input type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
        value={f[field.name] || ''} onChange={ev => set(field.name, ev.target.value)}
        placeholder={field.placeholder ? t(field.placeholder) : ''} />
    </Field>
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
