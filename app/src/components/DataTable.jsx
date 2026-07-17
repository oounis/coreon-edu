// ════════════════════════════════════════════════════════════════════════════
// DataTable — LA table d'ERP qui manquait au produit.
// Tri par colonne · recherche · filtres externes · pagination · colonnes
// affichables/masquables · export CSV · sélection multiple + actions groupées ·
// clic de ligne. Une seule table pour tout le produit : Élèves, Personnel,
// Finances, Admissions… — même mécanique, même langage.
//
// Contrat : columns = [{ key, label, render?(row), value?(row), width?, hide? }]
//  - `value` sert au tri, à la recherche et au CSV (défaut : row[key])
//  - `render` sert à l'affichage (défaut : la valeur)
//  - `hide: true` = colonne masquée par défaut (réactivable par l'utilisateur)
// ════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download, Columns3, Search, CheckSquare } from 'lucide-react'
import { EmptyState } from './ui.jsx'

const PAGE_SIZES = [15, 30, 60]

export default function DataTable({
  columns, rows, rowKey = r => r.id, onRow, searchPlaceholder = 'Rechercher…',
  csvName = 'export', bulkActions = [], empty = { title: 'Aucune ligne', sub: '' },
  initialSort = null, toolbar = null, pageSize: initialPageSize = 15,
}) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState(initialSort)            // { key, dir: 1|-1 }
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [hidden, setHidden] = useState(() => new Set(columns.filter(c => c.hide).map(c => c.key)))
  const [cols, setCols] = useState(false)
  const [selected, setSelected] = useState(() => new Set())

  const visible = columns.filter(c => !hidden.has(c.key))
  const valOf = (c, r) => c.value ? c.value(r) : r[c.key]

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    let out = rows
    if (query) out = rows.filter(r => columns.some(c => String(valOf(c, r) ?? '').toLowerCase().includes(query)))
    if (sort) {
      const c = columns.find(x => x.key === sort.key)
      if (c) out = [...out].sort((a, b) => {
        const va = valOf(c, a), vb = valOf(c, b)
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sort.dir
        return String(va ?? '').localeCompare(String(vb ?? ''), 'fr') * sort.dir
      })
    }
    return out
  }, [rows, q, sort, columns, hidden])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const cur = Math.min(page, pages - 1)
  const slice = filtered.slice(cur * pageSize, (cur + 1) * pageSize)

  const clickSort = key => setSort(s => s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 })

  const exportCSV = () => {
    const cs = columns.filter(c => !hidden.has(c.key))
    const lines = [cs.map(c => c.label)]
    filtered.forEach(r => lines.push(cs.map(c => valOf(c, r) ?? '')))
    const csv = lines.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `${csvName}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(a.href)
  }

  const toggleAll = () => setSelected(s => s.size === slice.length ? new Set() : new Set(slice.map(rowKey)))
  const toggle = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const hasBulk = bulkActions.length > 0

  return (
    <div className="card overflow-hidden">
      {/* barre d'outils */}
      <div className="flex items-center gap-2 p-3 border-b border-line flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(0) }} placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-sm accent-ring" />
        </div>
        {toolbar}
        <div className="ms-auto flex items-center gap-2">
          {selected.size > 0 && bulkActions.map(a => (
            <button key={a.label} onClick={() => { a.run([...selected]); setSelected(new Set()) }}
              className="inline-flex items-center gap-1.5 text-[13px] font-bold px-3 py-2 rounded-xl accent-soft accent-text">
              <CheckSquare size={14} /> {a.label} ({selected.size})
            </button>))}
          <div className="relative">
            <button onClick={() => setCols(v => !v)} title="Colonnes affichées"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border border-line bg-white hover:bg-canvas">
              <Columns3 size={14} /> Colonnes
            </button>
            {cols && <div className="absolute right-0 top-full mt-1 z-20 card p-2 w-52 shadow-xl">
              {columns.map(c => (
                <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-canvas text-sm cursor-pointer">
                  <input type="checkbox" checked={!hidden.has(c.key)}
                    onChange={() => setHidden(h => { const n = new Set(h); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n })} />
                  {c.label}
                </label>))}
            </div>}
          </div>
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border border-line bg-white hover:bg-canvas">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* la table */}
      {filtered.length === 0
        ? <EmptyState icon={<Search size={24} />} title={q ? 'Aucun résultat' : empty.title} sub={q ? `Rien ne correspond à « ${q} ».` : empty.sub} />
        : <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted bg-canvas select-none">
              {hasBulk && <th className="px-3 py-2.5 w-8">
                <input type="checkbox" aria-label="Tout sélectionner" checked={selected.size === slice.length && slice.length > 0} onChange={toggleAll} /></th>}
              {visible.map(c => (
                <th key={c.key} style={c.width ? { width: c.width } : {}}
                  className="px-3 py-2.5 font-semibold cursor-pointer hover:text-ink whitespace-nowrap" onClick={() => clickSort(c.key)}>
                  <span className="inline-flex items-center gap-1">{c.label}
                    {sort?.key === c.key && (sort.dir === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
                </th>))}
            </tr></thead>
            <tbody className="divide-y divide-line">
              {slice.map(r => {
                const id = rowKey(r)
                return (
                  <tr key={id} onClick={onRow ? () => onRow(r) : undefined}
                    className={onRow ? 'hover:bg-canvas cursor-pointer' : ''}>
                    {hasBulk && <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" aria-label="Sélectionner la ligne" checked={selected.has(id)} onChange={() => toggle(id)} /></td>}
                    {visible.map(c => (
                      <td key={c.key} className="px-3 py-2 whitespace-nowrap">{c.render ? c.render(r) : String(valOf(c, r) ?? '—')}</td>))}
                  </tr>)
              })}
            </tbody>
          </table>
        </div>}

      {/* pagination */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-line text-[13px] text-muted flex-wrap">
        <span>{filtered.length} ligne{filtered.length > 1 ? 's' : ''}{q && ` (filtrées sur ${rows.length})`}</span>
        <div className="flex items-center gap-2">
          <select aria-label="Lignes par page" value={pageSize} onChange={e => { setPageSize(+e.target.value); setPage(0) }}
            className="rounded-lg border border-line bg-white px-2 py-1 text-[12px]">
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button aria-label="Page précédente" disabled={cur === 0} onClick={() => setPage(p => p - 1)}
            className="w-7 h-7 grid place-items-center rounded-lg border border-line bg-white disabled:opacity-40"><ChevronLeft size={14} /></button>
          <span className="tabular-nums">{cur + 1} / {pages}</span>
          <button aria-label="Page suivante" disabled={cur >= pages - 1} onClick={() => setPage(p => p + 1)}
            className="w-7 h-7 grid place-items-center rounded-lg border border-line bg-white disabled:opacity-40"><ChevronRight size={14} /></button>
        </div>
      </div>
    </div>
  )
}
