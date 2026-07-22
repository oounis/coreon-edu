// LE DOSSIER DE L'ENFANT — santé, personnes autorisées, jalons.
// La règle la plus grave du métier : un enfant ne part JAMAIS avec quelqu'un qui
// n'est pas sur la liste.
import { useState } from 'react'
import { current } from '@core/auth.js'
import { db } from '@core/db.js'
import { isEarly, labelOf } from '@core/levels.js'
import {
  VACCINES, RELATIONS, MILESTONES,
  healthOf, saveHealth, vaccineStatus,
  pickupsOf, addPickup, revokePickup, handOver, departuresToday,
  milestonesOf, observe, unobserve, milestoneStatus,
} from '@core/childcare.js'
import {
  PageHead, Card, Btn, Badge, Modal, Field, Input, Select, Tabs, EmptyState, Avatar, STATUS,
} from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import toast from 'react-hot-toast'

const hhmm = t => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function ChildFile() {
  const d = db()
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)

  // Le dossier ne concerne que la petite enfance : un CM2 n'a pas de jalon
  // « marche seul », et il rentre seul. Le modèle de capacités décide (levels.js).
  const kids = (d.students || [])
    .filter(s => !s.archived)
    .filter(s => isEarly((d.classes || []).find(c => c.id === s.classId)?.level))

  const [sel, setSel] = useState(kids[0]?.id)
  const [tab, setTab] = useState('depart')
  const child = kids.find(k => k.id === sel)

  if (!kids.length) return <EmptyState icon="Baby" title="Aucun enfant en petite enfance."
    sub="Le dossier de l’enfant concerne la crèche et la maternelle." />

  return (
    <>
      <PageHead title="Dossier de l’enfant" sub="Santé, personnes autorisées, jalons : ce qu’un ERP scolaire n’a jamais." />

      <div className="flex flex-wrap gap-2 mb-4">
        {kids.map(k => (
          <button key={k.id} onClick={() => setSel(k.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-bold border transition
              ${k.id === sel ? 'text-white border-transparent accent-bg' : 'bg-white border-line hover:border-ink/25'}`}>
            {k.name}
          </button>
        ))}
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'depart',  label: 'Qui peut le récupérer' },
        { value: 'sante',   label: 'Santé & vaccins' },
        { value: 'jalons',  label: 'Jalons' },
      ]} />

      <div className="mt-5">
        {tab === 'depart' && <Departs child={child} refresh={refresh} />}
        {tab === 'sante'  && <Sante child={child} refresh={refresh} />}
        {tab === 'jalons' && <Jalons child={child} refresh={refresh} />}
      </div>
    </>
  )
}

// ── PERSONNES AUTORISÉES ────────────────────────────────────────────────────
function Departs({ child, refresh }) {
  const me = current()
  const list = pickupsOf(child.id)
  const active = list.filter(p => p.active)
  const gone = departuresToday(child.id)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', relation: 'Père', phone: '', cin: '' })

  const add = () => {
    const r = addPickup(child.id, { ...f, addedBy: me.name })
    if (r.error) return toast.error(r.error)
    toast.success(`${f.name} peut désormais récupérer ${child.name.split(' ')[0]}.`)
    setOpen(false); setF({ name: '', relation: 'Père', phone: '', cin: '' }); refresh()
  }

  const give = p => {
    const r = handOver(child.id, p.id, me.name)
    if (r.error) return toast.error(r.error)
    toast.success(`${child.name.split(' ')[0]} remis à ${p.name}.`)
    refresh()
  }

  return (
    <>
      <Card className="p-5 mb-4" style={{ background: STATUS.dangerSoft }}>
        <div className="flex items-start gap-3">
          <Ic n="ShieldAlert" size={18} style={{ color: STATUS.danger }} />
          <div className="text-[13px]">
            <b>Un enfant ne part jamais avec quelqu’un qui n’est pas sur cette liste.</b>
            <div className="mt-1">
              La pièce d’identité est <b>obligatoire</b> : c’est ce que l’agent vérifie au portail.
              Dans une séparation conflictuelle, cette liste est ce qui sépare une école
              d’un enlèvement parental.
            </div>
          </div>
        </div>
      </Card>

      {!!gone.length && (
        <Card className="p-4 mb-4" style={{ background: STATUS.okSoft }}>
          <div className="text-[13px] font-bold flex items-center gap-2" style={{ color: STATUS.ok }}>
            <Ic n="CheckCheck" size={15} />
            Parti aujourd’hui à {hhmm(gone[0].at)} avec {gone[0].personName} ({gone[0].relation}) · remis par {gone[0].by}
          </div>
        </Card>
      )}

      <div className="flex justify-end mb-3">
        <Btn onClick={() => setOpen(true)}><Ic n="UserPlus" size={15} /> Autoriser quelqu’un</Btn>
      </div>

      {!active.length && <EmptyState icon="ShieldAlert" title="Personne n’est autorisé."
        sub="Tant que la liste est vide, cet enfant ne peut être remis à personne." />}

      <div className="grid gap-2">
        {list.map(p => (
          <Card key={p.id} className="p-4 flex items-center gap-3 flex-wrap"
            style={p.active ? {} : { opacity: .55 }}>
            <Avatar name={p.name} seed={p.id} />
            <div className="min-w-0">
              <div className="font-bold text-sm">{p.name}</div>
              <div className="text-xs text-muted font-semibold">
                {p.relation} · CIN {p.cin}{p.phone && ` · ${p.phone}`}
              </div>
            </div>
            <span className="flex-1" />
            {p.active ? (
              <>
                <Btn size="sm" onClick={() => give(p)}><Ic n="LogOut" size={14} /> Remettre l’enfant</Btn>
                <Btn size="sm" variant="ghost" onClick={() => {
                  revokePickup(child.id, p.id, me.name, 'Retirée par la direction'); refresh()
                }}>Retirer</Btn>
              </>
            ) : (
              <Badge label="Autorisation retirée" tone="danger" />
            )}
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`Autoriser une personne · ${child.name}`}
        footer={<><Btn variant="ghost" onClick={() => setOpen(false)}>Annuler</Btn><Btn onClick={add}>Autoriser</Btn></>}>
        <div className="grid gap-4">
          <Field label="Nom et prénom *"><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lien avec l’enfant">
              <Select value={f.relation} onChange={e => setF({ ...f, relation: e.target.value })}>
                {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Téléphone"><Input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field>
          </div>
          <Field label="Pièce d’identité (CIN) *" hint="Obligatoire. C’est ce que l’agent vérifie au portail.">
            <Input value={f.cin} onChange={e => setF({ ...f, cin: e.target.value })} placeholder="09876543" />
          </Field>
        </div>
      </Modal>
    </>
  )
}

// ── SANTÉ & VACCINS ─────────────────────────────────────────────────────────
function Sante({ child, refresh }) {
  const h = healthOf(child.id)
  const v = vaccineStatus(child)

  const toggle = key => {
    saveHealth(child.id, { vaccines: { ...h.vaccines, [key]: !h.vaccines?.[key] } })
    refresh()
  }

  return (
    <>
      {!!v.due?.length && (
        <Card className="p-5 mb-4" style={{ background: STATUS.warnSoft }}>
          <div className="flex items-start gap-3">
            <Ic n="Syringe" size={18} style={{ color: STATUS.warn }} />
            <div className="text-[13px]">
              <b>{v.due.length} vaccin(s) dus et non enregistrés</b> pour l’âge de {child.name.split(' ')[0]}
              {' '}({v.ageMonths} mois) : {v.due.map(x => x.label).join(', ')}.
              <div className="mt-1 text-muted">Une crèche a l’obligation de le savoir : et de le dire aux parents.</div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5 mb-4">
        <div className="text-sm font-bold mb-3">Carnet de vaccination</div>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {VACCINES.map(x => {
            const done = !!h.vaccines?.[x.key]
            const due = v.due?.some(d => d.key === x.key)
            return (
              <button key={x.key} onClick={() => toggle(x.key)}
                className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-left hover:border-ink/20">
                <span className="text-[13px] font-semibold flex items-center gap-2">
                  <Ic n={done ? 'CheckCircle2' : 'Circle'} size={16}
                    style={{ color: done ? STATUS.ok : due ? STATUS.warn : STATUS.neutral }} />
                  {x.label}
                </span>
                <span className="text-[11px] font-bold"
                  style={{ color: done ? STATUS.ok : due ? STATUS.warn : STATUS.neutral }}>
                  {done ? 'Fait' : due ? 'Dû' : `${x.months} mois`}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-bold mb-3">Santé</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Allergies" hint="Elles remontent sur la carte de l’enfant, dans le journal du jour.">
            <Input defaultValue={child.allergies} onBlur={e => { saveHealth(child.id, { allergies: e.target.value }); refresh() }} />
          </Field>
          <Field label="Traitement en cours">
            <Input defaultValue={h.meds} onBlur={e => { saveHealth(child.id, { meds: e.target.value }); refresh() }} />
          </Field>
          <Field label="Médecin traitant">
            <Input defaultValue={h.doctor} onBlur={e => { saveHealth(child.id, { doctor: e.target.value }); refresh() }} />
          </Field>
          <Field label="À savoir">
            <Input defaultValue={h.notes} onBlur={e => { saveHealth(child.id, { notes: e.target.value }); refresh() }} />
          </Field>
        </div>
      </Card>
    </>
  )
}

// ── JALONS ──────────────────────────────────────────────────────────────────
function Jalons({ child, refresh }) {
  const me = current()
  const seen = milestonesOf(child.id)
  const st = milestoneStatus(child)

  return (
    <>
      <Card className="p-5 mb-4" style={{ background: STATUS.infoSoft }}>
        <div className="flex items-start gap-3">
          <Ic n="Sparkles" size={18} style={{ color: STATUS.info }} />
          <div className="text-[13px]">
            <b>On observe. On ne note pas un enfant, et on ne le compare à personne.</b>
            <div className="mt-1">
              S’il y a quelque chose qu’on devrait voir à cet âge et qu’on ne voit pas,
              ce n’est pas un diagnostic : c’est une <b>conversation à avoir</b> avec les parents.
            </div>
          </div>
        </div>
      </Card>

      {!!st.watch?.length && (
        <Card className="p-4 mb-4" style={{ background: STATUS.warnSoft }}>
          <div className="text-[13px]">
            <b>À surveiller</b> ({child.name.split(' ')[0]}, {st.ageMonths} mois) :
            {' '}{st.watch.map(m => m.label).join(' · ')}
          </div>
        </Card>
      )}

      <div className="grid gap-1.5">
        {MILESTONES.map(m => {
          const on = !!seen[m.key]
          const expected = st.ageMonths >= m.months
          return (
            <button key={m.key}
              onClick={() => { on ? unobserve(child.id, m.key) : observe(child.id, m.key, me.name); refresh() }}
              className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5 text-left hover:border-ink/20 bg-white">
              <span className="text-[13px] font-semibold flex items-center gap-2">
                <Ic n={on ? 'CheckCircle2' : 'Circle'} size={17}
                  style={{ color: on ? STATUS.ok : expected ? STATUS.warn : STATUS.neutral }} />
                {m.label}
              </span>
              <span className="text-[11px] font-bold text-muted">
                {on
                  ? <span style={{ color: STATUS.ok }}>Observé par {seen[m.key].by}</span>
                  : `vers ${m.months} mois`}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
