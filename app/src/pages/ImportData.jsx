// ════════════════════════════════════════════════════════════════════════════
// IMPORT DE DONNÉES (CR-034) — la porte par laquelle une école apporte SES
// données. Quatre pas, jamais de surprise :
//   1. Fichier   — CSV (export Excel « CSV UTF-8 ») ou collé ; élèves/parents
//                  ou personnel. Les en-têtes OneRoster sont reconnus d'office.
//   2. Colonnes  — la correspondance devinée, corrigeable champ par champ.
//   3. Répétition— CHAQUE ligne annoncée : créer / mettre à jour / ignorer /
//                  erreur, avec ses messages. Rien n'est écrit à ce stade.
//   4. Résultat  — l'écriture réelle + le cran d'annulation + les identifiants
//                  générés (à remettre en main propre) + le journal des imports.
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { current } from '@core/auth.js'
import { parseCSV, TARGETS, autoMap, applyMapping, buildPlan, applyPlan, undoLastImport, importJournal } from '@core/importer.js'
import { db } from '@core/db.js'
import { t } from '@core/i18n.js'
import { PageHead, SectionCard, Btn, Field, Select, Textarea, EmptyState } from '../components/ui.jsx'
import { Undo2, KeyRound, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const ACTION_UI = {
  create: { label: 'Créer', cls: 'text-emerald-700 bg-emerald-50' },
  update: { label: 'Mettre à jour', cls: 'text-sky-700 bg-sky-50' },
  skip: { label: 'Ignorer', cls: 'text-slate-600 bg-slate-100' },
  error: { label: 'Erreur', cls: 'text-red-700 bg-red-50' },
}

export default function ImportData() {
  const u = current()
  const [step, setStep] = useState(1)
  const [target, setTarget] = useState('students')
  const [raw, setRaw] = useState('')
  const [fileName, setFileName] = useState('')
  const [mapping, setMapping] = useState(null)
  const [plan, setPlan] = useState(null)
  const [result, setResult] = useState(null)
  const [, force] = useState(0); const refresh = () => force(x => x + 1)

  const csv = useMemo(() => parseCSV(raw), [raw])
  const journal = importJournal()

  const onFile = e => {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    const rd = new FileReader()
    rd.onload = () => setRaw(String(rd.result || ''))
    rd.readAsText(f)
    e.target.value = ''
  }

  const toMapping = () => {
    if (!csv.headers.length || !csv.rows.length) return toast.error(t('Aucune ligne lisible dans ce fichier.'))
    setMapping(autoMap(csv.headers, target)); setStep(2)
  }
  const toPlan = () => {
    const records = applyMapping(csv.rows, mapping)
    setPlan(buildPlan(db(), target, records)); setStep(3)
  }
  const run = () => {
    const r = applyPlan(target, plan, { byId: u.id, byName: u.name, file: fileName || 'collé' })
    if (!r.ok) return toast.error(t('Le stockage a refusé l’écriture — rien n’a été importé.'))
    setResult(r); setStep(4); refresh()
    toast.success(`${r.created} ${t('créés')} · ${r.updated} ${t('mis à jour')}`)
  }
  const undo = () => {
    const r = undoLastImport()
    if (r.error) return toast.error(r.error)
    toast.success(t('Import annulé — la base est revenue à l’état d’avant.'))
    setTimeout(() => location.reload(), 600)
  }
  const downloadCreds = () => {
    const rows = [['role', 'nom', 'email', 'mot de passe provisoire'], ...result.credentials.map(c => [c.role, c.name, c.email, c.pw])]
    const blob = new Blob(['﻿' + rows.map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'identifiants-import.csv'; a.click()
  }

  const fields = TARGETS[target].fields

  return (
    <div className="space-y-5">
      <PageHead title={t('Import de données')} sub={t('Les données de votre ancienne solution entrent ici : validées, répétées, annulables.')} />

      {/* pas 1 — fichier */}
      {step === 1 && (
        <SectionCard title={`1 · ${t('Le fichier')}`} icon="FileUp" sub={t('CSV (depuis Excel : Enregistrer sous → CSV UTF-8). Les en-têtes OneRoster sont reconnus.')} bodyClass="p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('Que contient le fichier ?')}>
              <Select value={target} onChange={e => setTarget(e.target.value)}>
                {Object.entries(TARGETS).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
              </Select>
            </Field>
            <Field label={t('Fichier CSV')}>
              <input type="file" accept=".csv,text/csv" onChange={onFile}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm" />
            </Field>
          </div>
          <Field label={t('… ou coller le contenu')} hint={csv.rows.length ? `${csv.rows.length} ${t('lignes détectées')} · ${t('séparateur')} « ${csv.delimiter === '\t' ? 'tab' : csv.delimiter} »` : ''}>
            <Textarea rows={7} value={raw} onChange={e => setRaw(e.target.value)}
              placeholder={'nom;classe;date de naissance;parent;email parent\nAmira Ben Salah;5ème année A;2015-04-12;Karim Ben Salah;karim@mail.com'} />
          </Field>
          <div className="flex justify-end"><Btn onClick={toMapping} disabled={!csv.rows.length}>{t('Continuer')} →</Btn></div>
        </SectionCard>
      )}

      {/* pas 2 — colonnes */}
      {step === 2 && mapping && (
        <SectionCard title={`2 · ${t('Les colonnes')}`} sub={t('La correspondance a été devinée — corrigez ce qui doit l’être. « — » = champ non fourni.')}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(f => (
              <Field key={f.key} label={`${t(f.label)}${f.required ? ' *' : ''}`}>
                <Select value={mapping[f.key] ?? ''} onChange={e => setMapping({ ...mapping, [f.key]: e.target.value === '' ? null : Number(e.target.value) })}>
                  <option value="">—</option>
                  {csv.headers.map((h, i) => <option key={i} value={i}>{h || `(${t('colonne')} ${i + 1})`}</option>)}
                </Select>
              </Field>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <Btn variant="ghost" onClick={() => setStep(1)}>← {t('Retour')}</Btn>
            <Btn onClick={toPlan}>{t('Vérifier')} →</Btn>
          </div>
        </SectionCard>
      )}

      {/* pas 3 — répétition générale */}
      {step === 3 && plan && (
        <SectionCard title={`3 · ${t('La répétition générale')}`} sub={t('Rien n’est encore écrit. Voici, ligne par ligne, ce qui se passera.')}>
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(plan.counts).map(([k, v]) => {
              const ui = ACTION_UI[k === 'error' ? 'error' : k]
              return <span key={k} className={`px-2.5 py-1 rounded-full text-xs font-bold ${ui.cls}`}>{v} · {t(ui.label)}</span>
            })}
          </div>
          <div className="max-h-[420px] overflow-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-canvas"><tr>
                <th className="text-start px-3 py-2 w-10">#</th>
                <th className="text-start px-3 py-2">{t('Nom')}</th>
                <th className="text-start px-3 py-2 w-32">{t('Action')}</th>
                <th className="text-start px-3 py-2">{t('Messages')}</th>
              </tr></thead>
              <tbody>
                {plan.rows.map(r => {
                  const ui = ACTION_UI[r.action]
                  return (
                    <tr key={r.n} className="border-t border-line align-top">
                      <td className="px-3 py-1.5 text-muted">{r.n}</td>
                      <td className="px-3 py-1.5 font-semibold">{r.data.name || '·'}</td>
                      <td className="px-3 py-1.5"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ui.cls}`}>{t(ui.label)}</span></td>
                      <td className="px-3 py-1.5 text-xs">
                        {r.errors.map((e, i) => <div key={i} className="text-red-700">✕ {e}</div>)}
                        {r.warnings.map((w, i) => <div key={i} className="text-amber-700">⚠ {w}</div>)}
                      </td>
                    </tr>)
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between pt-3">
            <Btn variant="ghost" onClick={() => setStep(2)}>← {t('Corriger les colonnes')}</Btn>
            <Btn onClick={run} disabled={!plan.counts.create && !plan.counts.update}>
              {t('Importer')} {plan.counts.create + plan.counts.update} {t('fiches')}
            </Btn>
          </div>
        </SectionCard>
      )}

      {/* pas 4 — résultat */}
      {step === 4 && result && (
        <SectionCard title={`4 · ${t('C’est fait')}`} icon="CheckCircle2"
          sub={`${result.created} ${t('créés')} · ${result.updated} ${t('mis à jour')} · ${result.skipped} ${t('ignorés')}`}>
          {result.credentials.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-3">
              <div className="font-bold text-sm flex items-center gap-2"><KeyRound size={15}/> {result.credentials.length} {t('identifiants provisoires générés')}</div>
              <p className="text-xs text-amber-800 mt-1">{t('Téléchargez-les MAINTENANT et remettez-les en main propre — ils ne seront plus jamais affichés.')}</p>
              <Btn size="sm" className="mt-2" onClick={downloadCreds}><Download size={14}/> {t('Télécharger (CSV)')}</Btn>
            </div>)}
          <div className="flex flex-wrap gap-2">
            {result.undoAvailable && <Btn variant="ghost" onClick={undo}><Undo2 size={15}/> {t('Annuler cet import')}</Btn>}
            <Btn variant="ghost" onClick={() => { setStep(1); setRaw(''); setPlan(null); setResult(null) }}>{t('Nouvel import')}</Btn>
          </div>
        </SectionCard>
      )}

      {/* journal des imports — le monitoring de l'intégration */}
      <SectionCard title={t('Journal des imports')} sub={t('Chaque import est tracé : qui, quand, quoi, combien.')}>
        {!journal.length ? <EmptyState icon="FileUp" title={t('Aucun import pour l’instant')} sub={t('Le premier apparaîtra ici.')} /> : (
          <table className="w-full text-sm">
            <thead><tr>
              <th className="text-start px-2 py-1.5">{t('Quand')}</th><th className="text-start px-2 py-1.5">{t('Par')}</th>
              <th className="text-start px-2 py-1.5">{t('Fichier')}</th><th className="text-start px-2 py-1.5">{t('Contenu')}</th>
              <th className="text-start px-2 py-1.5">{t('Résultat')}</th>
            </tr></thead>
            <tbody>{journal.slice(0, 20).map(j => (
              <tr key={j.id} className="border-t border-line">
                <td className="px-2 py-1.5">{new Date(j.at).toLocaleString('fr-FR')}</td>
                <td className="px-2 py-1.5">{j.byName}</td>
                <td className="px-2 py-1.5">{j.file}</td>
                <td className="px-2 py-1.5">{t(TARGETS[j.target]?.label || j.target)}</td>
                <td className="px-2 py-1.5 text-xs">{j.created} {t('créés')} · {j.updated} {t('màj')} · {j.skipped} {t('ignorés')} · {j.errors} {t('erreurs')}</td>
              </tr>))}
            </tbody>
          </table>)}
      </SectionCard>
    </div>
  )
}
