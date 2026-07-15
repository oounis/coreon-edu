// ════════════════════════════════════════════════════════════════════════════
// RECRUTEMENT — le pipeline d'embauche, sans saut d'étape.
// Le cœur (recruit.js) tient le parcours ; cet écran fait avancer les gens.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { current } from '@core/auth.js'
import { posts, openPost, closePost, candidates, candidatesOf, addCandidate, advanceCandidate, R_STAGES, POST_TYPES } from '@core/recruit.js'
import { PageHead, Card, SectionCard, Btn, Modal, Field, Input, Select, Textarea, Badge, Avatar, EmptyState } from '../components/ui.jsx'
import { UserPlus, Plus, Check, X, ChevronRight, Phone, Mail } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function Recruit() {
  const u = current()
  const [, force] = useState(0); const refresh = () => force(x => x + 1)
  const [openP, setOpenP] = useState(false)
  const [openC, setOpenC] = useState(null)     // postId : ajouter une candidature
  const [view, setView] = useState(null)       // candidate id : fiche + actions
  const [fp, setFp] = useState({ title: '', type: POST_TYPES[0] })
  const [fc, setFc] = useState({ name: '', phone: '', email: '', note: '' })
  const [note, setNote] = useState('')

  const submitPost = () => {
    const r = openPost({ ...fp, by: u.name })
    if (r.error) return toast.error(r.error)
    toast.success(`Poste ouvert : ${r.post.title}`); setFp({ title: '', type: POST_TYPES[0] }); setOpenP(false); refresh()
  }
  const submitCand = () => {
    const r = addCandidate({ postId: openC, ...fc })
    if (r.error) return toast.error(r.error)
    toast.success(`Candidature reçue : ${r.candidate.name}`)
    setFc({ name: '', phone: '', email: '', note: '' }); setOpenC(null); refresh()
  }
  const move = (id, stage) => {
    const r = advanceCandidate(id, stage, u.name, note)
    if (r.error) return toast.error(r.error)
    toast.success(`→ ${R_STAGES[stage].label}`); setNote(''); setView(null); refresh()
  }
  const cand = view ? candidates().find(c => c.id === view) : null
  const candPost = cand ? posts().find(p => p.id === cand.postId) : null

  return (<>
    <PageHead title="Recrutement" sub="Reçue → entretien → offre → embauchée. Personne ne passe à l'offre sans entretien."
      action={<Btn onClick={() => setOpenP(true)}><Plus size={15} /> Ouvrir un poste</Btn>} />

    {posts().length === 0
      ? <Card><EmptyState icon={<UserPlus size={26} />} title="Aucun poste ouvert" sub="Ouvrez un poste pour commencer à recevoir des candidatures." /></Card>
      : posts().map(p => {
        const list = candidatesOf(p.id)
        const open = p.status === 'ouvert'
        return (
          <SectionCard key={p.id} icon={<UserPlus size={16} />} tint={open ? 'brand' : 'slate'} className="mb-4"
            title={p.title} sub={`${p.type} · ${list.length} candidature(s)`}
            action={<div className="flex gap-2">
              {open && <Btn size="sm" variant="soft" onClick={() => setOpenC(p.id)}><Plus size={14} /> Candidature</Btn>}
              <Btn size="sm" variant="ghost" onClick={() => { closePost(p.id, u.name); refresh() }}>{open ? 'Fermer le poste' : 'Rouvrir'}</Btn>
            </div>} bodyClass="p-3">
            {list.length === 0
              ? <EmptyState title="Aucune candidature" sub={open ? 'Ajoutez la première candidature reçue.' : 'Poste fermé.'} />
              : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                {list.map(c => (
                  <button key={c.id} onClick={() => { setNote(''); setView(c.id) }} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-line hover:bg-canvas text-left">
                    <Avatar name={c.name} seed={c.id} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate">{c.name}</span>
                      <span className="block text-[12px] text-muted">{format(new Date(c.at), 'd MMM', { locale: fr })}</span></span>
                    <Badge tone={R_STAGES[c.stage].tone} label={R_STAGES[c.stage].label} status={c.stage} />
                    <ChevronRight size={14} className="text-muted shrink-0" />
                  </button>))}
              </div>}
          </SectionCard>)
      })}

    <Modal open={!!view} onClose={() => setView(null)} title={cand ? cand.name : ''} size="xl"
      footer={cand && !R_STAGES[cand.stage].terminal ? <>
        <Btn variant="ghost" onClick={() => move(cand.id, 'refusee')}><X size={15} /> Refuser</Btn>
        {R_STAGES[cand.stage].next.filter(s => s !== 'refusee').map(s =>
          <Btn key={s} onClick={() => move(cand.id, s)}><Check size={15} /> {R_STAGES[s].label}</Btn>)}
      </> : <Btn variant="ghost" onClick={() => setView(null)}>Fermer</Btn>}>
      {cand && <>
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={cand.name} seed={cand.id} size={44} />
          <div className="min-w-0">
            <div className="font-bold">{cand.name} <Badge tone={R_STAGES[cand.stage].tone} label={R_STAGES[cand.stage].label} status={cand.stage} /></div>
            <div className="text-[12px] text-muted">{candPost?.title} · {candPost?.type}</div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3 bg-canvas rounded-xl p-3">
          <div className="flex items-center gap-1.5"><Phone size={13} className="text-muted" /> {cand.phone ? <a className="accent-text font-semibold" href={`tel:${cand.phone}`}>{cand.phone}</a> : '—'}</div>
          <div className="flex items-center gap-1.5"><Mail size={13} className="text-muted" /> {cand.email ? <a className="accent-text font-semibold" href={`mailto:${cand.email}`}>{cand.email}</a> : '—'}</div>
        </div>
        {cand.note && <p className="text-sm text-muted mb-3">« {cand.note} »</p>}
        <div className="text-xs font-bold uppercase text-muted mb-1">Parcours</div>
        {cand.history.map((h, i) => (
          <div key={i} className="text-xs py-1 border-b border-line last:border-0">
            <b>{R_STAGES[h.stage]?.label}</b> · {h.by} · {format(new Date(h.at), 'd MMM yyyy HH:mm', { locale: fr })}
            {h.note && <span className="text-muted"> — {h.note}</span>}
          </div>))}
        {!R_STAGES[cand.stage].terminal && <div className="mt-3">
          <Field label="Note (obligatoire pour un refus)"><Textarea value={note} onChange={e => setNote(e.target.value)} className="h-16" placeholder="Compte rendu d'entretien, motif de refus…" /></Field>
        </div>}
        {cand.stage === 'embauchee' && <p className="text-[12px] text-muted mt-3">Embauchée ✓ — créez maintenant son contrat dans <b>RH & Paie</b> et son compte dans <b>Comptes</b>.</p>}
      </>}
    </Modal>

    <Modal open={openP} onClose={() => setOpenP(false)} title="Ouvrir un poste"
      footer={<><Btn variant="ghost" onClick={() => setOpenP(false)}>Annuler</Btn><Btn onClick={submitPost}>Ouvrir</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Intitulé *"><Input value={fp.title} onChange={e => setFp({ ...fp, title: e.target.value })} placeholder="Éducatrice petite enfance" /></Field>
        <Field label="Type"><Select value={fp.type} onChange={e => setFp({ ...fp, type: e.target.value })}>{POST_TYPES.map(t => <option key={t}>{t}</option>)}</Select></Field>
      </div>
    </Modal>

    <Modal open={!!openC} onClose={() => setOpenC(null)} title="Nouvelle candidature"
      footer={<><Btn variant="ghost" onClick={() => setOpenC(null)}>Annuler</Btn><Btn onClick={submitCand}>Enregistrer</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nom & prénom *"><Input value={fc.name} onChange={e => setFc({ ...fc, name: e.target.value })} /></Field>
        <Field label="Téléphone"><Input value={fc.phone} onChange={e => setFc({ ...fc, phone: e.target.value })} placeholder="+216 …" /></Field>
        <Field label="E-mail"><Input value={fc.email} onChange={e => setFc({ ...fc, email: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Note"><Textarea value={fc.note} onChange={e => setFc({ ...fc, note: e.target.value })} className="h-16" placeholder="Expérience, diplômes, disponibilité…" /></Field></div>
      </div>
    </Modal>
  </>)
}
