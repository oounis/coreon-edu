// BULLETIN DE PAIE (CR-028) — le détail d'une paie, imprimable.
// Un salaire n'est pas un nombre : c'est des gains (base + indemnités + prime)
// moins des retenues. Le bulletin montre chaque ligne — comme l'exige la loi
// dans la plupart des pays (le Golfe l'impose). Même patron d'impression que le
// bulletin scolaire (Bulletin.jsx).
import { settings } from '@core/db.js'
import { t } from '@core/i18n.js'
import { currency, money } from '@core/currency.js'
import { EARNINGS, CONTRACTS, monthLabel } from '@core/hr.js'
import { Btn, Avatar, STATUS } from './ui.jsx'
import { Dialog } from '@headlessui/react'
import { X, Printer, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { df } from '../datefns.js'

// audit FAT 2026-07-26 : money() du cœur — les millièmes du BHD comptent

export default function Payslip({ line, month, stage, validatedBy, onClose }) {
  if (!line) return null
  const sc = settings()
  const e = line.earnings || { base: line.gross || 0, housing: 0, transport: 0 }
  const gains = [
    [EARNINGS.base.label, e.base],
    [EARNINGS.housing.label, e.housing],
    [EARNINGS.transport.label, e.transport],
    ...(line.bonus ? [['Prime', line.bonus]] : []),
  ].filter(([, v]) => v)
  const gross = (line.gross || 0) + (line.bonus || 0)
  const validated = stage === 'valide' || stage === 'paye'

  return (
    <Dialog open={!!line} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm print:hidden" aria-hidden="true" />
      <div className="fixed inset-0 grid place-items-start sm:place-items-center p-0 sm:p-4 overflow-y-auto print:p-0 print:static print:overflow-visible">
        <Dialog.Panel className="bg-white w-full max-w-xl sm:rounded-2xl pop my-0 sm:my-4 print:max-w-none print:my-0 print:shadow-none">
          <div className="flex items-center justify-between p-4 border-b border-line print:hidden">
            <Dialog.Title className="text-lg font-bold">{t('Bulletin de paie')}</Dialog.Title>
            <div className="flex items-center gap-2">
              <Btn onClick={() => window.print()}><Printer size={16} /> {t('Imprimer')}</Btn>
              <button onClick={onClose} className="text-muted hover:text-ink" aria-label={t('Fermer')}><X size={18} /></button>
            </div>
          </div>

          <div id="bulletin-print" className="p-6 sm:p-8">
            {/* en-tête établissement */}
            <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4 mb-5">
              <div>
                <div className="text-2xl font-extrabold">{sc.schoolName}</div>
                <div className="text-sm text-muted">{sc.city}{sc.city && ' · '}{t('Bulletin de paie')}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-muted font-bold">{monthLabel(month)}</div>
                <div className="text-sm text-muted mt-1">{t('Édité le')} {format(new Date(), 'dd MMMM yyyy', { locale: df() })}</div>
              </div>
            </div>

            {/* identité employé */}
            <div className="flex items-center gap-4 mb-6">
              <Avatar name={line.name} seed={line.staffId} size={48} />
              <div className="flex-1">
                <div className="text-xl font-extrabold">{line.name}</div>
                <div className="text-sm text-muted">
                  {line.role}{line.contract && ` · ${CONTRACTS[line.contract]?.label || line.contract}`}
                </div>
              </div>
              {!validated && (
                <span className="text-[11px] font-bold px-2 py-1 rounded" style={{ background: STATUS.warnSoft, color: STATUS.warn }}>
                  {t('BROUILLON')}
                </span>
              )}
            </div>

            {/* gains */}
            <table className="w-full text-sm mb-5">
              <thead>
                <tr className="text-left text-xs font-bold text-muted border-b border-line">
                  <th className="py-2">{t('Gains')}</th><th className="py-2 text-right">{t('Montant')}</th>
                </tr>
              </thead>
              <tbody>
                {gains.map(([label, v]) => (
                  <tr key={label} className="border-b border-line/60">
                    <td className="py-2">{label}</td>
                    <td className="py-2 text-right tabular-nums">{money(v)}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2">{t('Total brut')}</td>
                  <td className="py-2 text-right tabular-nums">{money(gross)}</td>
                </tr>
              </tbody>
            </table>

            {/* retenues */}
            <table className="w-full text-sm mb-5">
              <thead>
                <tr className="text-left text-xs font-bold text-muted border-b border-line">
                  <th className="py-2">{t('Retenues')}</th><th className="py-2 text-right">{t('Montant')}</th>
                </tr>
              </thead>
              <tbody>
                {line.deduction
                  ? <tr className="border-b border-line/60">
                      <td className="py-2">{t('Absences sans solde (')}{line.unpaidDays} {t('j)')}</td>
                      <td className="py-2 text-right tabular-nums" style={{ color: STATUS.danger }}>− {money(line.deduction)}</td>
                    </tr>
                  : <tr><td className="py-2 text-muted" colSpan={2}>{t('Aucune retenue ce mois.')}</td></tr>}
              </tbody>
            </table>

            {/* net */}
            <div className="flex items-center justify-between rounded-xl px-5 py-4 mb-5"
              style={{ background: STATUS.okSoft }}>
              <span className="font-bold">{t('Net à payer')}</span>
              <span className="text-2xl font-extrabold tabular-nums" style={{ color: STATUS.ok }}>{money(line.net)}</span>
            </div>

            {/* pied : traçabilité (maker-checker) */}
            <div className="text-[11px] text-muted border-t border-line pt-3 flex items-center gap-2">
              <Lock size={12} />
              {validated
                ? <span>{t('Paie validée')}{validatedBy ? ` par ${validatedBy}` : ''} {t('· un bulletin validé ne se modifie plus.')}</span>
                : <span>{t('Brouillon — non validé. La validation revient à une autre personne que le préparateur (séparation des tâches).')}</span>}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
