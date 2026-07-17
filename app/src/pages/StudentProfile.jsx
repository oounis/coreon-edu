// ════════════════════════════════════════════════════════════════════════════
// LA FICHE ÉLÈVE 360° — l'écran qui manquait pour être un ERP, pas une app.
// Tout ce que l'école sait d'UN enfant, sur UNE page : identité & famille,
// présence, résultats, paiements, santé & sécurité, comportement, documents,
// accidents. Chaque chiffre du bandeau mène à sa section (règle produit).
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { current } from '@core/auth.js'
import { db, classById, userById, attParts } from '@core/db.js'
import { yearAverage } from '@core/academic.js'
import { entriesFor, traitOf } from '@core/behavior.js'
import { healthOf, pickupsOf, vaccineStatus } from '@core/childcare.js'
import { forChild as accidentsFor, STAGES as ACC_STAGES, SEVERITY } from '@core/accidents.js'
import { registry as docRegistry, docTypeOf } from '@core/documents.js'
import { invoicesOf, money } from '@core/accounting.js'
import { notify } from '@core/notify.js'
import { mentionFor } from '@core/results.js'
import { PageHead, Card, Avatar, Btn, Badge, SectionCard, EmptyState, STATUS } from '../components/ui.jsx'
import Bulletin from '../components/Bulletin.jsx'
import { ArrowLeft, BellRing, ScrollText, Users, CalendarCheck, Gauge, Wallet, Smile, HeartPulse, ShieldCheck, FileText, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

const FR_ATT = { present: 'Présent', absent: 'Absent', late: 'Retard' }

export default function StudentProfile() {
  const { id } = useParams()
  const nav = useNavigate()
  const u = current()
  const d = db()
  const s = d.students.find(x => x.id === id)
  const [bulletin, setBulletin] = useState(false)

  const stats = useMemo(() => {
    if (!s) return null
    // présence : 30 derniers jours + dernières anomalies
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    let present = 0, total = 0
    const anomalies = []
    for (const key in (d.attendance || {})) {
      const { iso } = attParts(key)
      const st = d.attendance[key][s.id]
      if (!st) continue
      if (iso >= cutoff) { total++; if (st === 'present') present++ }
      if (st !== 'present') anomalies.push({ iso, st })
    }
    anomalies.sort((a, b) => b.iso.localeCompare(a.iso))
    const months = d.payments[s.id] || []
    const unpaid = months.filter(m => m.status === 'due' || m.status === 'overdue')
    const behavior = entriesFor(s.id)
    return {
      rate: total ? Math.round(present / total * 100) : null, totalMarks: total,
      anomalies: anomalies.slice(0, 6),
      avg: yearAverage(s.id),
      months, unpaid,
      behavior, encouragements: behavior.filter(e => traitOf(e.trait)?.positive).length,
      health: healthOf(s.id), vaccines: vaccineStatus(s),
      pickups: pickupsOf(s.id).filter(p => p.active),
      docs: docRegistry().filter(x => x.studentId === s.id),
      accidents: accidentsFor(s.id),
      invoices: invoicesOf(s.id),
    }
  }, [d, s])

  if (!s) return <Card><EmptyState icon={<Users size={26} />} title="Élève introuvable" sub="Le dossier n'existe pas ou a été archivé sous un autre identifiant." /></Card>

  const cls = classById(s.classId)
  const parent = userById(s.parentId)
  const allergic = s.allergies && s.allergies !== 'Aucune'
  const go = anchor => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const tellParent = () => {
    if (!parent) return toast.error('Aucun compte parent lié')
    notify({ to: parent.id, kind: 'info', actor: u.name, title: `Au sujet de ${s.name.split(' ')[0]}`, body: 'La direction souhaite vous parler — merci de passer ou d\'appeler l\'école.' })
    toast.success(`Parent de ${s.name.split(' ')[0]} prévenu`)
  }

  const Tile = ({ icon, value, label, tone, anchor }) => (
    <button onClick={() => go(anchor)} className="card p-3.5 flex items-center gap-3 k-lift k-press text-left w-full">
      <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: (tone || 'var(--accent)') + '1E', color: tone || 'var(--accent)' }}>{icon}</span>
      <span className="min-w-0"><span className="block text-xl font-extrabold leading-none">{value}</span>
        <span className="block text-[11px] text-muted mt-1 truncate">{label}</span></span>
    </button>)

  return (<>
    <button onClick={() => nav(-1)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink mb-3"><ArrowLeft size={15} /> Retour</button>

    {/* ── Le bandeau d'identité ── */}
    <Card className="p-5 mb-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Avatar name={s.name} seed={s.id} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold">{s.name}</h1>
            {s.archived && <Badge tone="neutral" label="Dossier archivé" status="archived" />}
            {allergic && <Badge tone="warn" label={`Allergie : ${s.allergies}`} status="allergy" />}
          </div>
          <div className="text-sm text-muted mt-0.5">
            {cls ? `${cls.name} · ${cls.cycle}` : 'Sans classe'}{s.dob && ` · né(e) le ${s.dob}`}{s.bloodGroup && s.bloodGroup !== '—' && ` · ${s.bloodGroup}`}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn variant="soft" onClick={tellParent}><BellRing size={15} /> Prévenir le parent</Btn>
          <Btn variant="soft" onClick={() => setBulletin(true)}><Printer size={15} /> Bulletin</Btn>
          {['schooladmin', 'admin'].includes(u.role) && <Btn onClick={() => nav('/app/documents')}><ScrollText size={15} /> Délivrer un document</Btn>}
        </div>
      </div>
    </Card>

    {/* ── Les quatre chiffres — chacun mène à sa section ── */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <Tile icon={<CalendarCheck size={19} />} value={stats.rate != null ? `${stats.rate}%` : '—'} label={`Présence · 30 j (${stats.totalMarks} appels)`} tone={STATUS.ok} anchor="sec-presence" />
      <Tile icon={<Gauge size={19} />} value={stats.avg != null ? `${stats.avg}/100` : '—'} label="Moyenne de l'année" anchor="sec-resultats" />
      <Tile icon={<Wallet size={19} />} value={stats.unpaid.length} label="Mois impayés" tone={stats.unpaid.length ? STATUS.danger : STATUS.ok} anchor="sec-paiements" />
      <Tile icon={<Smile size={19} />} value={stats.encouragements} label={`Encouragements (${stats.behavior.length} obs.)`} tone={STATUS.ok} anchor="sec-comportement" />
    </div>

    <div className="grid lg:grid-cols-2 gap-4">
      {/* Famille & contact */}
      <SectionCard icon={<Users size={16} />} tint="brand" title="Famille & contact" bodyClass="p-4">
        <div className="space-y-1.5 text-sm">
          {[['Parent (compte)', parent ? parent.name : '— aucun compte lié'],
            ['Père', s.fatherName], ['Mère', s.motherName],
            ['Téléphone', s.guardianPhone || s.phone], ['E-mail', s.email || parent?.email],
            ['Adresse', s.address], ['Urgence', s.emergencyName && `${s.emergencyName} · ${s.emergencyPhone}`]]
            .filter(x => x[1] && x[1] !== '—').map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line py-1.5 last:border-0">
                <span className="text-muted">{k}</span><span className="font-medium text-right truncate">{v}</span></div>))}
        </div>
      </SectionCard>

      {/* Présence */}
      <SectionCard icon={<CalendarCheck size={16} />} tint="mint" title="Présence" sub="30 derniers jours + dernières anomalies" bodyClass="p-4">
        <div id="sec-presence" className="text-3xl font-extrabold" style={{ color: stats.rate >= 90 ? STATUS.ok : STATUS.warn }}>{stats.rate != null ? `${stats.rate}%` : 'Aucun appel'}</div>
        {stats.anomalies.length === 0
          ? <p className="text-sm text-muted mt-2">Aucune absence ni retard enregistrés.</p>
          : <div className="mt-2 space-y-1">{stats.anomalies.map((a, i) => (
            <div key={i} className="flex justify-between text-sm border-b border-line py-1 last:border-0">
              <span className="text-muted">{a.iso}</span><Badge status={a.st} /></div>))}</div>}
      </SectionCard>

      {/* Résultats */}
      <SectionCard icon={<Gauge size={16} />} tint="grape" title="Résultats" sub="Moyenne de l'année et mention" bodyClass="p-4">
        <div id="sec-resultats" className="flex items-end gap-3">
          <span className="text-3xl font-extrabold" style={{ color: stats.avg != null ? mentionFor(stats.avg).color : undefined }}>{stats.avg != null ? `${stats.avg}/100` : '—'}</span>
          {stats.avg != null && <span className="text-sm font-bold px-2 py-0.5 rounded-full mb-1" style={{ background: mentionFor(stats.avg).color + '1E', color: mentionFor(stats.avg).color }}>{mentionFor(stats.avg).label}</span>}
        </div>
        <div className="mt-3"><Btn size="sm" variant="soft" onClick={() => setBulletin(true)}><FileText size={14} /> Voir le bulletin complet</Btn></div>
      </SectionCard>

      {/* Paiements */}
      <SectionCard icon={<Wallet size={16} />} tint="butter" title="Paiements" sub={`${stats.months.length - stats.unpaid.length}/${stats.months.length} mois réglés`} bodyClass="p-4">
        <div id="sec-paiements" className="flex flex-wrap gap-1.5">
          {stats.months.map((m, i) => {
            const col = { paid: STATUS.ok, pending: STATUS.warn, overdue: STATUS.danger, due: STATUS.neutral }[m.status]
            return <span key={i} title={m.status} className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ background: col + '1E', color: col }}>{m.month}</span>})}
        </div>
        {stats.invoices.length > 0 && <p className="text-[12px] text-muted mt-2">{stats.invoices.length} facture(s) émise(s) — détail dans Comptabilité.</p>}
      </SectionCard>

      {/* Santé & sécurité */}
      <SectionCard icon={<HeartPulse size={16} />} tint="coral" title="Santé & sécurité" bodyClass="p-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between border-b border-line py-1.5"><span className="text-muted">Allergies</span>
            <span className="font-bold" style={allergic ? { color: STATUS.warn } : {}}>{s.allergies || 'Aucune'}</span></div>
          <div className="flex justify-between border-b border-line py-1.5"><span className="text-muted">Suivi médical</span><span className="font-medium">{s.medical || 'Aucun'}</span></div>
          <div className="flex justify-between border-b border-line py-1.5"><span className="text-muted">Vaccins</span>
            <span className="font-medium" style={stats.vaccines.due?.length ? { color: STATUS.warn } : {}}>
              {stats.vaccines.unknown ? '—' : `${stats.vaccines.done.length} faits${stats.vaccines.due.length ? ` · ${stats.vaccines.due.length} en retard` : ' · à jour'}`}</span></div>
          <div className="flex justify-between py-1.5"><span className="text-muted flex items-center gap-1"><ShieldCheck size={13} /> Personnes autorisées</span>
            <span className="font-medium">{stats.pickups.length ? stats.pickups.map(p => p.name.split(' ')[0]).join(', ') : 'Aucune — à compléter !'}</span></div>
        </div>
      </SectionCard>

      {/* Comportement */}
      <SectionCard icon={<Smile size={16} />} tint="mint" title="Comportement" sub="On observe pour encourager — jamais pour classer" bodyClass="p-4">
        <div id="sec-comportement">
          {stats.behavior.length === 0 ? <p className="text-sm text-muted">Aucune observation.</p>
            : stats.behavior.slice(0, 5).map(e => {
              const t = traitOf(e.trait)
              return (
                <div key={e.id} className="flex items-center gap-2.5 py-1.5 border-b border-line last:border-0 text-sm">
                  <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: (t?.positive ? STATUS.ok : STATUS.warn) + '1E', color: t?.positive ? STATUS.ok : STATUS.warn }}>
                    <Smile size={14} /></span>
                  <span className="flex-1 min-w-0 truncate font-medium">{t?.label || e.trait}</span>
                  <span className="text-[12px] text-muted shrink-0">{format(new Date(e.at), 'd MMM', { locale: fr })}</span>
                </div>)})}
        </div>
      </SectionCard>

      {/* Documents & accidents */}
      <SectionCard icon={<ScrollText size={16} />} tint="sky" title="Documents & accidents" bodyClass="p-4">
        {stats.docs.length === 0 && stats.accidents.length === 0 && <p className="text-sm text-muted">Aucun document délivré, aucun accident déclaré.</p>}
        {stats.docs.map(x => (
          <div key={x.id} className="flex justify-between gap-3 text-sm border-b border-line py-1.5">
            <span className="truncate">{docTypeOf(x.type)?.label}</span>
            <span className="text-muted shrink-0 tabular-nums">{x.number}</span></div>))}
        {stats.accidents.map(a => (
          <div key={a.id} className="flex items-center justify-between gap-3 text-sm border-b border-line py-1.5 last:border-0">
            <span className="truncate">{SEVERITY[a.severity]?.label} · {format(new Date(a.at), 'd MMM yyyy', { locale: fr })}</span>
            <Badge tone={ACC_STAGES[a.stage]?.tone} label={ACC_STAGES[a.stage]?.label} status={a.stage} /></div>))}
      </SectionCard>
    </div>

    {bulletin && <Bulletin student={s} onClose={() => setBulletin(false)} />}
  </>)
}
