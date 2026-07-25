// Le sélecteur de langue. Des boutons, pas un menu : trois langues (FR · EN · ع),
// et un parent pressé ne cherche pas dans une liste déroulante.
// Changer de langue RECHARGE la page : c'est le seul moyen honnête de changer
// aussi la DIRECTION (dir) de tout l'écran d'un coup — et les données survivent.
import { LOCALES, locale, setLocale } from '@core/i18n.js'

export default function LangSwitch({ className = '' }) {
  const cur = locale()
  return (
    <div className={`inline-flex rounded-xl border border-line overflow-hidden bg-white ${className}`}
      role="group" aria-label="Langue / اللغة">
      {Object.values(LOCALES).map(l => (
        <button key={l.key} type="button" lang={l.key}
          onClick={() => { if (l.key !== cur) { setLocale(l.key); location.reload() } }}
          className={`px-2.5 py-1.5 text-xs font-bold transition ${l.key === cur ? 'accent-bg text-white' : 'text-muted hover:text-ink'}`}>
          {{ ar: 'ع', fr: 'FR', en: 'EN' }[l.key]}
        </button>
      ))}
    </div>
  )
}
