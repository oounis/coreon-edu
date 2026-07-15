// ════════════════════════════════════════════════════════════════════════════
// INVENTAIRE — la liste, les quantités, l'alerte. Le cœur (inventory.js)
// journalise chaque mouvement ; cet écran fait entrer, sortir, et prévient.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { current } from '@core/auth.js'
import { items, addItem, adjust, lowStock, INV_CATS, invCatOf, itemById } from '@core/inventory.js'
import { PageHead, Card, SectionCard, Btn, Modal, Field, Input, Select, EmptyState, STATUS } from '../components/ui.jsx'
import { Boxes, Plus, Minus, AlertTriangle, History, PackageCheck } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function Inventory() {
  const u = current()
  const [, force] = useState(0); const refresh = () => force(x => x + 1)
  const [open, setOpen] = useState(false)
  const [hist, setHist] = useState(null)      // article : historique des mouvements
  const [alerts, setAlerts] = useState(false) // fenêtre des stocks bas
  const [f, setF] = useState({ name: '', category: 'pedagogique', location: '', qty: '', minQty: '' })
  const low = lowStock()

  const move = (id, delta) => {
    const r = adjust(id, delta, u.name)
    r.error ? toast.error(r.error) : refresh()
  }
  const submit = () => {
    const r = addItem({ ...f, by: u.name })
    if (r.error) return toast.error(r.error)
    toast.success(`${r.item.name} inscrit à l'inventaire`)
    setF({ name: '', category: 'pedagogique', location: '', qty: '', minQty: '' }); setOpen(false); refresh()
  }
  const grouped = Object.values(INV_CATS)
    .map(c => ({ cat: c, list: items().filter(x => x.category === c.key) }))
    .filter(g => g.list.length)

  return (<>
    <PageHead title="Inventaire" sub="Ce que l'école possède, où, et quand ça va manquer — chaque mouvement laisse une trace."
      action={<Btn onClick={() => setOpen(true)}><Plus size={15} /> Ajouter un article</Btn>} />

    <Card className="p-4 mb-4 flex items-center gap-3">
      <span className="w-11 h-11 grid place-items-center rounded-xl" style={{ background: (low.length ? STATUS.warn : STATUS.ok) + '20', color: low.length ? STATUS.warn : STATUS.ok }}>
        {low.length ? <AlertTriangle size={20} /> : <PackageCheck size={20} />}
      </span>
      <button onClick={() => low.length && setAlerts(true)} className={`text-left ${low.length ? 'k-press' : 'cursor-default'}`}>
        <div className="font-extrabold">{low.length ? `${low.length} article(s) sous le seuil — à racheter` : 'Aucun stock sous son seuil'}</div>
        <div className="text-xs text-muted">{low.length ? 'Cliquez pour voir la liste de courses.' : 'Chaque article porte un seuil : en dessous, il apparaît ici.'}</div>
      </button>
    </Card>

    {items().length === 0
      ? <Card><EmptyState icon={<Boxes size={26} />} title="Inventaire vide" sub="Ajoutez les articles que l'école veut suivre : feutres, couches, papier, mobilier…" /></Card>
      : grouped.map(({ cat, list }) => (
        <SectionCard key={cat.key} icon={<Boxes size={16} />} tint="sky" title={cat.label} bodyClass="p-3" className="mb-4">
          {list.map(it => (
            <div key={it.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
              <button onClick={() => setHist(it.id)} title="Historique des mouvements" className="min-w-0 flex-1 text-left k-press">
                <span className="block text-sm font-semibold truncate">{it.name}</span>
                <span className="block text-[12px] text-muted">{it.location || '—'} · seuil {it.minQty}</span>
              </button>
              {it.qty <= it.minQty && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS.warnSoft, color: STATUS.warn }}>BAS</span>}
              <div className="flex items-center gap-1.5 shrink-0">
                <Btn size="sm" variant="ghost" onClick={() => move(it.id, -1)} aria-label="Sortir un"><Minus size={14} /></Btn>
                <span className="w-10 text-center text-sm font-extrabold tabular-nums" style={it.qty <= it.minQty ? { color: STATUS.warn } : {}}>{it.qty}</span>
                <Btn size="sm" variant="ghost" onClick={() => move(it.id, +1)} aria-label="Entrer un"><Plus size={14} /></Btn>
              </div>
            </div>))}
        </SectionCard>))}

    <Modal open={alerts} onClose={() => setAlerts(false)} title="À racheter — stocks sous le seuil" size="lg"
      footer={<Btn variant="ghost" onClick={() => setAlerts(false)}>Fermer</Btn>}>
      {low.map(it => (
        <div key={it.id} className="flex items-center justify-between gap-3 px-2 py-2 rounded-xl hover:bg-canvas text-sm">
          <span className="font-semibold">{it.name} <span className="text-muted font-normal">· {invCatOf(it.category).label}</span></span>
          <span className="font-extrabold" style={{ color: STATUS.warn }}>{it.qty} / seuil {it.minQty}</span>
        </div>))}
    </Modal>

    <Modal open={!!hist} onClose={() => setHist(null)} title={hist ? `Mouvements — ${itemById(hist)?.name}` : ''} size="lg"
      footer={<Btn variant="ghost" onClick={() => setHist(null)}>Fermer</Btn>}>
      {hist && (itemById(hist)?.moves || []).map((m, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5 text-sm border-b border-line last:border-0">
          <History size={13} className="text-muted shrink-0" />
          <span className="flex-1 min-w-0 truncate">{m.note || (m.delta > 0 ? 'Entrée' : 'Sortie')} <span className="text-muted">· {m.by}</span></span>
          <span className="font-bold tabular-nums" style={{ color: m.delta > 0 ? STATUS.ok : STATUS.warn }}>{m.delta > 0 ? '+' : ''}{m.delta}</span>
          <span className="text-[12px] text-muted shrink-0">{format(new Date(m.at), 'd MMM HH:mm', { locale: fr })}</span>
        </div>))}
    </Modal>

    <Modal open={open} onClose={() => setOpen(false)} title="Ajouter un article"
      footer={<><Btn variant="ghost" onClick={() => setOpen(false)}>Annuler</Btn><Btn onClick={submit}>Ajouter</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Article *"><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Feutres, couches T4, ramettes A4…" /></Field>
        <Field label="Catégorie"><Select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>
          {Object.values(INV_CATS).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</Select></Field>
        <Field label="Emplacement"><Input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} placeholder="Réserve, atelier, cuisine…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantité"><Input type="number" min="0" value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} /></Field>
          <Field label="Seuil d'alerte"><Input type="number" min="0" value={f.minQty} onChange={e => setF({ ...f, minQty: e.target.value })} /></Field>
        </div>
      </div>
    </Modal>
  </>)
}
