// Le coin des fêtes — il remplace l'horloge à côté de la météo.
// Un férié aujourd'hui → on le dit. Une journée mondiale → on la célèbre.
// Un jour ordinaire → le prochain congé et dans combien de jours.
// Un clic ouvre l'agenda des fêtes à venir (règle produit : tout s'ouvre).
import { Menu } from '@headlessui/react'
import { format } from 'date-fns'
import { fr, arTN } from 'date-fns/locale'
import { todayIso, now as appNow } from '@core/clock.js'
import { feteOfDay, nextFerie, upcoming } from '@core/fetes.js'
import { t, locale } from '@core/i18n.js'
import { ChevronDown } from 'lucide-react'

// Le calendrier suit la langue : dates en arabe (ar-TN) en mode AR.
const dfLocale = () => (locale() === 'ar' ? arTN : fr)
const inLabel = n => n === 0 ? t("aujourd'hui") : n === 1 ? t('demain') : `${t('dans')} ${n} ${t('j')}`

export default function FeteCorner() {
  const today = todayIso()
  const fete = feteOfDay(today)
  const next = nextFerie(today)
  const agenda = upcoming(today, 6)
  const head = fete || (next && { ...next, kind: 'prochain' })
  if (!head) return null

  return (
    <Menu as="div" className="relative hidden md:block">
      <Menu.Button className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-2xl hover:shadow transition text-left"
        title={t('Fêtes et journées à venir')}
        style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, #fff), color-mix(in srgb, var(--accent-2, var(--accent)) 26%, #fff))' }}>
        <span className="text-[22px] leading-none" aria-hidden="true">{head.e}</span>
        <div className="leading-none min-w-0">
          <div className="font-extrabold text-[13px] accent-text truncate max-w-[180px]">
            {t(head.label)}
          </div>
          <div className="text-[11px] font-semibold text-muted mt-0.5">
            {head.kind === 'ferie' ? `${t('jour férié')} · ${t("aujourd'hui")}`
              : head.kind === 'journee' ? t("aujourd'hui")
              : `${t('prochain congé')} · ${inLabel(head.inDays)}`}
          </div>
        </div>
        <ChevronDown size={13} className="text-muted shrink-0" />
      </Menu.Button>

      <Menu.Items className="absolute right-0 mt-2 w-72 card p-0 shadow-2xl z-50 overflow-hidden focus:outline-none">
        <div className="p-5 text-center"
          style={{ background: 'linear-gradient(160deg, color-mix(in srgb, var(--accent) 14%, #fff), color-mix(in srgb, var(--accent-2, var(--accent)) 28%, #fff))' }}>
          <div className="text-4xl" aria-hidden="true">{head.e}</div>
          <div className="text-sm font-extrabold mt-1">{t(head.label)}</div>
          <div className="text-xs text-muted mt-0.5 capitalize">
            {head.kind === 'prochain'
              ? `${format(new Date(head.d), 'EEEE d MMMM', { locale: dfLocale() })} · ${inLabel(head.inDays)}`
              : format(appNow(), 'EEEE d MMMM yyyy', { locale: dfLocale() })}
          </div>
        </div>
        <div className="p-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted px-2 mb-1">{t('À venir')}</div>
          {agenda.map(x => (
            <div key={x.kind + x.d + x.label} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-canvas">
              <span className="text-lg" aria-hidden="true">{x.e}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold truncate">{t(x.label)}</span>
                <span className="block text-[11px] text-muted capitalize">
                  {format(new Date(x.d), 'EEE d MMM', { locale: dfLocale() })} · {inLabel(x.inDays)}{x.lune ? ` · ${t('selon la lune')}` : ''}
                </span></span>
              {x.kind === 'ferie' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full accent-soft accent-text shrink-0">{t('FÉRIÉ')}</span>}
            </div>))}
        </div>
      </Menu.Items>
    </Menu>
  )
}
