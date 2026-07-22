// INTEROPÉRABILITÉ — OneRoster v1.2.
// « Est-ce que ça s'intègre ? » est une QUESTION D'ACHAT dans toute école
// internationale. Ici, la réponse est un fichier, pas une promesse.
import { useState } from 'react'
import { summary, exportCsv } from '@core/oneroster.js'
import { PageHead, Card, Btn, STATUS } from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import toast from 'react-hot-toast'

const ENTITIES = [
  { key: 'orgs',             label: 'Orgs',              what: 'L’établissement' },
  { key: 'academicSessions', label: 'Academic Sessions', what: 'L’année et ses trimestres' },
  { key: 'courses',          label: 'Courses',           what: 'Ce qui est enseigné' },
  { key: 'classes',          label: 'Classes',           what: 'Le groupe qui l’apprend' },
  { key: 'users',            label: 'Users',             what: 'Élèves, enseignants, parents' },
  { key: 'enrollments',      label: 'Enrollments',       what: 'Qui suit quoi, depuis quand' },
  { key: 'results',          label: 'Results',           what: 'Les notes (Gradebook)' },
]

export default function Interop() {
  const [busy, setBusy] = useState(false)
  const s = summary()

  const download = () => {
    setBusy(true)
    const files = exportCsv()
    // Un fichier par entité — c'est ce qu'exige la liaison CSV de OneRoster.
    for (const [name, content] of Object.entries(files)) {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.click()
      URL.revokeObjectURL(a.href)
    }
    setBusy(false)
    toast.success(`${Object.keys(files).length} fichiers exportés.`)
  }

  return (
    <>
      <PageHead title="Interopérabilité" sub="OneRoster v1.2 : Coreon Edu parle la norme du secteur." />

      <Card className="p-5 mb-4" style={{ background: STATUS.infoSoft }}>
        <div className="flex items-start gap-3">
          <Ic n="Plug" size={18} style={{ color: STATUS.info }} />
          <div className="text-[13px]">
            <b>« Est-ce que ça s’intègre ? » est une question d’achat, pas une question technique.</b>
            <div className="mt-1">
              Toute école internationale a déjà un LMS, un annuaire, parfois un système
              ministériel. OneRoster est la norme qui les relie. Coreon Edu l’exporte : donc la réponse est un fichier, pas une promesse.
            </div>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {ENTITIES.map(e => (
          <Card key={e.key} className="p-4">
            <div className="text-xs font-bold text-muted">{e.label}</div>
            <div className="text-2xl font-extrabold mt-0.5 tabular-nums">{s[e.key]}</div>
            <div className="text-[11px] text-muted mt-0.5">{e.what}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="text-sm font-bold mb-1">Ce que l’export contient</div>
        <p className="text-[13px] text-muted mb-4">
          Huit fichiers CSV conformes à la liaison CSV de OneRoster v1.2, avec leur
          <b> manifest</b>. Les identifiants (<code>sourcedId</code>) sont ASCII et stables :
          un consommateur (Clever, Wonde, un LMS) peut les réimporter tels quels.
        </p>
        <Btn onClick={download} disabled={busy}>
          <Ic n="Download" size={15} /> Exporter en OneRoster v1.2 (CSV)
        </Btn>
      </Card>

      <Card className="p-5 mt-4">
        <div className="text-sm font-bold mb-2">Ce que la norme nous a obligés à corriger</div>
        <ul className="text-[13px] text-muted grid gap-1.5">
          <li>
            <b className="text-ink">Un cours n’est pas une classe.</b> « Mathématiques : 5ème année »
            est ce qui est <i>enseigné</i> ; « 5ème A » est le groupe qui l’<i>apprend</i>.
            Nous confondions les deux.
          </li>
          <li>
            <b className="text-ink">Une inscription est une entité.</b> Un élève portait un
            <code> classId</code> posé sur lui : impossible de dire « il a quitté ce cours en
            janvier ». Désormais l’inscription a un rôle et des dates.
          </li>
          <li>
            <b className="text-ink">On n’invente rien pour remplir la norme.</b> Une crèche n’a pas
            de cours de mathématiques, et un enfant de trois ans n’a pas de note. Ces lignes
            ne sont pas exportées : un mensonge dans un standard reste un mensonge.
          </li>
        </ul>
      </Card>
    </>
  )
}
