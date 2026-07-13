import { Dialog } from '@headlessui/react'
import { MARK_VIEWBOX, MARK_PARTS } from '@core/mark.js'
import { X, Search, RotateCw } from 'lucide-react'
import { Ic } from '../icons.jsx'
import { Link } from 'react-router-dom'
import { STATUS as K, BRAND, N, SERIES, TERRA, soften, deepen } from '@core/tokens.js'

// ── Statuts — les SEULES couleurs d'état du produit. ────────────────────────
// Elles viennent de core/src/tokens.js (KOGIA_HARMONY.md §3.3), plus d'ici : le
// fichier avait sa propre échelle et index.css en avait une AUTRE (#EF4444 /
// #E59A12 / #10B981). Il n'y en a plus qu'une, partagée avec le mobile.
// Un statut ne sert JAMAIS de couleur de série dans un graphique, et il arrive
// toujours avec une icône ou un mot — jamais la couleur seule.
export const STATUS = {
  ...K,
  // « En direct » porte du texte blanc : le rouge de danger seul ne donne que
  // 4.06:1. On l'assombrit vers l'encre (5.35:1) — c'est la MÊME couleur, plus
  // profonde, pas une sixième couleur inventée.
  live: deepen(K.danger),
}

// Aplats très pâles + encre lisible, tous canoniques. L'aplat porte l'ICÔNE
// (≥ 3:1 suffit pour une marque) ; le texte, lui, reste en encre.
const TINTS = {
  brand:  [soften(BRAND.indigo), BRAND.indigo],
  sky:    [K.infoSoft,           K.info],
  butter: [K.warnSoft,           K.warn],
  mint:   [K.okSoft,             K.ok],
  coral:  [K.dangerSoft,         K.danger],
  grape:  [soften(BRAND.violet), BRAND.violet],
  slate:  [K.neutralSoft,        K.neutral],
}

export function Card({ className='', children }){ return <div className={`card ${className}`}>{children}</div> }
export function StatCard({ label, value, sub, tint='brand', icon, to, onClick }){
  const [bg,fg]=TINTS[tint]||TINTS.brand
  const inner=<><span className="w-12 h-12 rounded-2xl grid place-items-center shrink-0" style={{background:bg,color:fg}}>{icon}</span>
    <div className="min-w-0"><div className="text-2xl font-extrabold leading-none">{value}</div><div className="text-xs text-muted mt-1 truncate">{label}{sub&&<span className="ml-1">· {sub}</span>}</div></div></>
  if(to) return <Link to={to} className="card p-4 flex items-center gap-3 k-lift">{inner}</Link>
  if(onClick) return <button onClick={onClick} className="card p-4 flex items-center gap-3 k-lift k-press text-left w-full">{inner}</button>
  return <div className="card p-4 flex items-center gap-3">{inner}</div>
}
export function Badge({ status }){
  const OKp=[STATUS.okSoft,STATUS.ok], WARNp=[STATUS.warnSoft,STATUS.warn], DANGp=[STATUS.dangerSoft,STATUS.danger], NEUTp=[STATUS.neutralSoft,STATUS.neutral]
  const m={paid:[...OKp,'Payé'],pending:[...WARNp,'En attente'],overdue:[...DANGp,'En retard'],due:[...NEUTp,'Impayé'],open:[...WARNp,'Ouvert'],resolved:[...OKp,'Résolu'],approved:[...OKp,'Approuvé'],rejected:[...DANGp,'Rejeté'],present:[...OKp,'Présent'],absent:[...DANGp,'Absent'],late:[...WARNp,'Retard']}
  const [bg,fg,label]=m[status]||[STATUS.neutralSoft,STATUS.neutral,status]
  return <span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{background:bg,color:fg}}>{label}</span>
}
// ── Avatar à initiales : LE seul style d'avatar du produit. Aplat déterministe
// tiré du nom, jamais une image. Les sept teintes sont canoniques ET réversibles
// (≥ 4.5:1 en initiales sur leur propre aplat) — vérifié, pas estimé. ──
const AVATAR_HUES=[BRAND.indigo, SERIES[0], SERIES[5], N.slate, N.ink, TERRA.deep, TERRA.ink]
const AVATAR_TINTS=AVATAR_HUES.map(c=>[soften(c),c])
const hashSeed=s=>{let x=0;for(const c of String(s))x=(x*31+c.charCodeAt(0))>>>0;return x}
export const avatarTint=seed=>AVATAR_TINTS[hashSeed(seed)%AVATAR_TINTS.length]
export function Avatar({ name, initials, seed, size=36, ring, className='' }){
  const [bg,fg]=avatarTint(seed||name||'?')
  const i=initials||((name||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase())
  return <span aria-hidden="true" className={`rounded-full grid place-items-center font-bold shrink-0 select-none ${className}`}
    style={{width:size,height:size,fontSize:Math.max(10,Math.round(size*0.36)),background:bg,color:fg,boxShadow:ring?`0 0 0 2px ${ring}`:undefined}}>{i}</span>
}
export function Btn({ children, variant='primary', size='md', className='', ...p }){
  const base="inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition k-press disabled:opacity-50 disabled:pointer-events-none"
  const s=size==='sm'?"text-[13px] px-3 py-2":size==='lg'?"text-sm px-5 py-3":"text-sm px-4 py-2.5"
  const v=variant==='primary'?"text-white accent-bg shadow-sm hover:opacity-90":variant==='soft'?"accent-soft accent-text hover:brightness-95":variant==='danger'?"bg-white border border-line text-coral hover:bg-coral-soft":variant==='ghost'?"text-muted hover:text-ink hover:bg-canvas":"bg-white border border-line hover:bg-canvas"
  return <button className={`${base} ${s} ${v} ${className}`} {...p}>{children}</button>
}
export function Field({ label, children, hint }){ return <label className="block"><span className="text-xs font-semibold text-muted">{label}</span><div className="mt-1">{children}</div>{hint&&<span className="text-[11px] text-muted">{hint}</span>}</label> }
export function Input(p){ return <input {...p} className={`w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm accent-ring ${p.className||''}`}/> }
export function Textarea(p){ return <textarea {...p} className={`w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm accent-ring ${p.className||''}`}/> }
export function Select(p){ return <select {...p} className={`w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm accent-ring ${p.className||''}`}/> }
export function Section({ title, children, cols=2 }){
  return <div className="mb-4"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">{title}</div>
    <div className={`grid gap-3 ${cols===2?'sm:grid-cols-2':cols===3?'sm:grid-cols-3':''}`}>{children}</div></div>
}
export function Modal({ open, onClose, title, children, footer, size='lg' }){
  const w={sm:'max-w-sm',md:'max-w-md',lg:'max-w-lg',xl:'max-w-2xl','2xl':'max-w-3xl'}[size]||'max-w-lg'
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm" aria-hidden="true"/>
      <div className="fixed inset-0 grid place-items-center p-4">
        <Dialog.Panel className={`card w-full ${w} pop flex flex-col max-h-[90vh]`}>
          <div className="flex items-center justify-between p-5 border-b border-line"><Dialog.Title className="text-lg font-bold">{title}</Dialog.Title><button onClick={onClose} className="text-muted hover:text-ink"><X size={18}/></button></div>
          <div className="p-5 overflow-y-auto scroll-thin">{children}</div>
          {footer&&<div className="p-4 border-t border-line flex justify-end gap-2">{footer}</div>}
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
export function Table({ head, children }){
  return <div className="card overflow-hidden"><div className="overflow-x-auto scroll-thin"><table className="w-full text-sm">
    <thead><tr className="text-left text-[12px] uppercase tracking-wide text-muted bg-canvas">{head.map((h,i)=><th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-line">{children}</tbody></table></div></div>
}
export function PageHead({ title, sub, action }){
  return <div className="flex items-end justify-between gap-3 mb-5 flex-wrap"><div><h1 className="text-2xl font-extrabold">{title}</h1>{sub&&<p className="text-muted mt-0.5">{sub}</p>}</div>{action}</div>
}
export function IconTile({ icon, tint='brand', size=44, radius='rounded-2xl', className='' }){
  const [bg,fg]=TINTS[tint]||TINTS.brand
  return <span className={`${radius} grid place-items-center shrink-0 ${className}`} style={{width:size,height:size,background:bg,color:fg}}>{icon}</span>
}
export function SectionCard({ title, sub, action, icon, tint='brand', children, className='', bodyClass='p-5', headless=false }){
  return <div className={`card overflow-hidden ${className}`}>
    {!headless && (title||action) && <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <IconTile icon={icon} tint={tint} size={34} radius="rounded-xl"/>}
        <div className="min-w-0"><h3 className="font-bold text-[15px] truncate">{title}</h3>{sub&&<p className="text-xs text-muted truncate">{sub}</p>}</div>
      </div>
      {action}
    </div>}
    {children!=null && <div className={bodyClass}>{children}</div>}
  </div>
}

// ════════════════════════════════════════════════════════════════════════════
// LA MARQUE — un seul dessin, partagé avec le mobile (core/src/mark.js).
// Avant : le web dessinait un sourire et une nageoire que le mobile n'avait pas,
// et l'œil avait quatre couleurs selon l'écran. Il n'y a plus qu'un tracé.
// ════════════════════════════════════════════════════════════════════════════

/** LA MARQUE. Logos, en-têtes, favicon, tuiles — et toute illustration. */
export function Mark({ size = 32, className = '' }) {
  // Un K. Et, dans son négatif, une nageoire caudale. Aplat, currentColor.
  // Pas d'œil : un œil ferait une créature, donc une mascotte.
  return (
    <svg viewBox={MARK_VIEWBOX} width={size} height={size} className={className} aria-hidden="true">
      <g fill="currentColor">{MARK_PARTS.map((d, i) => <path key={i} d={d} />)}</g>
    </svg>
  )
}

/** LA MASCOTTE DESSINÉE EST RETIRÉE.
 *  Une baleine cartoon (dégradé, sourire, jet) à côté d'une marque géométrique
 *  aplatie, c'étaient DEUX styles d'illustration pour UNE entreprise — exactement
 *  ce qu'« une seule identité » interdit. Il n'y a plus qu'une illustration dans
 *  tout l'écosystème : LA MARQUE.
 *  `Mascot` / `Whale` restent exportés (beaucoup d'états vides les appellent) mais
 *  dessinent la marque, teintée dans la famille du produit.
 *  Source : brand/KOGIA_HARMONY.md §4.3 et §7 */
export function Mascot({ size = 46, className = '' }) {
  return <Mark size={size} className={`accent-text ${className}`} />
}
export const Whale = Mascot

/** Attente en ligne : c'est le CROISSANT qui tourne, pas un anneau générique (§7).
 *  La viewBox est serrée autour de l'arc (centre 43.5 / 50.5) pour qu'il tourne
 *  autour de LUI-MÊME et non autour du coin de la baleine. */
export function Crescent({ size=20, color='var(--accent)', className='' }){
  return <svg viewBox="30 37 27 27" width={size} height={size} className={`k-crescent ${className}`} aria-hidden="true">
    <path d={CRESCENT.d} fill="none" stroke={color} strokeWidth={CRESCENT.width*1.5} strokeLinecap="round"/>
  </svg>
}
/** Attente en ligne, avec un mot. Jamais « Chargement… » tout seul sur une page. */
export function Spinner({ label='Un instant…', className='' }){
  return <div role="status" aria-live="polite" className={`flex items-center gap-2 text-sm text-muted ${className}`}>
    <Crescent size={18}/><span>{label}</span></div>
}

// ── Les cinq états (§8 du livre de marque). Un écran n'est pas conçu tant que
//    les cinq n'existent pas. Ce n'est pas un conseil, c'est une condition. ──

/** VIDE — une icône CONTEXTUELLE, une phrase en français clair, une action.
 *  Jamais un cul-de-sac, jamais le mot « Aucune donnée ».
 *
 *  ET JAMAIS LE LOGO. Le logo n'apparaît QUE dans l'en-tête, jamais en grand dans
 *  le corps d'une page : une marque répétée en décor cesse d'être une marque.
 *  Ici l'icône dit de QUOI la page est vide (une boîte, un calendrier, une classe…).
 *  Source : brand/KOGIA_HARMONY.md §4.8 et §10 */
export function EmptyState({ icon = 'Inbox', title, sub, action, className='' }){
  return <div className={`flex flex-col items-center text-center py-12 px-6 ${className}`}>
    <div className="w-14 h-14 rounded-2xl grid place-items-center mb-3 accent-soft accent-text"
      aria-hidden="true"><Ic n={icon} size={26}/></div>
    <div className="font-bold text-ink">{title}</div>
    {sub && <p className="text-sm text-muted mt-1 max-w-sm">{sub}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
}
/** ERREUR — dire ce qui s'est passé et quoi faire ensuite. Jamais un code, jamais « Oups ». */
export function ErrorState({ title='La page n’a pas pu se charger.', sub='Vérifiez votre connexion, puis réessayez. Si cela recommence, prévenez la Direction.', onRetry, className='' }){
  return <div role="alert" className={`flex flex-col items-center text-center py-12 px-6 ${className}`}>
    <div className="w-14 h-14 rounded-2xl grid place-items-center mb-3" style={{background:STATUS.dangerSoft,color:STATUS.danger}} aria-hidden="true"><X size={26}/></div>
    <div className="font-bold text-ink">{title}</div>
    <p className="text-sm text-muted mt-1 max-w-sm">{sub}</p>
    {onRetry && <Btn className="mt-4" onClick={onRetry}><RotateCw size={15}/> Réessayer</Btn>}
  </div>
}
/** SUCCÈS — bref, chaleureux, et il s'efface tout seul. */
export function SuccessState({ title='C’est enregistré.', sub, action, className='' }){
  return <div role="status" className={`flex flex-col items-center text-center py-12 px-6 ${className}`}>
    <div className="w-14 h-14 rounded-2xl grid place-items-center mb-3"
      style={{background:STATUS.okSoft,color:STATUS.ok}} aria-hidden="true"><Ic n="Check" size={26}/></div>
    <div className="font-bold text-ink">{title}</div>
    {sub && <p className="text-sm text-muted mt-1 max-w-sm">{sub}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
}

// ── CHARGEMENT — des squelettes à la forme du contenu réel, jamais un rond au
//    milieu d'une page vide. ──
export function Skeleton({ className='', w, h }){ return <div className={`skeleton ${className}`} style={{width:w,height:h}}/> }
export function SkeletonList({ rows=4 }){ return <div className="space-y-2.5" aria-hidden="true">{Array.from({length:rows}).map((_,i)=><div key={i} className="card p-4 flex items-center gap-3"><Skeleton w={40} h={40} className="rounded-xl"/><div className="flex-1 space-y-2"><Skeleton h={12} className="w-1/3"/><Skeleton h={10} className="w-1/2"/></div></div>)}</div> }
/** Squelette d'une grille de tuiles (tableau de bord) — même forme que le vrai. */
export function SkeletonStats({ n=4 }){ return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">{Array.from({length:n}).map((_,i)=><div key={i} className="card p-4 flex items-center gap-3"><Skeleton w={48} h={48} className="rounded-2xl"/><div className="flex-1 space-y-2"><Skeleton h={16} className="w-1/2"/><Skeleton h={10} className="w-2/3"/></div></div>)}</div> }

export function SearchInput({ value, onChange, placeholder='Rechercher…', className='' }){
  return <div className={`relative ${className}`}>
    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"/>
    <input value={value} onChange={onChange} placeholder={placeholder} aria-label={placeholder}
      className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2.5 text-sm accent-ring"/>
  </div>
}
export function Toolbar({ children, className='' }){ return <div className={`flex items-center gap-2 flex-wrap mb-4 ${className}`}>{children}</div> }
export function Tabs({ tabs, value, onChange, className='' }){
  // flex-wrap + max-w-full : cinq onglets (Poste de sécurité) débordaient de 33 px
  // sur un écran de 390 px et créaient un défilement horizontal de toute la page.
  return <div className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-canvas border border-line max-w-full ${className}`} role="tablist">
    {tabs.map(t=>{ const on=t.value===value
      return <button key={t.value} role="tab" aria-selected={on} onClick={()=>onChange(t.value)}
        className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition ${on?'bg-white shadow-sm text-ink':'text-muted hover:text-ink'}`}>{t.label}{t.count!=null&&<span className={`ml-1.5 ${on?'accent-text':'text-muted'}`}>{t.count}</span>}</button>
    })}
  </div>
}
export function Chip({ children, active, onClick, className='' }){
  return <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${active?'accent-bg text-white border-transparent':'bg-white border-line text-muted hover:text-ink'} ${className}`}>{children}</button>
}
export function UserCard({ name, seed, meta, size=44, action, className='' }){
  return <div className={`flex items-center gap-3 min-w-0 ${className}`}>
    <Avatar name={name} seed={seed} size={size}/>
    <div className="min-w-0 flex-1"><div className="font-bold truncate leading-tight">{name}</div>{meta&&<div className="text-xs text-muted truncate">{meta}</div>}</div>
    {action}
  </div>
}
