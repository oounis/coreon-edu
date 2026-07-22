// ════════════════════════════════════════════════════════════════════════════
// BUDGET & RAPPORTS — l'argent du mois en trente secondes, chaque chiffre
// s'ouvre (règle produit), et le carnet de dépenses pour ce que le produit
// ne mesure pas encore. Le cœur (budget.js) calcule ; cet écran raconte.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { current } from '@core/auth.js'
import { studentById } from '@core/db.js'
import { monthlyReport, yearSeries, addExpense, voidExpense, EXPENSE_CATS, expenseCatOf } from '@core/budget.js'
import { money, currency } from '@core/accounting.js'
import { todayIso } from '@core/clock.js'
import { PageHead, Card, StatCard, SectionCard, Btn, Modal, Field, Input, Select, EmptyState, STATUS } from '../components/ui.jsx'
import { Wallet, BriefcaseBusiness, ReceiptText, Scale, Plus, TrendingUp, Download, X } from 'lucide-react'
import { SoftArea } from '../components/charts.jsx'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

const Row = ({ left, sub, right, tone }) => (
  <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold truncate">{left}</span>
      {sub && <span className="block text-[12px] text-muted truncate">{sub}</span>}</span>
    <span className="text-sm font-extrabold shrink-0" style={tone ? { color: tone } : {}}>{right}</span>
  </div>)

export default function Budget() {
  const u = current()
  const [, force] = useState(0); const refresh = () => force(x => x + 1)
  const [month, setMonth] = useState(todayIso().slice(0, 7))
  const [tile, setTile] = useState(null)      // income | wages | spent | balance
  const [open, setOpen] = useState(false)     // ajouter une dépense
  const [f, setF] = useState({ date: todayIso(), category: 'fournitures', label: '', amount: '' })
  const R = monthlyReport(month)
  const year = month.slice(0, 4)
  const series = yearSeries(year).map(x => ({ name: format(new Date(x.month + '-15'), 'MMM', { locale: fr }), solde: x.balance }))
  const monthLabel = format(new Date(month + '-15'), 'MMMM yyyy', { locale: fr })

  const submit = () => {
    const r = addExpense({ ...f, by: u.name })
    if (r.error) return toast.error(r.error)
    toast.success(`Dépense inscrite : ${r.expense.label} · ${money(r.expense.amount)}`)
    setF({ date: todayIso(), category: 'fournitures', label: '', amount: '' }); setOpen(false); refresh()
  }
  const cancel = (id) => {
    const reason = prompt('Motif de l\'annulation (obligatoire) :')
    if (reason == null) return
    const r = voidExpense(id, reason, u.name)
    r.error ? toast.error(r.error) : toast.success('Dépense annulée · la trace reste')
    refresh()
  }
  const exportCSV = () => {
    const lines = [['Type', 'Date', 'Libellé', `Montant ${currency()}`]]
    R.receipts.forEach(r => lines.push(['Scolarité', format(new Date(r.at), 'yyyy-MM-dd'), `Reçu ${r.number} · ${studentById(r.studentId)?.name || ''}`, r.amount]))
    R.rentals.forEach(b => lines.push(['Location', b.date, `${b.who}`, b.price]))
    R.payrolls.forEach(p => lines.push(['Paie', p.month, `Paie ${p.month} (${p.lines?.length || 0} employés)`, -p.total]))
    R.expenses.forEach(e => lines.push(['Dépense', e.date, `${expenseCatOf(e.category).label} · ${e.label}`, -e.amount]))
    lines.push(['Solde', month, '', R.balance])
    const csv = lines.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `rapport-financier-${month}.csv`; a.click(); URL.revokeObjectURL(a.href)
    toast.success(`Rapport ${monthLabel} exporté`)
  }

  return (<>
    <PageHead title="Budget & rapports" sub="Encaissé, versé, dépensé : le mois en trente secondes : que des chiffres réels."
      action={<div className="flex items-center gap-2">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold" />
        <Btn variant="soft" onClick={exportCSV}><Download size={15} /> CSV</Btn>
        <Btn onClick={() => setOpen(true)}><Plus size={15} /> Dépense</Btn>
      </div>} />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard tint="mint" icon={<Wallet size={20} />} value={money(R.income)} label="Encaissé" sub={monthLabel} onClick={() => setTile('income')} />
      <StatCard tint="grape" icon={<BriefcaseBusiness size={20} />} value={money(R.wages)} label="Salaires versés" onClick={() => setTile('wages')} />
      <StatCard tint="butter" icon={<ReceiptText size={20} />} value={money(R.spent)} label="Dépenses" onClick={() => setTile('spent')} />
      <StatCard tint={R.balance >= 0 ? 'sky' : 'coral'} icon={<Scale size={20} />} value={money(R.balance)} label="Solde du mois" onClick={() => setTile('balance')} />
    </div>

    <SectionCard icon={<TrendingUp size={16} />} tint="mint" title={`Solde mensuel · ${year}`} sub="Encaissements moins salaires et dépenses, mois par mois">
      <SoftArea data={series} dataKey="solde" color={STATUS.ok} id="gBud" unit={` ${currency()}`} height={220} />
    </SectionCard>

    {tile && (() => {
      const C = {
        income: {
          title: `Encaissé · ${monthLabel}`, body: (R.receipts.length + R.rentals.length) === 0
            ? <EmptyState icon={<Wallet size={24} />} title="Rien d'encaissé ce mois-ci" sub="Les reçus de scolarité et les locations payées apparaîtront ici." />
            : <>
              {R.receipts.map(r => <Row key={r.id} left={studentById(r.studentId)?.name || 'Élève'} sub={`Reçu ${r.number} · ${format(new Date(r.at), 'd MMM', { locale: fr })}`} right={money(r.amount)} tone={STATUS.ok} />)}
              {R.rentals.map(b => <Row key={b.id} left={b.who} sub={`Location · ${b.date} · ${b.from}–${b.to}`} right={money(b.price)} tone={STATUS.ok} />)}
            </>
        },
        wages: {
          title: `Salaires versés · ${monthLabel}`, body: R.payrolls.length === 0
            ? <EmptyState icon={<BriefcaseBusiness size={24} />} title="Aucune paie versée ce mois-ci" sub="La paie se prépare et se verse dans RH & Paie." />
            : R.payrolls.flatMap(p => (p.lines || []).map(l => <Row key={p.month + l.staffId} left={l.name} sub={l.role || ''} right={money(l.net)} />))
        },
        spent: {
          title: `Dépenses · ${monthLabel}`, body: R.expenses.length === 0
            ? <EmptyState icon={<ReceiptText size={24} />} title="Aucune dépense inscrite" sub="Le carnet couvre ce que le produit ne mesure pas : fournitures, maintenance…" />
            : R.expenses.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold truncate">{e.label}</span>
                  <span className="block text-[12px] text-muted">{expenseCatOf(e.category).label} · {e.date} · {e.by}</span></span>
                <span className="text-sm font-extrabold shrink-0" style={{ color: STATUS.warn }}>−{money(e.amount)}</span>
                <button onClick={() => cancel(e.id)} title="Annuler (motivé)" className="w-7 h-7 grid place-items-center rounded-lg text-muted hover:text-ink hover:bg-canvas shrink-0"><X size={14} /></button>
              </div>))
        },
        balance: {
          title: `Solde · ${monthLabel}`, body: (<>
            <Row left="Scolarité encaissée" sub={`${R.receipts.length} reçu(s)`} right={money(R.scolarite)} tone={STATUS.ok} />
            <Row left="Locations payées" sub={`${R.rentals.length} réservation(s)`} right={money(R.locations)} tone={STATUS.ok} />
            <Row left="Salaires versés" sub={`${R.payrolls.length} paie(s)`} right={`−${money(R.wages)}`} tone={STATUS.warn} />
            <Row left="Dépenses" sub={`${R.expenses.length} ligne(s)`} right={`−${money(R.spent)}`} tone={STATUS.warn} />
            <div className="border-t border-line mt-2 pt-2">
              <Row left="Solde du mois" right={money(R.balance)} tone={R.balance >= 0 ? STATUS.ok : STATUS.danger} />
            </div></>)
        },
      }[tile]
      return (
        <Modal open onClose={() => setTile(null)} title={C.title} size="xl"
          footer={<Btn variant="ghost" onClick={() => setTile(null)}>Fermer</Btn>}>
          {C.body}
        </Modal>)
    })()}

    <Modal open={open} onClose={() => setOpen(false)} title="Inscrire une dépense"
      footer={<><Btn variant="ghost" onClick={() => setOpen(false)}>Annuler</Btn><Btn onClick={submit}>Inscrire</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Date"><Input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Catégorie"><Select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>
          {Object.values(EXPENSE_CATS).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</Select></Field>
        <Field label="Libellé *"><Input value={f.label} onChange={e => setF({ ...f, label: e.target.value })} placeholder="Ramettes de papier, peinture atelier…" /></Field>
        <Field label={`Montant (${currency()}) *`}><Input type="number" min="0" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></Field>
      </div>
      <p className="text-[12px] text-muted mt-3">Une dépense inscrite ne s'efface pas : elle s'annule, motivée : la trace reste.</p>
    </Modal>
  </>)
}
