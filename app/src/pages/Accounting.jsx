// COMPTABILITÉ — barème, remises & bourses, factures, reçus, état financier.
// Une facture émise ne se modifie pas : on l'annule par un avoir, daté et motivé.
import { useState } from 'react'
import { current } from '@core/auth.js'
import { db } from '@core/db.js'
import { LEVELS, schoolLevels, labelOf } from '@core/levels.js'
import { settings } from '@core/db.js'
import {
  FEE_KINDS, DISCOUNT_KINDS, INVOICE_STAGES, METHODS,
  feesOf, setFees, discountsOf, grantDiscount, revokeDiscount,
  dueFor, invoices, issueInvoice, cancelInvoice, collect, receipts,
  financials, money, currency
} from '@core/accounting.js'
import {
  PageHead, Card, Btn, Badge, Modal, Field, Input, Select, Tabs, EmptyState, Avatar, STATUS,
} from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import toast from 'react-hot-toast'

const day = t => new Date(t).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })

export default function Accounting() {
  const [tab, setTab] = useState('etat')
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)
  return (
    <>
      <PageHead title="Comptabilité" sub="Barème, remises, factures, reçus : et ce que l’école a réellement encaissé." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'etat',     label: 'État financier' },
        { value: 'factures', label: 'Factures' },
        { value: 'eleves',   label: 'Élèves & remises' },
        { value: 'bareme',   label: 'Barème' },
      ]} />
      <div className="mt-5">
        {tab === 'etat'     && <Etat />}
        {tab === 'factures' && <Factures refresh={refresh} />}
        {tab === 'eleves'   && <Eleves refresh={refresh} />}
        {tab === 'bareme'   && <Bareme refresh={refresh} />}
      </div>
    </>
  )
}

// ── ÉTAT FINANCIER ──────────────────────────────────────────────────────────
function Etat() {
  const f = financials()
  const cells = [
    { k: 'Encaissé', v: f.collected, i: 'Wallet', tone: STATUS.ok },
    { k: 'Reste dû', v: f.outstanding, i: 'Clock', tone: STATUS.warn },
    { k: 'Pas encore facturé', v: f.notInvoiced, i: 'FileWarning', tone: STATUS.danger },
    { k: 'Masse salariale payée', v: f.payrollCost, i: 'Users', tone: STATUS.info },
  ]
  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cells.map(c => (
          <Card key={c.k} className="p-5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
              <Ic n={c.i} size={13} style={{ color: c.tone }} />{c.k}
            </div>
            <div className="text-2xl font-extrabold mt-1 tabular-nums">{money(c.v)}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5 mt-4">
        <div className="text-sm font-bold mb-3">Le taux de recouvrement</div>
        <div className="h-3 rounded-full bg-canvas overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${f.rate}%`, background: STATUS.ok }} />
        </div>
        <div className="flex justify-between text-xs font-semibold text-muted mt-2 tabular-nums">
          <span>{money(f.collected)} encaissés</span>
          <span>{f.rate}% de {money(f.invoiced)} facturés</span>
        </div>
      </Card>

      {f.notInvoiced > 0 && (
        <Card className="p-5 mt-4" style={{ background: STATUS.dangerSoft, borderColor: STATUS.danger }}>
          <div className="flex items-start gap-3">
            <Ic n="FileWarning" size={20} style={{ color: STATUS.danger }} />
            <div>
              <div className="font-bold">{money(f.notInvoiced)} ne sont pas encore facturés.</div>
              <p className="text-[13px] mt-1">
                Des élèves inscrits n’ont aucune facture. Ce n’est pas un détail comptable :
                c’est de l’argent que l’école ne réclamera jamais si personne ne le voit.
                Onglet <b>Factures</b> → « Facturer tous les élèves ».
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5 mt-4">
        <div className="text-sm font-bold mb-1">Solde de trésorerie (démonstration)</div>
        <div className="text-3xl font-extrabold tabular-nums"
          style={{ color: f.balance >= 0 ? STATUS.ok : STATUS.danger }}>{money(f.balance)}</div>
        <p className="text-xs text-muted mt-1">Encaissements − masse salariale payée. Les autres charges viendront.</p>
      </Card>
    </>
  )
}

// ── FACTURES ────────────────────────────────────────────────────────────────
function Factures({ refresh }) {
  const me = current()
  const d = db()
  const all = invoices()
  const [cancel, setCancel] = useState(null)
  const [reason, setReason] = useState('')
  const [pay, setPay] = useState(null)
  const [amt, setAmt] = useState('')
  const [method, setMethod] = useState('especes')
  const nameOf = id => (d.students || []).find(s => s.id === id)?.name || id

  const issueAll = () => {
    let ok = 0, skipped = 0
    for (const s of d.students || []) {
      if (invoices().some(i => i.studentId === s.id && i.stage !== 'annulee')) { skipped++; continue }
      const r = issueInvoice(s.id, me.name)
      r.error ? skipped++ : ok++
    }
    toast.success(`${ok} facture(s) émise(s).${skipped ? ` ${skipped} ignorée(s).` : ''}`)
    refresh()
  }

  const doCancel = () => {
    const r = cancelInvoice(cancel.id, reason, me.name)
    if (r.error) return toast.error(r.error)
    toast.success('Facture annulée par avoir.')
    setCancel(null); setReason(''); refresh()
  }
  const doCollect = () => {
    const r = collect(pay.id, amt, method, me.name)
    if (r.error) return toast.error(r.error)
    toast.success(`Reçu ${r.receipt.number} : ${money(r.receipt.amount)}`)
    setPay(null); setAmt(''); refresh()
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <Btn onClick={issueAll}><Ic n="FilePlus2" size={15} /> Facturer tous les élèves</Btn>
      </div>

      {!all.length && <EmptyState icon="FileText" title="Aucune facture."
        sub="Le montant se calcule à partir du barème et des remises : il ne se saisit pas." />}

      <div className="grid gap-2">
        {all.map(i => {
          const st = INVOICE_STAGES[i.stage]
          const rest = i.total - i.paid
          return (
            <Card key={i.id} className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Avatar name={nameOf(i.studentId)} seed={i.studentId} />
                <div className="min-w-0">
                  <div className="font-bold text-sm">{nameOf(i.studentId)}</div>
                  <div className="text-xs text-muted font-semibold tabular-nums">
                    {i.number} · émise le {day(i.issuedAt)}
                    {i.creditNote && <span style={{ color: STATUS.danger }}> avoir {i.creditNote}</span>}
                  </div>
                </div>
                <span className="flex-1" />
                <span className="text-sm font-extrabold tabular-nums">{money(i.total)}</span>
                {i.stage !== 'annulee' && rest > 0 &&
                  <span className="text-xs font-bold tabular-nums" style={{ color: STATUS.warn }}>reste {money(rest)}</span>}
                <Badge label={st.label} tone={st.tone} />
                {i.stage !== 'annulee' && i.stage !== 'payee' &&
                  <Btn size="sm" onClick={() => { setPay(i); setAmt(String(rest)) }}>Encaisser</Btn>}
                {i.stage !== 'annulee' &&
                  <Btn size="sm" variant="ghost" onClick={() => setCancel(i)}>Annuler</Btn>}
              </div>
              {i.stage === 'annulee' && (
                <p className="text-[12px] mt-2" style={{ color: STATUS.danger }}>
                  Annulée par {i.cancelledBy} le {day(i.cancelledAt)} · {i.cancelReason}
                </p>
              )}
            </Card>
          )
        })}
      </div>

      {/* Encaisser → un reçu numéroté. Pas d'encaissement sans reçu. */}
      <Modal open={!!pay} onClose={() => setPay(null)} title={pay ? `Encaisser · ${pay.number}` : ''}
        footer={<><Btn variant="ghost" onClick={() => setPay(null)}>Annuler</Btn><Btn onClick={doCollect}>Encaisser & éditer le reçu</Btn></>}>
        {pay && (
          <div className="grid gap-4">
            <Field label={`Montant (${currency()})`} hint={`Reste dû : ${money(pay.total - pay.paid)}`}>
              <Input type="number" value={amt} onChange={e => setAmt(e.target.value)} />
            </Field>
            <Field label="Moyen de paiement">
              <Select value={method} onChange={e => setMethod(e.target.value)}>
                {Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <p className="text-xs text-muted">Un reçu numéroté sera édité : c’est la seule preuve pour la famille.</p>
          </div>
        )}
      </Modal>

      {/* Annuler → un avoir, avec motif OBLIGATOIRE. On ne réécrit pas l'histoire. */}
      <Modal open={!!cancel} onClose={() => setCancel(null)} title="Annuler la facture"
        footer={<><Btn variant="ghost" onClick={() => setCancel(null)}>Retour</Btn><Btn variant="danger" onClick={doCancel}>Annuler par avoir</Btn></>}>
        <p className="text-sm text-muted mb-3">
          Une facture émise ne se modifie pas : elle s’annule par un <b>avoir</b>, daté et motivé.
          C’est ce qui rend la comptabilité défendable devant un audit.
        </p>
        <Field label="Motif de l’annulation *">
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Erreur de niveau, départ de l’élève…" />
        </Field>
      </Modal>
    </>
  )
}

// ── ÉLÈVES & REMISES ────────────────────────────────────────────────────────
function Eleves({ refresh }) {
  const me = current()
  const d = db()
  const [open, setOpen] = useState(null)
  const [kind, setKind] = useState('fratrie')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  const grant = () => {
    if (kind === 'bourse' && !(Number(amount) > 0)) return toast.error('Le montant de la bourse est requis.')
    if (!reason.trim()) return toast.error('Un motif est obligatoire : une remise sans motif est un trou.')
    grantDiscount({ studentId: open.id, kind, amount, reason, by: me.name })
    toast.success('Remise accordée.')
    setOpen(null); setReason(''); setAmount(''); refresh()
  }

  return (
    <>
      <div className="grid gap-2">
        {(d.students || []).map(s => {
          const due = dueFor(s.id, d)
          const gs = discountsOf(s.id, d)
          return (
            <Card key={s.id} className="p-4 flex items-center gap-3 flex-wrap">
              <Avatar name={s.name} seed={s.id} />
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{s.name}</div>
                <div className="text-xs text-muted font-semibold">
                  {labelOf((d.classes || []).find(c => c.id === s.classId)?.level)}
                </div>
              </div>
              <span className="flex-1" />
              {gs.map(g => (
                <button key={g.id} onClick={() => { revokeDiscount(g.id); refresh() }}
                  title={`${g.reason} : accordée par ${g.by}. Cliquer pour retirer.`}
                  className="text-[11px] font-bold px-2 py-1 rounded-full"
                  style={{ background: STATUS.okSoft, color: STATUS.ok }}>
                  {DISCOUNT_KINDS[g.kind]?.label} {g.pct ? `−${g.pct}%` : `−${money(g.amount)}`}
                </button>
              ))}
              {due?.error
                ? <span className="text-xs font-bold" style={{ color: STATUS.warn }}>{due.error}</span>
                : <span className="text-sm font-extrabold tabular-nums">{money(due.total)}</span>}
              <Btn size="sm" variant="soft" onClick={() => setOpen(s)}>Remise</Btn>
            </Card>
          )
        })}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Remise · ${open.name}` : ''}
        footer={<><Btn variant="ghost" onClick={() => setOpen(null)}>Annuler</Btn><Btn onClick={grant}>Accorder</Btn></>}>
        <div className="grid gap-4">
          <Field label="Type">
            <Select value={kind} onChange={e => setKind(e.target.value)}>
              {Object.values(DISCOUNT_KINDS).map(k => (
                <option key={k.key} value={k.key}>{k.label}{k.pct ? ` (−${k.pct}%)` : ' (montant libre)'}</option>
              ))}
            </Select>
          </Field>
          {kind === 'bourse' && (
            <Field label={`Montant de la bourse (${currency()}) *`}>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            </Field>
          )}
          <Field label="Motif *" hint="Qui, quand, pourquoi : sinon ce n’est pas une remise, c’est un trou.">
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Deuxième enfant inscrit." />
          </Field>
        </div>
      </Modal>
    </>
  )
}

// ── BARÈME ──────────────────────────────────────────────────────────────────
function Bareme({ refresh }) {
  const levels = schoolLevels(settings())
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        Ce que coûte une année, par niveau. <b>Sans barème, on ne facture pas</b>et le produit le dit
        au lieu de facturer zéro en silence.
      </p>
      {LEVELS.filter(l => levels.includes(l.key)).map(l => {
        const f = feesOf(l.key) || {}
        return (
          <Card key={l.key} className="p-4">
            <div className="font-bold mb-3">{l.label}</div>
            <div className="grid sm:grid-cols-4 gap-3">
              {Object.values(FEE_KINDS).map(k => (
                <Field key={k.key} label={k.label}>
                  <Input type="number" defaultValue={f[k.key] || ''} placeholder="0"
                    onBlur={e => { setFees(l.key, { ...f, [k.key]: Number(e.target.value) || 0 }); refresh() }} />
                </Field>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
