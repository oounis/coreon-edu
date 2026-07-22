// ════════════════════════════════════════════════════════════════════════════
// DOCUMENTS OFFICIELS — le guichet de l'administration.
// « Il me faut un certificat de scolarité pour la CNSS » : une minute, un
// numéro de série, une trace au registre. Le cœur (documents.js) tient les
// règles ; cet écran délivre et réimprime.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import jsPDF from 'jspdf'
import { current } from '@core/auth.js'
import { db, studentById, classById, settings } from '@core/db.js'
import { DOC_LIST, docTypeOf, issueDocument, registry, docSummary } from '@core/documents.js'
import { LEGAL } from '@core/tunisia.js'
import { PageHead, Card, Btn, Modal, Field, Input, Select, Avatar, EmptyState, SectionCard } from '../components/ui.jsx'
import { ScrollText, Download, Printer, Check } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

/* ---------- le contenu du document (partagé aperçu + PDF) ---------- */
function docModel(rec) {
  const sc = settings(), t = docTypeOf(rec.type)
  const s = studentById(rec.studentId)
  const cls = classById(rec.classId)
  const rows = [
    ['Nom & prénom', rec.studentName],
    ['Classe', cls ? `${cls.name} (${cls.grade || ''})` : '·'],
    ['Année scolaire', sc.year],
  ]
  const BODY = {
    scolarite: `est régulièrement inscrit(e) et suit ses études dans notre établissement. Le présent certificat est délivré pour servir et valoir ce que de droit${rec.addressedTo ? ` (${rec.addressedTo})` : ''}.`,
    inscription: `est inscrit(e) dans notre établissement pour l'année scolaire ${sc.year}. La présente attestation est délivrée pour servir et valoir ce que de droit${rec.addressedTo ? ` (${rec.addressedTo})` : ''}.`,
    presence: `fréquente régulièrement notre établissement. La présente attestation est délivrée${rec.addressedTo ? `, à l'attention de ${rec.addressedTo},` : ''} pour servir et valoir ce que de droit.`,
    radiation: `n'est plus inscrit(e) dans notre établissement${s?.archivedAt ? ` depuis le ${format(new Date(s.archivedAt), 'dd/MM/yyyy')}` : ''}. Son dossier scolaire reste archivé et disponible. Le présent certificat est délivré pour servir et valoir ce que de droit${rec.addressedTo ? ` (${rec.addressedTo})` : ''}.`,
  }
  return {
    title: t?.label || rec.type, ref: rec.number, today: format(new Date(rec.at), 'dd/MM/yyyy'),
    sc, rows, by: rec.by,
    intro: `La Direction de l'établissement ${sc.schoolName} ${rec.type === 'radiation' ? 'certifie' : 'certifie'} que l'élève :`,
    body: BODY[rec.type] || '',
  }
}

function PaperDoc({ rec }) {
  const m = docModel(rec)
  return (
    <div className="bg-white p-2 text-sm">
      <div className="flex items-center justify-between border-b-2 pb-3 mb-4" style={{ borderColor: '#7539E4' }}>
        <div><div className="font-extrabold">{m.sc.schoolName}</div><div className="text-xs text-muted">{m.sc.city}, Tunisie · Tél : {m.sc.phone}</div></div>
        <div className="text-xs text-right text-muted">N° : <b>{m.ref}</b><br />{m.sc.city}, le {m.today}</div>
      </div>
      <h2 className="text-center text-xl font-extrabold uppercase my-4">{m.title}</h2>
      <p className="leading-7">{m.intro}</p>
      <div className="my-3 pl-4 border-l-2" style={{ borderColor: '#EEF2FF' }}>
        {m.rows.map(([k, v]) => <div key={k}><b>{k} :</b> {v || '·'}</div>)}
      </div>
      <p className="leading-7">{m.body}</p>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="text-xs text-muted"><b>Délivré par :</b><div className="flex items-center gap-1 mt-1"><Check size={10} className="shrink-0" /> {m.by} · {m.today}</div></div>
        <div className="text-center"><div className="h-12" /><div className="border-t border-ink/30 pt-1 text-xs">Cachet & signature de la Direction</div></div>
      </div>
      <div className="text-[11px] text-muted mt-6 pt-2 border-t border-line">Document n° {m.ref}, inscrit au registre · généré par Coreon Edu, conforme à la {LEGAL.law} (INPDP).</div>
    </div>)
}

function downloadPDF(rec) {
  const m = docModel(rec); const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210; let y = 20
  doc.setDrawColor(108, 92, 231); doc.setLineWidth(0.8); doc.line(20, 28, W - 20, 28)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(m.sc.schoolName, 20, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120); doc.text(`${m.sc.city}, Tunisie · ${m.sc.phone}`, 20, y + 5)
  doc.text(`N° : ${m.ref}`, W - 20, y, { align: 'right' }); doc.text(`${m.sc.city}, le ${m.today}`, W - 20, y + 5, { align: 'right' })
  y = 44; doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(m.title.toUpperCase(), W / 2, y, { align: 'center' })
  y += 12; doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
  doc.text(doc.splitTextToSize(m.intro, W - 40), 20, y); y += 10
  doc.setFont('helvetica', 'bold'); m.rows.forEach(([k, v]) => { doc.text(`${k} : `, 24, y); const kw = doc.getTextWidth(`${k} : `); doc.setFont('helvetica', 'normal'); doc.text(String(v || '·'), 24 + kw, y); doc.setFont('helvetica', 'bold'); y += 7 })
  y += 4; doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(m.body, W - 40), 20, y); y += 26
  doc.setFontSize(9); doc.setTextColor(110); doc.text(`Délivré par : ${m.by} · ${m.today}`, 20, y)
  doc.text('Cachet & signature de la Direction', W - 20, y + 6, { align: 'right' })
  doc.setFontSize(7.5); doc.text(`Document n° ${m.ref}, inscrit au registre : généré par Coreon Edu, conforme à la ${LEGAL.law} (INPDP).`, 20, 285)
  doc.save(`${m.ref}_${rec.studentName.replace(/ /g, '_')}.pdf`)
  toast.success('PDF téléchargé')
}

export default function Documents() {
  const u = current(); const d = db()
  const [, force] = useState(0)
  const [type, setType] = useState('scolarite')
  const [sid, setSid] = useState('')
  const [addressedTo, setAddressedTo] = useState('')
  const [view, setView] = useState(null)         // le document ouvert (aperçu / réimpression)
  const t = docTypeOf(type)
  const pool = (d.students || []).filter(s => t?.needs === 'archived' ? s.archived : !s.archived)
  const sum = docSummary()

  const issue = () => {
    if (!sid) return toast.error("Choisissez l'élève")
    const r = issueDocument({ type, studentId: sid, addressedTo, by: u.name })
    if (r.error) return toast.error(r.error)
    toast.success(`${docTypeOf(type).label} n° ${r.doc.number} : inscrit au registre`)
    setAddressedTo(''); setView(r.doc); force(x => x + 1)
  }

  return (<>
    <PageHead title="Documents officiels" sub="Le guichet : certificats et attestations numérotés, chaque délivrance inscrite au registre." />

    <div className="grid lg:grid-cols-[1fr_380px] gap-4 mb-4">
      <Card className="p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Délivrer un document</div>
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          {DOC_LIST.map(x => (
            <button key={x.key} onClick={() => { setType(x.key); setSid('') }}
              className={`text-left rounded-xl border p-3 transition ${type === x.key ? 'border-transparent ring-2 ring-[var(--accent)] bg-white' : 'border-line hover:bg-canvas'}`}>
              <div className="text-sm font-bold">{x.label}</div>
              <div className="text-[12px] text-muted mt-0.5">{x.hint}</div>
            </button>))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3 items-end">
          <Field label={t?.needs === 'archived' ? 'Élève (dossiers archivés)' : 'Élève'}>
            <Select value={sid} onChange={e => setSid(e.target.value)}>
              <option value="">Choisir</option>
              {pool.map(s => <option key={s.id} value={s.id}>{s.name}{s.classId ? ` · ${classById(s.classId)?.name || ''}` : ''}</option>)}
            </Select>
          </Field>
          <Field label="À l'attention de (optionnel)" hint="CNSS, banque, employeur, nouvelle école…">
            <Input value={addressedTo} onChange={e => setAddressedTo(e.target.value)} placeholder="CNSS" />
          </Field>
        </div>
        {pool.length === 0 && <p className="text-[12px] text-muted mt-2">Aucun élève dans cet état{t?.needs === 'archived' ? 'la radiation ne concerne que les dossiers archivés' : ''}.</p>}
        <Btn className="mt-3" onClick={issue}><ScrollText size={15} /> Délivrer & inscrire au registre</Btn>
      </Card>

      <Card className="p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Le registre</div>
        <div className="text-3xl font-extrabold">{sum.thisMonth}<span className="text-sm font-semibold text-muted ml-2">ce mois-ci · {sum.total} au total</span></div>
        <p className="text-[12px] text-muted mt-2">Chaque document porte un numéro de série par type et par année. Le registre ne s'efface jamais : une série qui saute est une remarque d'audit.</p>
      </Card>
    </div>

    <SectionCard icon={<ScrollText size={16} />} tint="brand" title="Registre des documents délivrés" sub="Cliquez sur une ligne pour réimprimer" bodyClass="p-3">
      {registry().length === 0
        ? <EmptyState icon={<ScrollText size={24} />} title="Aucun document délivré" sub="Le premier certificat délivré ouvrira le registre." />
        : <div className="space-y-1">
          {registry().map(rec => (
            <button key={rec.id} onClick={() => setView(rec)} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas text-left">
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-canvas tabular-nums shrink-0">{rec.number}</span>
              <Avatar name={rec.studentName} seed={rec.studentId} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{rec.studentName}</span>
                <span className="block text-[12px] text-muted">{docTypeOf(rec.type)?.label}{rec.addressedTo ? ` · ${rec.addressedTo}` : ''}</span></span>
              <span className="text-[12px] text-muted shrink-0">{format(new Date(rec.at), 'd MMM yyyy', { locale: fr })} · {rec.by}</span>
            </button>))}
        </div>}
    </SectionCard>

    <Modal open={!!view} onClose={() => setView(null)} title={view ? `Document ${view.number}` : ''} size="xl"
      footer={<><Btn variant="ghost" onClick={() => setView(null)}>Fermer</Btn>
        <Btn variant="soft" onClick={() => window.print()}><Printer size={15} /> Imprimer</Btn>
        <Btn onClick={() => downloadPDF(view)}><Download size={15} /> Télécharger PDF</Btn></>}>
      {view && <PaperDoc rec={view} />}
    </Modal>
  </>)
}
