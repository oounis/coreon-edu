import { Sun, PlayCircle } from 'lucide-react'
import { Whale } from './ui.jsx'
import { schoolPhase } from '@core/livestatus.js'
import { isDemoLive, setDemoLive, rentreeDate, rentreeLabel } from '@core/clock.js'
// La rentrée est calculée dans le cœur (partagée avec Android) — on ré-exporte
// pour ne pas casser les imports existants.
export { rentreeDate, rentreeLabel } from '@core/clock.js'

export const isSummer = () => schoolPhase() === 'vacances'

// Bouton « démarrer la démo » : force l'app en journée de classe (voir clock.js).
export function DemoLiveButton({ className = '' }) {
  if (isDemoLive()) return null
  return (
    <button
      onClick={() => { setDemoLive(true); location.reload() }}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${className}`}
      style={{ background: '#EEF2FF', color: '#4F46E5' }}
      title="Simule une journée de classe pour découvrir le produit hors période scolaire">
      <PlayCircle size={13} /> Voir en mode journée de classe
    </button>
  )
}

// Chip d'ambiance (topbar) — l'école est en vacances, tout le produit le sait.
export function SummerChip() {
  if (isDemoLive()) return (
    <div className="hidden xl:flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-2xl select-none"
      style={{ background: 'linear-gradient(135deg,#E0E7FF,#C7D2FE)' }} title="Mode démonstration : l'application simule une journée de classe">
      <PlayCircle size={16} style={{ color: '#4338CA' }} />
      <div className="leading-none">
        <div className="text-xs font-extrabold" style={{ color: '#3730A3' }}>Mode démonstration</div>
        <button onClick={() => { setDemoLive(false); location.reload() }} className="text-[11px] font-semibold underline" style={{ color: '#4338CA' }}>revenir au réel</button>
      </div>
    </div>
  )
  if (!isSummer()) return null
  return (
    <div className="hidden xl:flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-2xl select-none"
      style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)' }} title={`Vacances d'été — reprise le ${rentreeLabel()}`}>
      <Sun size={16} style={{ color: '#B45309' }} />
      <div className="leading-none">
        <div className="text-xs font-extrabold" style={{ color: '#92400E' }}>Vacances d'été</div>
        <div className="text-[11px] font-semibold" style={{ color: '#B45309' }}>reprise le 15 sept.</div>
      </div>
    </div>
  )
}

// Gel estival d'une fonctionnalité : même honnêteté que le Suivi en direct.
// On propose systématiquement la sortie de secours « mode journée de classe ».
export function SummerFreeze({ feature, detail, children }) {
  return (
    <div className="card p-8 text-center relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle,#FDE68A66,transparent 70%)' }} />
      <div className="floaty mx-auto w-fit"><Whale size={52} from="#F59E0B" to="#FB7185" /></div>
      <div className="inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1 rounded-full mt-2" style={{ background: '#FEF3C7', color: '#92400E' }}>
        <Sun size={12} /> VACANCES D'ÉTÉ</div>
      <h2 className="text-xl font-extrabold mt-2">{feature} reprend à la rentrée</h2>
      <p className="text-sm text-muted mt-1 max-w-md mx-auto">{detail} Rendez-vous le <b>{rentreeLabel()}</b> — d'ici là, profitez de l'été !</p>
      <div className="mt-4 flex justify-center gap-2 flex-wrap items-center">
        <DemoLiveButton />
        {children}
      </div>
    </div>
  )
}
