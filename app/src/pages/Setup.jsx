// ════════════════════════════════════════════════════════════════════════════
// LA PREMIÈRE QUESTION — « quelle école êtes-vous ? »
//
// Idée d'Othman, et elle est juste : le choix du niveau n'est pas un réglage
// caché dans les paramètres. C'est LA question fondatrice, et elle décide de
// tout le reste — les modules, le menu, le vocabulaire, les écrans.
//
// Une crèche qui découvre le produit ne doit pas voir « Emploi du temps »,
// « Examens » et « Bibliothèque » et se dire « ce n'est pas pour moi ».
// Une école primaire ne doit pas voir un suivi des siestes.
//
// C'est aussi ce qui rend le produit COMPRÉHENSIBLE en trente secondes : le
// client se reconnaît dès le premier écran. Et c'est notre argument commercial
// rendu visible — nous sommes le seul produit qui répond « les deux ».
//
// Ce que cet écran écrit : settings.levels → core/src/levels.js → tout le reste.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { settings, saveSettings } from '@core/db.js'
import { LEVELS, EARLY_YEARS, PRIMARY } from '@core/levels.js'
import { Card, Btn, Input, Field } from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import toast from 'react-hot-toast'

const SHAPES = [
  {
    key: 'early', label: 'Crèche & maternelle', icon: 'Baby',
    sub: 'De la crèche à la maternelle 2',
    lead: 'Journal du jour, siestes, repas, jalons de développement.',
    levels: EARLY_YEARS,
  },
  {
    key: 'primary', label: 'École primaire', icon: 'GraduationCap',
    sub: 'De la 1ère à la 6ème année',
    lead: 'Emploi du temps, devoirs, examens, bulletins.',
    levels: PRIMARY,
  },
  {
    key: 'both', label: 'Les deux', icon: 'Layers', best: true,
    sub: 'De la crèche à la 6ème année',
    lead: 'Un seul outil, un seul compte parent : même pour une famille qui a un petit et un grand.',
    levels: [...EARLY_YEARS, ...PRIMARY],
  },
]

export default function Setup() {
  const nav = useNavigate()
  const s = settings()
  const [shape, setShape] = useState(null)
  const [levels, setLevels] = useState([])
  const [name, setName] = useState(s?.schoolName || '')

  const pick = sh => { setShape(sh.key); setLevels(sh.levels) }
  const toggle = k => setLevels(l => l.includes(k) ? l.filter(x => x !== k) : [...l, k])

  const finish = () => {
    if (!name.trim()) return toast.error('Le nom de l’école est requis.')
    if (!levels.length) return toast.error('Choisissez au moins un niveau.')
    saveSettings({ ...settings(), schoolName: name.trim(), levels })
    toast.success('C’est prêt. Coreon Edu s’est adapté à votre école.')
    nav('/app')
  }

  return (
    <div className="min-h-screen bg-canvas grid place-items-center p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold">Bienvenue dans Coreon Edu.</h1>
          <p className="text-muted mt-2 max-w-xl mx-auto">
            Une seule question, et l’application se règle sur votre école : vous ne verrez
            que ce qui vous concerne.
          </p>
        </div>

        <Field label="Nom de l’établissement">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="École Al-Nour" />
        </Field>

        <div className="text-sm font-bold mt-6 mb-3">Quels niveaux accueillez-vous ?</div>
        <div className="grid sm:grid-cols-3 gap-3">
          {SHAPES.map(sh => {
            const on = shape === sh.key
            return (
              <button key={sh.key} onClick={() => pick(sh)}
                className={`text-left rounded-2xl border-2 p-5 transition relative
                  ${on ? 'accent-ring' : 'border-line bg-white hover:border-ink/20'}`}
                style={on ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}}>
                {sh.best && (
                  <span className="absolute -top-2.5 right-3 text-[10px] font-extrabold uppercase tracking-wider
                    px-2 py-0.5 rounded-full text-white accent-bg">Le plus courant</span>
                )}
                <span className="w-11 h-11 rounded-xl grid place-items-center accent-soft accent-text mb-3">
                  <Ic n={sh.icon} size={22} />
                </span>
                <div className="font-extrabold">{sh.label}</div>
                <div className="text-xs text-muted font-semibold">{sh.sub}</div>
                <p className="text-[13px] text-muted mt-2">{sh.lead}</p>
              </button>
            )
          })}
        </div>

        {/* Le réglage fin. La plupart des écoles n'y toucheront jamais — et c'est
            très bien : un bon réglage par défaut vaut mieux qu'une question de plus. */}
        {shape && (
          <Card className="p-5 mt-5">
            <div className="text-sm font-bold mb-1">Affiner, si besoin</div>
            <p className="text-xs text-muted mb-3">
              Décochez un niveau que vous n’accueillez pas. Vous pourrez le changer plus tard.
            </p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map(l => {
                const on = levels.includes(l.key)
                return (
                  <button key={l.key} onClick={() => toggle(l.key)}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-bold border transition
                      ${on ? 'text-white border-transparent accent-bg' : 'bg-white border-line text-muted'}`}>
                    {on && <Ic n="Check" size={13} className="inline mr-1 align-[-2px]" />}
                    {l.label}
                  </button>
                )
              })}
            </div>
          </Card>
        )}

        <div className="flex justify-end mt-6">
          <Btn size="lg" onClick={finish} disabled={!shape || !name.trim()}>
            Commencer <Ic n="ArrowRight" size={16} />
          </Btn>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          Coreon Edu : par Kogia Group
        </p>
      </div>
    </div>
  )
}
