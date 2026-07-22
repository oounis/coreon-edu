// ════════════════════════════════════════════════════════════════════════════
// LES MOMENTS — partage photo/vidéo de la journée. Ce que les parents attendent
// le plus d'une crèche. La vie privée des enfants est tenue par le cœur
// (gallery.js) : un parent ne voit que son enfant ou la classe de son enfant.
//
// Les photos sont RÉDUITES avant stockage (comme les pièces jointes) : en démo
// tout vit dans le navigateur. La limite est assumée (docs/quality).
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { current } from '@core/auth.js'
import { db, studentById, classById, studentsOfClass } from '@core/db.js'
import { share, feedForClass, feedForParent, toggleLike, removeMoment } from '@core/gallery.js'
import { t } from '@core/i18n.js'
import { PageHead, Card, Btn, Avatar, EmptyState, STATUS, Modal, Field, Textarea, Select } from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import { Heart, Trash2, ImagePlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { isRemote, remoteOp } from '../remote.js'

const MAX_IMG = 12 * 1024 * 1024, MAX_STORED = 900 * 1024, EDGE = 1200
const ago = ts => { const h = Math.round((Date.now() - ts) / 3600000); return h < 1 ? "à l'instant" : h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j` }

// Réduire une image avant stockage — une photo sert à être vue, pas imprimée en A0.
async function shrink(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    const scale = Math.min(1, EDGE / Math.max(img.width, img.height))
    const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return { type: 'image', data: c.toDataURL('image/jpeg', 0.8), name: file.name }
  } finally { URL.revokeObjectURL(url) }
}

export default function Gallery() {
  const u = current()
  if (u.role === 'parent') return <ParentFeed u={u} />
  return <StaffGallery u={u} />
}

// ── Enseignant / direction : partager un moment ─────────────────────────────
function StaffGallery({ u }) {
  const d = db()
  const [, force] = useState(0); const refresh = () => force(x => x + 1)
  const classes = d.classes.filter(c => studentsOfClass(c.id).length)
  const [classId, setClassId] = useState(classes[0]?.id)
  const [composing, setComposing] = useState(false)
  const feed = classId ? feedForClass(classId) : []

  return (<>
    <PageHead title={t('Moments')} sub="Une photo de la journée, et le parent la voit le soir même."
      action={<div className="flex gap-2">
        <Select value={classId} onChange={e => setClassId(e.target.value)} className="w-auto">{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Btn onClick={() => setComposing(true)}><ImagePlus size={16} /> Partager</Btn>
      </div>} />

    {feed.length === 0
      ? <Card><EmptyState icon="Camera" title="Aucun moment partagé" sub="Partagez une photo de la journée : les parents adorent." /></Card>
      : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {feed.map(m => <MomentCard key={m.id} m={m} u={u} onChange={refresh} canDelete />)}
      </div>}

    {composing && <Composer u={u} classId={classId} onClose={() => { setComposing(false); refresh() }} />}
  </>)
}

function Composer({ u, classId, onClose }) {
  const [caption, setCaption] = useState('')
  const [media, setMedia] = useState([])
  const [kids, setKids] = useState([])
  const [busy, setBusy] = useState(false)
  const students = studentsOfClass(classId)

  const addFiles = async e => {
    const files = [...(e.target.files || [])]
    setBusy(true)
    try {
      const out = []
      for (const f of files) {
        if (!String(f.type).startsWith('image/')) { toast.error(`« ${f.name} » n'est pas une image.`); continue }
        if (f.size > MAX_IMG) { toast.error(`« ${f.name} » est trop lourde.`); continue }
        const m = await shrink(f)
        if (m.data.length > MAX_STORED) { toast.error(`« ${f.name} » reste trop lourde. Reprenez-la en qualité moyenne.`); continue }
        out.push(m)
      }
      setMedia(v => [...v, ...out])
    } finally { setBusy(false); e.target.value = '' }
  }

  const submit = () => {
    const r = share({ classId, childIds: kids, caption, media, byId: u.id, byName: u.name })
    if (r.error) return toast.error(r.error)
    toast.success('Moment partagé : les parents sont prévenus 📸')
    onClose()
  }

  return (
    <Modal open onClose={onClose} size="xl" title={`Partager un moment · ${classById(classId)?.name || ''}`}
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={submit} disabled={busy}>Partager</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {media.map((m, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-canvas">
              <img src={m.data} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setMedia(v => v.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-ink/60 text-white"><X size={13} /></button>
            </div>
          ))}
          <label className="aspect-square rounded-xl border-2 border-dashed border-line grid place-items-center cursor-pointer text-muted hover:accent-text hover:border-current transition">
            <span className="flex flex-col items-center gap-1 text-xs font-semibold"><ImagePlus size={20} />{busy ? '…' : 'Ajouter'}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={addFiles} />
          </label>
        </div>
        <Field label="Un mot (facultatif)"><Textarea value={caption} onChange={e => setCaption(e.target.value)} className="h-16" placeholder="Atelier peinture ce matin : tout le monde a adoré !" /></Field>
        <div>
          <div className="text-xs font-semibold text-muted mb-1.5">Enfants sur la photo (facultatif : sinon c'est un moment de toute la classe)</div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scroll-thin">
            {students.map(s => {
              const on = kids.includes(s.id)
              return <button key={s.id} onClick={() => setKids(v => on ? v.filter(x => x !== s.id) : [...v, s.id])}
                className={`text-[13px] font-semibold px-2.5 py-1.5 rounded-full border transition ${on ? 'text-white accent-bg border-transparent' : 'bg-white border-line text-muted'}`}>{s.name.split(' ')[0]}</button>
            })}
          </div>
          <p className="text-[11px] text-muted mt-2">Seuls les parents des enfants identifiés (ou de la classe) verront ce moment.</p>
        </div>
      </div>
    </Modal>
  )
}

// ── Parent : le fil de SON enfant, avec un cœur ─────────────────────────────
function ParentFeed({ u }) {
  const [, force] = useState(0)
  const feed = feedForParent(u)
  return (<>
    <PageHead title={t('Moments')} sub="Les photos de la journée de votre enfant." />
    {feed.length === 0
      ? <Card><EmptyState icon="Camera" title="Rien encore" sub="Les moments partagés par l'école apparaîtront ici." /></Card>
      : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {feed.map(m => <MomentCard key={m.id} m={m} u={u} onChange={() => force(x => x + 1)} />)}
      </div>}
  </>)
}

// ── La carte d'un moment — partagée par les deux vues ───────────────────────
function MomentCard({ m, u, onChange, canDelete }) {
  const liked = (m.likes || []).includes(u.id)
  const kids = m.childIds.map(studentById).filter(Boolean)
  return (
    <Card className="overflow-hidden flex flex-col">
      {m.media?.length > 0 && (
        <div className={`grid gap-0.5 ${m.media.length === 1 ? '' : 'grid-cols-2'}`}>
          {m.media.slice(0, 4).map((med, i) => (
            <img key={i} src={med.data} alt="" className="w-full aspect-square object-cover" loading="lazy" />
          ))}
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col gap-2">
        {m.caption && <p className="text-sm font-medium">{m.caption}</p>}
        {kids.length > 0 && <div className="flex flex-wrap gap-1">{kids.map(k => <span key={k.id} className="text-[11px] font-bold px-2 py-0.5 rounded-full accent-soft accent-text">{k.name.split(' ')[0]}</span>)}</div>}
        <div className="flex items-center gap-2 text-xs text-muted mt-auto pt-1">
          <Avatar name={m.byName} seed={m.by} size={22} />
          <span className="flex-1 truncate">{m.byName} · {ago(m.at)}</span>
          <button onClick={async () => {
            if (isRemote() && u.role === 'parent') { const r = await remoteOp('toggleLike', [m.id]); if (r.error) return }
            else toggleLike(m.id, u.id)
            onChange() }} className="inline-flex items-center gap-1 font-bold" style={{ color: liked ? STATUS.danger : undefined }}>
            <Heart size={15} fill={liked ? STATUS.danger : 'none'} /> {(m.likes || []).length || ''}
          </button>
          {canDelete && <button onClick={() => { if (confirm('Retirer ce moment ?')) { removeMoment(m.id); onChange() } }} className="text-muted hover:text-ink ml-1"><Trash2 size={14} /></button>}
        </div>
      </div>
    </Card>
  )
}
