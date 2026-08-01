// ════════════════════════════════════════════════════════════════════════════
// LE JOURNAL D'AUDIT — l'écran qui répond au contrôleur.
//
// CR-039 · norme D6. Une seule question à servir, et elle doit se répondre en
// moins d'une minute, devant quelqu'un qui n'utilise pas le produit tous les
// jours : « qui a consulté le dossier de cet enfant, et quand ? »
//
// D'où trois partis pris d'écran :
//  1. L'INTÉGRITÉ EN PREMIER, avant la moindre ligne. Un journal dont on ne sait
//     pas s'il a été touché ne prouve rien : le bandeau du haut dit la chaîne
//     vérifiée (ou la première ligne rompue), combien de lignes, combien la
//     rotation en a fait sortir. On lit l'état de la preuve avant la preuve.
//  2. FILTRER PAR DOSSIER, pas seulement par date. Le contrôleur arrive avec un
//     NOM. La recherche libre porte sur la personne, le dossier et le détail.
//  3. L'EXPORT EST LA RÉPONSE. On ne fait pas lire un écran à un inspecteur : on
//     lui remet un fichier daté. Et cet export s'inscrit lui-même au journal —
//     sortir le journal est un geste sensible comme un autre.
//
// Cet écran n'a PAS de bouton « effacer ». Ce n'est pas un oubli : voir
// l'en-tête de core/src/audit.js, aucun chemin de suppression n'existe.
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { t } from '@core/i18n.js'
import { db } from '@core/db.js'
import { ROLE } from '@core/theme.js'
import {
  CATEGORIES, ACTIONS, DETAILS, auditTrail, auditHealth, auditCsv, record,
} from '@core/audit.js'
import { useAuditRead } from '../useAudit.js'
import {
  PageHead, Card, SectionCard, Btn, Badge, Avatar, EmptyState, SearchInput, Select, Field,
} from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import { format } from 'date-fns'
import { df } from '../datefns.js'
import toast from 'react-hot-toast'

const DAY = 86400000
const PERIODS = [
  { key: '7',   label: 'Les 7 derniers jours',  days: 7 },
  { key: '30',  label: 'Les 30 derniers jours', days: 30 },
  { key: '90',  label: 'Le trimestre',          days: 90 },
  { key: 'all', label: 'Depuis le début',       days: null },
]

// Le ton d'une ligne se lit avant son texte : un refus d'accès ne doit pas
// avoir la même couleur qu'une consultation de routine.
const ACTION_TONE = {
  read: 'info', write: 'warn', export: 'warn',
  login: 'ok', logout: 'neutral', denied: 'danger', system: 'neutral',
}

export default function Audit() {
  const [period, setPeriod] = useState('30')
  const [category, setCategory] = useState('')
  const [action, setAction] = useState('')
  const [q, setQ] = useState('')
  const d = db()

  // Consulter le journal est un événement du journal. Un responsable qui vient
  // y chercher qui a lu un dossier laisse à son tour une ligne : c'est la règle
  // qui empêche le journal d'être un angle mort de lui-même.
  useAuditRead('audit', { id: 'journal', name: 'Journal d’audit' })

  const health = useMemo(() => auditHealth(), [])
  const days = PERIODS.find(p => p.key === period)?.days
  const rows = useMemo(
    () => auditTrail({ from: days ? Date.now() - days * DAY : null, category, action, q }),
    [days, category, action, q],
  )

  const exportCsv = () => {
    record({ action: 'export', category: 'audit', subjectId: 'journal', subjectName: 'Journal d’audit',
      detail: DETAILS.journalExporte, note: String(rows.length) })
    const blob = new Blob(['﻿' + auditCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `journal-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success(t('Journal exporté.'))
  }

  return (
    <>
      <PageHead title={t('Journal d’audit')}
        sub={t('Qui a consulté ou modifié un dossier sensible — et quand.')}
        action={<Btn onClick={exportCsv} disabled={!rows.length}><Ic n="Download" size={15} /> {t('Exporter')}</Btn>} />

      <IntegrityBanner health={health} />

      <Card className="p-4 mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t('Période')}>
            <Select value={period} onChange={e => setPeriod(e.target.value)}>
              {PERIODS.map(p => <option key={p.key} value={p.key}>{t(p.label)}</option>)}
            </Select>
          </Field>
          <Field label={t('Nature de la donnée')}>
            <Select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">{t('Toutes')}</option>
              {Object.values(CATEGORIES).map(c => <option key={c.key} value={c.key}>{t(c.label)}</option>)}
            </Select>
          </Field>
          <Field label={t('Action')}>
            <Select value={action} onChange={e => setAction(e.target.value)}>
              <option value="">{t('Toutes')}</option>
              {Object.values(ACTIONS).map(a => <option key={a.key} value={a.key}>{t(a.label)}</option>)}
            </Select>
          </Field>
          <Field label={t('Personne ou dossier')}>
            <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder={t('Nom de l’enfant, du salarié…')} />
          </Field>
        </div>
      </Card>

      <SectionCard icon="ScrollText" title={t('Les événements')}
        sub={`${rows.length} ${rows.length > 1 ? t('événements') : t('événement')}`} bodyClass="p-0">
        {!rows.length
          ? <EmptyState icon="ScrollText" title={t('Aucun événement sur cette période.')}
              sub={t('Élargissez la période ou retirez un filtre.')} className="py-10" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-slate">
                    <th className="px-4 py-2.5 font-bold">{t('Quand')}</th>
                    <th className="px-4 py-2.5 font-bold">{t('Qui')}</th>
                    <th className="px-4 py-2.5 font-bold">{t('Action')}</th>
                    <th className="px-4 py-2.5 font-bold">{t('Dossier')}</th>
                    <th className="px-4 py-2.5 font-bold">{t('Détail')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 400).map(e => <Row key={`${e.n}`} e={e} users={d.users || []} />)}
                </tbody>
              </table>
              {rows.length > 400 && (
                // Ne jamais couper en silence : l'écran dit ce qu'il ne montre
                // pas, et l'export, lui, emporte TOUT le filtre.
                <p className="px-4 py-3 text-[12px] text-slate border-t border-line">
                  {t('Les 400 événements les plus récents sont affichés.')} {t('L’export contient les')} {rows.length}.
                </p>
              )}
            </div>
          )}
      </SectionCard>
    </>
  )
}

// ── LE BANDEAU D'INTÉGRITÉ ──────────────────────────────────────────────────
function IntegrityBanner({ health }) {
  const broken = !health.ok
  return (
    <Card className={`p-4 mb-4 border-l-4 ${broken ? 'border-l-[#DC2626]' : 'border-l-[#16A34A]'}`}>
      <div className="flex items-start gap-3 flex-wrap">
        <Ic n={broken ? 'ShieldAlert' : 'ShieldCheck'} size={20} className={broken ? 'text-[#DC2626]' : 'text-[#16A34A]'} />
        <div className="flex-1 min-w-[240px]">
          <p className="font-bold text-[14px]">
            {broken ? t('La chaîne du journal est rompue.') : t('Chaîne vérifiée : aucune ligne n’a été modifiée.')}
          </p>
          <p className="text-[12.5px] text-slate mt-0.5">
            {broken
              ? `${t('Première anomalie à la ligne')} ${health.brokenAt}. ${t('Prévenez Kogia : une ligne du journal a été altérée ou retirée.')}`
              : `${health.checked} ${t('lignes contrôlées')}${health.dropped ? ` · ${health.dropped} ${t('sorties par rotation (journal plein)')}` : ''}.`}
          </p>
          {health.nearFull && !broken && (
            <p className="text-[12.5px] mt-1 font-semibold text-[#B45309]">
              {t('Le journal approche de sa capacité : exportez-le pour en garder une copie hors du navigateur.')}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

// ── UNE LIGNE ───────────────────────────────────────────────────────────────
function Row({ e, users }) {
  const cat = CATEGORIES[e.category]
  const act = ACTIONS[e.action]
  const role = ROLE[e.role]
  const stillThere = e.userId ? users.some(u => u.id === e.userId) : true
  return (
    <tr className="border-t border-line align-top">
      <td className="px-4 py-2.5 whitespace-nowrap text-slate">
        {format(new Date(e.at), 'dd/MM/yyyy HH:mm', { locale: df() })}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Avatar name={e.userName || '?'} seed={e.userId || e.userName} size={26} />
          <div>
            <div className="font-semibold">{e.userName || t('Inconnu')}</div>
            <div className="text-[11.5px] text-slate">
              {/* Les libellés de rôle de theme.js sont des CLÉS françaises : le
                  balayage EN/AR a rendu « Enseignant » en plein écran arabe. */}
              {role ? t(role.label) : '—'}
              {/* Un compte désactivé depuis reste au journal : l'histoire ne se
                  réécrit pas quand une personne quitte l'école. */}
              {!stillThere && ` · ${t('compte supprimé depuis')}`}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        {/* Badge passe son libellé par t() lui-même : on lui donne la CLÉ. */}
        <Badge label={act ? act.label : e.action} tone={ACTION_TONE[e.action] || 'neutral'} />
      </td>
      <td className="px-4 py-2.5">
        {/* `t()` sur un nom de personne le rend tel quel ; sur un libellé fixe
            (« Registre de paie ») il le traduit. Une seule règle pour les deux. */}
        <div className="font-semibold">{e.subjectName ? t(e.subjectName) : '—'}</div>
        <div className="text-[11.5px] text-slate">{t(cat ? cat.label : e.category)}</div>
      </td>
      <td className="px-4 py-2.5 text-slate">
        {e.detail ? t(e.detail) : ''}{e.note ? ` · ${e.note}` : ''}
      </td>
    </tr>
  )
}
