// RH & PAIE — le module ennuyeux qu'il faut faire parfaitement.
// On ne gagne pas un client avec la paie ; on le PERD sans elle.
import { useMemo, useState } from 'react'
import { t, dateLocale } from '@core/i18n.js'
import { current } from '@core/auth.js'
import { db } from '@core/db.js'
import { currency, money } from '@core/currency.js'
import {
  CONTRACTS, LEAVE_KINDS, LEAVE_STAGES, PAYROLL_STAGES, EARNINGS,
  contractOf, setContract, contractEarnings, contractGross, leaves, decideLeave, leaveBalance,
  payrollOf, preparePayroll, setBonus, validatePayroll, markPaid,
  thisMonth, monthLabel,
} from '@core/hr.js'
import {
  PageHead, Card, Btn, Badge, Modal, Field, Input, Select, Tabs, EmptyState, Avatar, STATUS,
} from '../components/ui.jsx'
import Payslip from '../components/Payslip.jsx'
import { Ic } from '../icons.jsx'
import toast from 'react-hot-toast'

// audit FAT 2026-07-26 : money() du cœur — les millièmes du BHD comptent
const day = d => new Date(d).toLocaleDateString(dateLocale(), { day: '2-digit', month: 'short' })

/** Le personnel de l'école : enseignants + administration. Une seule liste. */
function useStaff() {
  const d = db()
  return useMemo(() => {
    const t = (d.teachers || []).map(x => ({ id: x.id, name: x.name, role: x.designation || 'Enseignant', salary: x.salary }))
    const LABELS = { admin: 'Administration', supervisor: 'Surveillant', security: 'Sécurité', schooladmin: 'Direction', hr: 'Ressources humaines', accountant: 'Comptabilité' }
    const u = (d.users || [])
      .filter(x => ['admin', 'supervisor', 'security', 'schooladmin', 'hr', 'accountant'].includes(x.role))
      .map(x => ({ id: x.id, name: x.name, role: x.position || LABELS[x.role] }))
    return [...t, ...u]
  }, [d])
}

export default function HR() {
  const me = current()
  const staff = useStaff()
  const [tab, setTab] = useState('equipe')
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)

  return (
    <>
      <PageHead title="Ressources humaines" sub="Contrats, congés, paie · sans surprise." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'equipe', label: 'Équipe' },
        { value: 'conges', label: 'Congés' },
        { value: 'paie',   label: 'Paie' },
      ]} />
      <div className="mt-5">
        {tab === 'equipe' && <Team staff={staff} refresh={refresh} />}
        {tab === 'conges' && <Leaves staff={staff} me={me} refresh={refresh} />}
        {tab === 'paie'   && <Payroll staff={staff} me={me} refresh={refresh} />}
      </div>
    </>
  )
}

// ── ÉQUIPE & CONTRATS ───────────────────────────────────────────────────────
function Team({ staff, refresh }) {
  const [edit, setEdit] = useState(null)
  const [f, setF] = useState({ kind: 'cdi', base: '', housing: '', transport: '', start: '' })
  const fGross = (Number(f.base) || 0) + (Number(f.housing) || 0) + (Number(f.transport) || 0)

  const open = s => {
    const c = contractOf(s.id)
    const e = contractEarnings(c)
    setF({
      kind: c?.kind || 'cdi',
      base: (c ? e.base : s.salary) || '', housing: e.housing || '', transport: e.transport || '',
      start: c?.start || '',
    })
    setEdit(s)
  }
  const saveIt = () => {
    if (!Number(f.base)) return toast.error('Le salaire de base est requis : sans contrat, pas de paie.')
    setContract({ staffId: edit.id, kind: f.kind, base: f.base, housing: f.housing, transport: f.transport, start: f.start || undefined })
    toast.success(`Contrat enregistré pour ${edit.name}.`)
    setEdit(null); refresh()
  }

  return (
    <>
      <div className="grid gap-2">
        {staff.map(s => {
          const c = contractOf(s.id)
          const bal = leaveBalance(s.id, 'annuel')
          return (
            <Card key={s.id} className="p-4 flex items-center gap-3 flex-wrap">
              <Avatar name={s.name} seed={s.id} />
              <div className="min-w-0">
                <div className="font-bold truncate">{s.name}</div>
                <div className="text-xs text-muted font-semibold">{s.role}</div>
              </div>
              <span className="flex-1" />
              {c
                ? <>
                    <Badge label={CONTRACTS[c.kind]?.label} tone="info" />
                    <span className="text-sm font-extrabold tabular-nums">{money(contractGross(c))}</span>
                    {bal && <span className="text-xs text-muted font-semibold tabular-nums">{bal.left}/{bal.quota} j de congé</span>}
                  </>
                : <span className="text-xs font-bold" style={{ color: STATUS.warn }}>
                    <Ic n="TriangleAlert" size={13} className="inline mr-1 align-[-2px]" />Aucun contrat
                  </span>}
              <Btn size="sm" variant="soft" onClick={() => open(s)}>{c ? 'Modifier' : 'Créer le contrat'}</Btn>
            </Card>
          )
        })}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `Contrat · ${edit.name}` : ''}
        footer={<><Btn variant="ghost" onClick={() => setEdit(null)}>Annuler</Btn><Btn onClick={saveIt}>Enregistrer</Btn></>}>
        <div className="grid gap-4">
          <Field label="Type de contrat">
            <Select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}>
              {Object.values(CONTRACTS).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </Select>
          </Field>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={`${EARNINGS.base.label} (${currency()}) *`} hint="Référence de la gratuité.">
              <Input type="number" value={f.base} onChange={e => setF({ ...f, base: e.target.value })} />
            </Field>
            <Field label={`${EARNINGS.housing.label}`}>
              <Input type="number" value={f.housing} onChange={e => setF({ ...f, housing: e.target.value })} />
            </Field>
            <Field label={`${EARNINGS.transport.label}`}>
              <Input type="number" value={f.transport} onChange={e => setF({ ...f, transport: e.target.value })} />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: STATUS.infoSoft, color: STATUS.info }}>
            <span>Salaire mensuel brut</span>
            <span className="tabular-nums font-extrabold">{money(fGross)}</span>
          </div>
          <Field label="Date d’entrée">
            <Input type="date" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  )
}

// ── CONGÉS ──────────────────────────────────────────────────────────────────
function Leaves({ staff, me, refresh }) {
  const all = leaves()
  const nameOf = id => staff.find(s => s.id === id)?.name || id

  const decide = (l, stage) => {
    const r = decideLeave(l.id, stage, me.id, me.name)
    if (r.error) return toast.error(r.error)
    toast.success(stage === 'accorde' ? 'Congé accordé.' : 'Demande refusée.')
    refresh()
  }

  if (!all.length) return <EmptyState icon="CalendarOff" title="Aucune demande de congé."
    sub="Les demandes déposées par l’équipe apparaissent ici." />

  return (
    <div className="grid gap-2">
      {all.map(l => {
        const k = LEAVE_KINDS[l.kind]
        const st = LEAVE_STAGES[l.stage]
        const mine = l.staffId === me.id
        return (
          <Card key={l.id} className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Avatar name={nameOf(l.staffId)} seed={l.staffId} />
              <div className="min-w-0">
                <div className="font-bold text-sm">{nameOf(l.staffId)}</div>
                <div className="text-xs text-muted font-semibold">
                  {k?.label} · {day(l.from)} → {day(l.to)} · <b>{l.days} j</b>
                  {!k?.paid && <span style={{ color: STATUS.warn }}> sans solde</span>}
                </div>
              </div>
              <span className="flex-1" />
              <Badge label={st?.label} tone={st?.tone} />
              {l.stage === 'demande' && (
                mine
                  // RÈGLE : personne ne valide sa propre demande. Le cœur le refuse
                  // aussi — une règle qui ne vit que dans l'écran n'est pas une règle.
                  ? <span className="text-xs text-muted font-semibold flex items-center gap-1">
                      <Ic n="Lock" size={12} /> Votre demande : un autre responsable doit décider
                    </span>
                  : <>
                      <Btn size="sm" variant="ghost" onClick={() => decide(l, 'refuse')}>Refuser</Btn>
                      <Btn size="sm" onClick={() => decide(l, 'accorde')}>Accorder</Btn>
                    </>
              )}
            </div>
            {l.reason && <p className="text-[13px] text-muted mt-2">{l.reason}</p>}
            {l.decidedBy && (
              <p className="text-[11px] text-muted mt-2">
                {st?.label} par {l.decidedBy} le {day(l.decidedAt)}
              </p>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ── PAIE ────────────────────────────────────────────────────────────────────
function Payroll({ staff, me, refresh }) {
  const [month, setMonth] = useState(thisMonth())
  const [slip, setSlip] = useState(null)
  const p = payrollOf(month)
  const st = p && PAYROLL_STAGES[p.stage]
  const locked = p && p.stage !== 'brouillon'
  const iPrepared = p && p.preparedById && p.preparedById === me.id

  const prepare = () => {
    const r = preparePayroll(month, staff, { id: me.id, name: me.name })
    if (r.error) return toast.error(r.error)
    toast.success(`Paie de ${monthLabel(month)} préparée.`)
    refresh()
  }
  const validate = () => {
    const r = validatePayroll(month, me.id, me.name)
    if (r.error) return toast.error(r.error)
    toast.success('Paie validée. Elle est désormais verrouillée.')
    refresh()
  }
  // QA FAT 2026-07-26 : l'acte le plus grave du module était le seul sans
  // confirmation — et 7 lignes « sans contrat » à 0 partaient sans un mot.
  const pay = () => {
    const zeros = (p?.lines || []).filter(l => !l.net).length
    const msg = `${t('Marquer cette paie comme payée ? Elle sera définitivement verrouillée.')}` +
      (zeros ? `\n\n⚠ ${zeros} ${t('ligne(s) à 0 (sans contrat) — vérifiez avant de payer.')}` : '')
    if (!window.confirm(msg)) return
    const r = markPaid(month)
    if (r.error) return toast.error(r.error)
    toast.success(t('Paie marquée comme payée.'))
    refresh()
  }

  return (
    <>
      <Card className="p-4 flex items-center gap-3 flex-wrap mb-4">
        <Field label="Mois"><Input type="month" value={month} onChange={e => setMonth(e.target.value)} /></Field>
        <span className="flex-1" />
        {p && <Badge label={st.label} tone={st.tone} />}
        {p && <span className="text-lg font-extrabold tabular-nums">{money(p.total)}</span>}
        {!p && <Btn onClick={prepare}><Ic n="Calculator" size={15} /> Préparer la paie</Btn>}
        {p?.stage === 'brouillon' && <>
          <Btn variant="soft" onClick={prepare}>Recalculer</Btn>
          {iPrepared
            // MAKER-CHECKER : le préparateur ne valide pas sa propre paie.
            ? <span className="text-xs text-muted font-semibold flex items-center gap-1">
                <Ic n="Lock" size={12} /> Vous avez préparé : une autre personne valide
              </span>
            : <Btn onClick={validate}><Ic n="Lock" size={15} /> Valider</Btn>}
        </>}
        {p?.stage === 'valide' && <Btn onClick={pay}><Ic n="Check" size={15} /> Marquer payée</Btn>}
      </Card>

      {!p && <EmptyState icon="Calculator" title={`Aucune paie pour ${monthLabel(month)}.`}
        sub="La paie se calcule à partir des contrats et des absences sans solde : pas d’une saisie libre." />}

      {p && (
        <Card className="p-0 overflow-hidden">
          {p.preparedBy && !locked && (
            <div className="px-5 py-3 flex items-center gap-2 text-[13px] font-semibold"
              style={{ background: STATUS.warnSoft, color: STATUS.warn }}>
              <Ic n="PencilLine" size={14} />
              Brouillon préparé par {p.preparedBy} · la validation revient à une autre personne (séparation des tâches).
            </div>
          )}
          {locked && (
            <div className="px-5 py-3 flex items-center gap-2 text-[13px] font-semibold"
              style={{ background: STATUS.infoSoft, color: STATUS.info }}>
              <Ic n="Lock" size={14} />
              Paie {p.preparedBy && `préparée par ${p.preparedBy}, `}validée par {p.validatedBy} · elle ne peut plus être modifiée.
              Une correction se fait par un ajustement daté, jamais en réécrivant l’histoire.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-muted border-b border-line">
                  <th className="px-5 py-3">Employé</th>
                  <th className="px-3 py-3">Contrat</th>
                  <th className="px-3 py-3 text-right">Brut</th>
                  <th className="px-3 py-3 text-right">Sans solde</th>
                  <th className="px-3 py-3 text-right">Retenue</th>
                  <th className="px-3 py-3 text-right">Prime</th>
                  <th className="px-3 py-3 text-right">Net</th>
                  <th className="px-5 py-3 text-right">Bulletin</th>
                </tr>
              </thead>
              <tbody>
                {p.lines.map(l => (
                  <tr key={l.staffId} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3">
                      <div className="font-semibold">{l.name}</div>
                      <div className="text-xs text-muted">{l.role}</div>
                    </td>
                    <td className="px-3 py-3">
                      {l.contract
                        ? <Badge label={CONTRACTS[l.contract]?.label} tone="neutral" />
                        : <span className="text-xs font-bold" style={{ color: STATUS.warn }}>Aucun</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{money(l.gross)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{l.unpaidDays || '·'}</td>
                    <td className="px-3 py-3 text-right tabular-nums"
                      style={{ color: l.deduction ? STATUS.danger : undefined }}>
                      {l.deduction ? `− ${money(l.deduction)}` : '·'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {locked
                        ? <span className="tabular-nums">{l.bonus ? money(l.bonus) : '·'}</span>
                        : <input type="number" defaultValue={l.bonus || ''} placeholder="0"
                            onBlur={e => { setBonus(month, l.staffId, e.target.value); refresh() }}
                            className="w-24 text-right rounded-lg border border-line px-2 py-1 text-sm accent-ring tabular-nums" />}
                    </td>
                    <td className="px-3 py-3 text-right font-extrabold tabular-nums">{money(l.net)}</td>
                    <td className="px-5 py-3 text-right">
                      <Btn size="sm" variant="ghost" onClick={() => setSlip(l)} title="Ouvrir le bulletin de paie">
                        <Ic n="FileText" size={14} /> Bulletin
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-canvas font-extrabold">
                  <td className="px-5 py-3" colSpan={6}>Total</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(p.total)}</td>
                  <td className="px-5 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {slip && <Payslip line={slip} month={month} stage={p?.stage} validatedBy={p?.validatedBy} onClose={() => setSlip(null)} />}
    </>
  )
}
