import { useState } from 'react'
import { Link } from 'react-router-dom'
import { current } from '@core/auth.js'
import { settings, saveSettings, resetDb, DEFAULT_SETTINGS } from '@core/db.js'
import { PageHead, Card, Btn, Field, Input, Select, Modal } from '../components/ui.jsx'
import { setItem } from '@core/storage.js'
import { LEVELS, EARLY_YEARS, PRIMARY } from '@core/levels.js'
import { OPTIONAL_MODULES, moduleActive, setModuleOverrides } from '@core/features.js'
import { setCurrency } from '@core/currency.js'
import { t } from '@core/i18n.js'
import { N, SERIES, BRAND } from '@core/tokens.js'
import { Building2, Layers, Boxes, Globe, Palette, Database, Save, Check, Download, ShieldCheck, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const BRANDS = [BRAND.indigo, ...SERIES, BRAND.violet]
const CURRENCIES = [
  ['DT', 'Dinar tunisien'], ['BHD', 'Dinar bahreïni'], ['MAD', 'Dirham marocain'], ['DZD', 'Dinar algérien'],
  ['SAR', 'Riyal saoudien'], ['QAR', 'Riyal qatari'], ['KWD', 'Dinar koweïtien'], ['AED', 'Dirham émirati'],
  ['LYD', 'Dinar libyen'], ['EUR', 'Euro'], ['USD', 'Dollar US'],
]
const MOD_META = {
  homework:  { label: 'Devoirs', desc: 'Cahier de textes : devoirs par classe, visibles des parents.' },
  exams:     { label: 'Examens', desc: 'Calendrier des examens et des compositions.' },
  library:   { label: 'Bibliothèque', desc: 'Catalogue et prêts d’ouvrages.' },
  transport: { label: 'Transport', desc: 'Lignes, arrêts et ramassage scolaire.' },
}
const CORE_MODULES = ['Évaluation', 'Présence', 'Journal', 'Comptabilité', 'RH & Paie', 'Cantine', 'Moments', 'Comportement', 'Documents', 'Accidents', 'Inscriptions', 'Recrutement', 'Budget & rapports', 'Inventaire']
const TABS = [
  { k: 'etab', label: 'Établissement', icon: Building2 },
  { k: 'cycles', label: 'Cycles & niveaux', icon: Layers },
  { k: 'modules', label: 'Modules', icon: Boxes },
  { k: 'local', label: 'Localisation', icon: Globe },
  { k: 'brand', label: 'Marque', icon: Palette },
  { k: 'data', label: 'Données', icon: Database },
]

function Toggle({ on, onClick, label, desc }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className="flex items-center gap-3 w-full text-start p-3 rounded-xl border border-line hover:bg-canvas transition">
      <span className={`w-11 h-6 rounded-full p-0.5 shrink-0 transition ${on ? 'accent-bg' : 'bg-line'}`}>
        <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5 rtl:-translate-x-5' : ''}`} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {desc && <span className="block text-xs text-muted">{desc}</span>}
      </span>
    </button>
  )
}

export default function Settings() {
  const u = current()
  const orig = settings()
  const [f, setF] = useState({ ...orig, levels: [...(orig.levels || DEFAULT_SETTINGS.levels)], locale: orig.locale || 'fr' })
  const [mods, setMods] = useState(() => Object.fromEntries(OPTIONAL_MODULES.map(m => [m, moduleActive(m)])))
  const [tab, setTab] = useState('etab')
  const [saved, setSaved] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setSaved(false) }

  const toggleLevel = key => {
    setSaved(false)
    setF(p => {
      const has = p.levels.includes(key)
      const next = has ? p.levels.filter(k => k !== key) : [...p.levels, key]
      const ordered = LEVELS.filter(l => next.includes(l.key)).map(l => l.key)
      return { ...p, levels: ordered }
    })
  }
  const toggleMod = m => { setMods(p => ({ ...p, [m]: !p[m] })); setSaved(false) }

  const isDemo = orig.schoolName === DEFAULT_SETTINGS.schoolName

  const save = () => {
    if (!f.schoolName.trim()) return toast.error(t('Le nom de l’école est requis.'))
    if (!f.levels.length) return toast.error(t('Une école accueille au moins un niveau.'))
    const levelsChanged = JSON.stringify(f.levels) !== JSON.stringify(orig.levels || DEFAULT_SETTINGS.levels)
    const modsChanged = OPTIONAL_MODULES.some(m => mods[m] !== moduleActive(m))
    setCurrency(f.currency)
    saveSettings({ ...f })
    const overrides = Object.fromEntries(OPTIONAL_MODULES.map(m => [m, mods[m]]))
    setItem('coreon_modules', JSON.stringify(overrides))
    setModuleOverrides(overrides)
    setSaved(true)
    if (levelsChanged || modsChanged) {
      toast.success(t('Paramètres enregistrés : la navigation se recharge.'))
      setTimeout(() => location.reload(), 750)
    } else {
      toast.success(t('Paramètres enregistrés : appliqués partout.'))
    }
  }

  const doReset = () => { resetDb(); location.reload() }

  const activeMods = OPTIONAL_MODULES.filter(m => mods[m]).length
  const money = n => `${n.toLocaleString('fr-FR')} ${f.currency || 'DT'}`

  return (<>
    <PageHead title={t('Paramètres de l’école')} sub={t('Configurez votre établissement : appliqué partout dans l’application.')}
      action={<Btn onClick={save}>{saved ? <><Check size={16} /> {t('Enregistré')}</> : <><Save size={16} /> {t('Enregistrer')}</>}</Btn>} />

    <div className="flex gap-1 overflow-x-auto scroll-thin -mx-1 px-1 mb-5">
      {TABS.map(tb => {
        const Ic = tb.icon; const on = tab === tb.k
        return (
          <button key={tb.k} onClick={() => setTab(tb.k)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${on ? 'accent-soft accent-text' : 'text-muted hover:bg-canvas'}`}>
            <Ic size={16} /> {t(tb.label)}
          </button>
        )
      })}
    </div>

    <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
      <div className="space-y-5">

        {tab === 'etab' && (
          <Card className="p-6">
            <h3 className="font-bold flex items-center gap-2 mb-4"><Building2 size={18} className="accent-text" /> {t('Identité de l’établissement')}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t('Nom de l’école *')}><Input value={f.schoolName} onChange={e => set('schoolName', e.target.value)} placeholder="École Al-Nour" /></Field>
              <Field label={t('Nom court (sidebar)')}><Input value={f.shortName} onChange={e => set('shortName', e.target.value)} placeholder="Al-Nour" /></Field>
              <Field label={t('Ville')}><Input value={f.city} onChange={e => set('city', e.target.value)} /></Field>
              <Field label={t('Année scolaire')}><Input value={f.year} onChange={e => set('year', e.target.value)} placeholder="2025–2026" /></Field>
              <Field label={t('Directeur / directrice')}><Input value={f.director} onChange={e => set('director', e.target.value)} /></Field>
              <Field label={t('Initiales du logo')}><Input value={f.logoText} onChange={e => set('logoText', e.target.value.slice(0, 3).toUpperCase())} maxLength={3} placeholder="AN" /></Field>
            </div>
            <div className="text-xs font-bold uppercase tracking-wide accent-text mt-5 mb-2">{t('Coordonnées')}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t('Téléphone')}><Input value={f.phone} onChange={e => set('phone', e.target.value)} /></Field>
              <Field label={t('E-mail')}><Input value={f.email} onChange={e => set('email', e.target.value)} /></Field>
              <div className="sm:col-span-2"><Field label={t('Adresse')}><Input value={f.address} onChange={e => set('address', e.target.value)} /></Field></div>
            </div>
          </Card>
        )}

        {tab === 'cycles' && (
          <Card className="p-6">
            <h3 className="font-bold flex items-center gap-2 mb-1"><Layers size={18} className="accent-text" /> {t('Cycles & niveaux accueillis')}</h3>
            <p className="text-sm text-muted mb-4">{t('Cochez les niveaux que votre école accueille. Une crèche ne verra jamais les écrans du primaire.')}</p>
            {[[t('Petite enfance'), EARLY_YEARS], [t('Primaire'), PRIMARY]].map(([grp, keys]) => (
              <div key={grp} className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">{grp}</div>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.filter(l => keys.includes(l.key)).map(l => {
                    const on = f.levels.includes(l.key)
                    return (
                      <button key={l.key} onClick={() => toggleLevel(l.key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition ${on ? 'accent-soft accent-text border-transparent' : 'border-line text-muted hover:bg-canvas'}`}>
                        <span className={`w-4 h-4 rounded grid place-items-center ${on ? 'accent-bg' : 'border border-line'}`}>{on && <Check size={11} className="text-white" />}</span>
                        {t(l.label)}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted mt-1">{f.levels.length} {t('niveau(x) actif(s). L’enregistrement recharge la navigation.')}</p>
          </Card>
        )}

        {tab === 'modules' && (
          <>
            <Card className="p-6">
              <h3 className="font-bold flex items-center gap-2 mb-1"><Boxes size={18} className="accent-text" /> {t('Modules optionnels')}</h3>
              <p className="text-sm text-muted mb-4">{t('Activez ce dont votre école a besoin. Ces modules existent, testés : vous les allumez d’un clic.')}</p>
              <div className="space-y-2">
                {OPTIONAL_MODULES.map(m => (
                  <Toggle key={m} on={mods[m]} onClick={() => toggleMod(m)} label={t(MOD_META[m].label)} desc={t(MOD_META[m].desc)} />
                ))}
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-xs font-bold uppercase tracking-wide accent-text mb-2 flex items-center gap-2"><ShieldCheck size={14} /> {t('Le cœur · toujours actif')}</div>
              <p className="text-sm text-muted mb-3">{t('Ce qui fait vivre l’école tous les jours ne se désactive pas.')}</p>
              <div className="flex flex-wrap gap-1.5">
                {CORE_MODULES.map(c => <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-full accent-soft accent-text">{t(c)}</span>)}
              </div>
            </Card>
          </>
        )}

        {tab === 'local' && (
          <Card className="p-6">
            <h3 className="font-bold flex items-center gap-2 mb-4"><Globe size={18} className="accent-text" /> {t('Localisation & finances')}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t('Devise')} hint={t('Utilisée pour tous les montants (frais, paie, budget).')}>
                <Select value={f.currency || 'DT'} onChange={e => set('currency', e.target.value)}>
                  {CURRENCIES.map(([code, name]) => <option key={code} value={code}>{code} · {t(name)}</option>)}
                </Select>
              </Field>
              <Field label={t('Langue par défaut')} hint={t('La langue d’un nouvel appareil. Chacun peut la changer.')}>
                <Select value={f.locale || 'fr'} onChange={e => set('locale', e.target.value)}>
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                </Select>
              </Field>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-canvas text-sm text-muted">
              {t('Exemple de montant')} : <b className="text-ink">{money(2400)}</b> <b className="text-ink">{money(150)}</b>
            </div>
          </Card>
        )}

        {tab === 'brand' && (
          <Card className="p-6">
            <h3 className="font-bold flex items-center gap-2 mb-1"><Palette size={18} className="accent-text" /> {t('Marque & couleur')}</h3>
            <p className="text-sm text-muted mb-4">{t('Chaque teinte est validée pour l’accessibilité. Utilisée sur la page publique et les documents.')}</p>
            <div className="flex flex-wrap gap-2.5">
              {BRANDS.map(c => (
                <button key={c} onClick={() => set('brand', c)} className="w-10 h-10 rounded-xl grid place-items-center transition hover:scale-105"
                  style={{ background: c, boxShadow: f.brand === c ? `0 0 0 3px ${N.surface}, 0 0 0 5px ${c}` : 'none' }}>
                  {f.brand === c && <Check size={18} className="text-white" />}
                </button>
              ))}
            </div>
          </Card>
        )}

        {tab === 'data' && (
          <>
            <Card className="p-6">
              <h3 className="font-bold flex items-center gap-2 mb-1"><Database size={18} className="accent-text" /> {t('Vos données vous appartiennent')}</h3>
              <p className="text-sm text-muted mb-4">{t('Exportez toute votre école au standard OneRoster v1.2 : un clic, aucun verrou. Vous pouvez partir quand vous voulez.')}</p>
              <Link to="/app/interop"><Btn variant="soft"><Download size={16} /> {t('Exporter (OneRoster v1.2)')}</Btn></Link>
            </Card>
            {isDemo && (
              <Card className="p-6">
                <div className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-2 text-coral"><AlertTriangle size={14} /> {t('Données de démonstration')}</div>
                <p className="text-sm text-muted mb-3">{t('Cette base est la démo. Vous pouvez la remettre à zéro pour repartir d’une école propre.')}</p>
                <Btn variant="danger" onClick={() => setResetOpen(true)}>{t('Réinitialiser la démonstration')}</Btn>
              </Card>
            )}
          </>
        )}
      </div>

      <div className="lg:sticky lg:top-20">
        <div className="text-xs font-bold uppercase text-muted mb-2">{t('Aperçu')}</div>
        <Card className="p-4">
          <div className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg,${f.brand},${N.ink})` }}>
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl grid place-items-center font-extrabold bg-white/20">{f.logoText || '??'}</span>
              <div><div className="font-bold leading-tight">{f.schoolName || '·'}</div><div className="text-xs opacity-80">{f.city} · {f.year}</div></div>
            </div>
          </div>
          <div className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted">{t('Directeur')}</span><span className="font-medium">{f.director || '·'}</span></div>
            <div className="flex justify-between"><span className="text-muted">{t('Devise')}</span><span className="font-medium">{f.currency || 'DT'}</span></div>
            <div className="flex justify-between"><span className="text-muted">{t('Langue')}</span><span className="font-medium">{f.locale === 'ar' ? 'العربية' : 'Français'}</span></div>
            <div className="flex justify-between"><span className="text-muted">{t('Niveaux')}</span><span className="font-medium">{f.levels.length}</span></div>
            <div className="flex justify-between"><span className="text-muted">{t('Modules optionnels')}</span><span className="font-medium">{activeMods} / {OPTIONAL_MODULES.length}</span></div>
          </div>
        </Card>
      </div>
    </div>

    <Modal open={resetOpen} onClose={() => setResetOpen(false)} title={t('Réinitialiser la démonstration ?')}
      footer={<><Btn variant="ghost" onClick={() => setResetOpen(false)}>{t('Annuler')}</Btn><Btn variant="danger" onClick={doReset}>{t('Oui, réinitialiser')}</Btn></>}>
      <p className="text-sm text-muted">{t('Toutes les données locales de démonstration seront effacées et l’école sera régénérée. Sans effet sur une vraie école.')}</p>
    </Modal>
  </>)
}
