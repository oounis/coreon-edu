// ════════════════════════════════════════════════════════════════════════════
// LA CANTINE — le menu de la semaine, et surtout QUI ne peut pas le manger.
//
// La signature du module : l'ALERTE ALLERGIE, calculée du dossier des enfants
// inscrits, affichée AVANT le service. C'est la sécurité de l'enfant appliquée
// au repas — la même pensée que la chaîne d'accident. Le cœur (canteen.js)
// tient le croisement ; cet écran le rend lisible.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { current } from '@core/auth.js'
import { db, studentById, studentsOfClass } from '@core/db.js'
import {
  DAYS, ALLERGEN_LIST, allergenOf, dishesOf, setDay, atRiskForDay, allergensOfDay,
  isSubscribed, toggleSubscriber, subscribers, weekForChild, summary,
} from '@core/canteen.js'
import { t } from '@core/i18n.js'
import { PageHead, Card, Btn, Avatar, EmptyState, STATUS, Modal, Field, Input } from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import { AlertTriangle, UtensilsCrossed, Plus, X, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Canteen() {
  const u = current()
  if (u.role === 'parent') return <ParentCanteen u={u} />
  return <StaffCanteen u={u} />
}

// ── Direction / enseignant : le menu + l'alerte allergie ────────────────────
function StaffCanteen({ u }) {
  const [, force] = useState(0); const refresh = () => force(x => x + 1)
  const [editDay, setEditDay] = useState(null)
  const [manageSubs, setManageSubs] = useState(false)
  const sum = summary()

  return (<>
    <PageHead title={t('Cantine')} sub="Le menu de la semaine — et qui, parmi les inscrits, ne peut pas le manger."
      action={<Btn variant="soft" onClick={() => setManageSubs(true)}><Ic n="Users" size={16} /> Inscrits ({sum.subscribers})</Btn>} />

    {/* La bannière sécurité : le total des alertes de la semaine */}
    <Card className="p-4 mb-4 flex items-center gap-3" style={{ background: sum.alerts ? STATUS.warn + '10' : STATUS.ok + '0E' }}>
      <span className="w-11 h-11 grid place-items-center rounded-xl" style={{ background: (sum.alerts ? STATUS.warn : STATUS.ok) + '20', color: sum.alerts ? STATUS.warn : STATUS.ok }}>
        {sum.alerts ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
      </span>
      <div><div className="font-extrabold">{sum.alerts ? `${sum.alerts} alerte${sum.alerts > 1 ? 's' : ''} allergie cette semaine` : 'Aucune allergie en conflit cette semaine'}</div>
        <div className="text-xs text-muted">Croisé automatiquement avec le dossier de chaque enfant inscrit.</div></div>
    </Card>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {DAYS.map(day => {
        const dishes = dishesOf(day.key)
        const risk = atRiskForDay(day.key)
        return (
          <Card key={day.key} className="p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">{day.label}</h3>
              <button onClick={() => setEditDay(day.key)} className="text-xs font-semibold accent-text">Modifier</button>
            </div>
            {dishes.length === 0
              ? <div className="text-sm text-muted py-3">Aucun plat prévu.</div>
              : <div className="space-y-1.5 flex-1">
                {dishes.map((dish, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <UtensilsCrossed size={13} className="text-muted shrink-0" />
                    <span className="flex-1">{dish.name}</span>
                    {(dish.allergens || []).map(a => <span key={a} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: STATUS.warn + '18', color: STATUS.warn }}>{allergenOf(a)?.label || a}</span>)}
                  </div>
                ))}
              </div>}
            {risk.length > 0 && (
              <div className="mt-3 pt-3 border-t border-line">
                <div className="flex items-center gap-1.5 text-xs font-bold mb-1.5" style={{ color: STATUS.warn }}><AlertTriangle size={13} /> À NE PAS SERVIR À</div>
                <div className="space-y-1">
                  {risk.map(r => (
                    <div key={r.student.id} className="flex items-center gap-2 text-[13px]">
                      <Avatar name={r.student.name} seed={r.student.id} size={22} />
                      <span className="font-semibold">{r.student.name.split(' ')[0]}</span>
                      <span className="text-muted">— {r.allergens.map(a => a.label).join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>

    {editDay && <EditDayModal day={editDay} onClose={() => { setEditDay(null); refresh() }} />}
    {manageSubs && <SubsModal onClose={() => { setManageSubs(false); refresh() }} />}
  </>)
}

function EditDayModal({ day, onClose }) {
  const label = DAYS.find(d => d.key === day)?.label || day
  const [dishes, setDishes] = useState(() => dishesOf(day).map(d => ({ ...d, allergens: [...(d.allergens || [])] })))
  const add = () => setDishes(v => [...v, { name: '', allergens: [] }])
  const setName = (i, name) => setDishes(v => v.map((d, j) => j === i ? { ...d, name } : d))
  const toggleAllergen = (i, a) => setDishes(v => v.map((d, j) => j === i ? { ...d, allergens: d.allergens.includes(a) ? d.allergens.filter(x => x !== a) : [...d.allergens, a] } : d))
  const remove = i => setDishes(v => v.filter((_, j) => j !== i))
  const save = () => { setDay(day, dishes.filter(d => d.name.trim())); toast.success(`Menu du ${label.toLowerCase()} enregistré`); onClose() }

  return (
    <Modal open onClose={onClose} size="xl" title={`Menu · ${label}`}
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={save}>Enregistrer</Btn></>}>
      <div className="space-y-3">
        {dishes.map((dish, i) => (
          <div key={i} className="rounded-xl border border-line p-3">
            <div className="flex items-center gap-2 mb-2">
              <Input value={dish.name} onChange={e => setName(i, e.target.value)} placeholder="Nom du plat" />
              <button onClick={() => remove(i)} className="text-muted hover:text-ink shrink-0"><X size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGEN_LIST.map(a => {
                const on = dish.allergens.includes(a.key)
                return <button key={a.key} onClick={() => toggleAllergen(i, a.key)}
                  className={`text-[12px] font-semibold px-2 py-1 rounded-full border transition ${on ? 'text-white border-transparent' : 'bg-white border-line text-muted'}`}
                  style={on ? { background: STATUS.warn } : {}}>{a.label}</button>
              })}
            </div>
          </div>
        ))}
        <Btn variant="soft" onClick={add}><Plus size={15} /> Ajouter un plat</Btn>
        <p className="text-[11px] text-muted">Cochez les allergènes de chaque plat : l'école sera prévenue automatiquement pour chaque enfant concerné.</p>
      </div>
    </Modal>
  )
}

function SubsModal({ onClose }) {
  const d = db()
  const [, force] = useState(0)
  const classes = d.classes.filter(c => studentsOfClass(c.id).length)
  return (
    <Modal open onClose={onClose} size="xl" title="Enfants inscrits à la cantine"
      footer={<Btn onClick={onClose}>Terminé</Btn>}>
      <div className="space-y-4">
        {classes.map(c => (
          <div key={c.id}>
            <div className="text-xs font-bold uppercase text-muted mb-1.5">{c.name}</div>
            <div className="flex flex-wrap gap-1.5">
              {studentsOfClass(c.id).map(s => {
                const on = isSubscribed(s.id)
                const allergic = String(s.allergies || '').toLowerCase() !== 'aucune' && s.allergies
                return <button key={s.id} onClick={() => { toggleSubscriber(s.id); force(x => x + 1) }}
                  className={`text-[13px] font-semibold px-2.5 py-1.5 rounded-full border transition inline-flex items-center gap-1 ${on ? 'text-white accent-bg border-transparent' : 'bg-white border-line text-muted'}`}>
                  {s.name.split(' ')[0]}{allergic && <AlertTriangle size={11} style={{ color: on ? '#fff' : STATUS.warn }} />}
                </button>
              })}
            </div>
          </div>
        ))}
        <p className="text-[11px] text-muted flex items-center gap-1"><AlertTriangle size={11} style={{ color: STATUS.warn }} /> = l'enfant porte une allergie connue.</p>
      </div>
    </Modal>
  )
}

// ── Parent : le menu de la semaine de son enfant, avec les alertes en clair ──
function ParentCanteen({ u }) {
  const kids = (u.childIds || []).map(studentById).filter(Boolean)
  const [pickedId, setPickedId] = useState(kids[0]?.id)
  const child = kids.find(k => k.id === pickedId) || kids[0]
  if (!child) return <Card><EmptyState icon="Users" title="Aucun enfant associé" /></Card>
  const week = weekForChild(child.id)
  const subscribed = week[0]?.subscribed

  return (<>
    <PageHead title={t('Cantine')} sub={`Le menu de la semaine de ${child.name.split(' ')[0]}.`}
      action={kids.length > 1 && <select value={child.id} onChange={e => setPickedId(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold">{kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</select>} />

    {!subscribed && <Card className="p-4 mb-4 text-sm text-muted">{child.name.split(' ')[0]} n'est pas inscrit(e) à la cantine. Voici tout de même le menu de la semaine.</Card>}

    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {week.map(day => (
        <Card key={day.key} className="p-4" style={day.risks.length ? { borderColor: STATUS.warn + '55' } : {}}>
          <h3 className="font-bold mb-2">{day.label}</h3>
          {day.dishes.length === 0 ? <div className="text-sm text-muted">Menu à venir.</div>
            : <div className="space-y-1 text-sm">{day.dishes.map((dish, i) => <div key={i} className="flex items-center gap-2"><UtensilsCrossed size={13} className="text-muted" />{dish.name}</div>)}</div>}
          {day.risks.length > 0 && (
            <div className="mt-3 pt-3 border-t rounded-b-xl -mx-4 -mb-4 px-4 py-2.5" style={{ background: STATUS.warn + '12', borderColor: STATUS.warn + '30' }}>
              <div className="flex items-start gap-1.5 text-[13px] font-semibold" style={{ color: STATUS.warn }}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>Attention : {day.risks.map(r => `${r.label} (${r.dish})`).join(', ')}. L'école le sait.</span>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  </>)
}
