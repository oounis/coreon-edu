// ════════════════════════════════════════════════════════════════════════════
// PIÈCES JOINTES — le FICHIER, pas seulement son nom.
//
// LE DÉFAUT QUE CE FICHIER CORRIGE (trouvé par Othman, 2026-07-14) :
// l'ancienne version ne gardait que `{type, name}` — le NOM du fichier. Le fichier
// lui-même était JETÉ. Résultat : l'administration lisait « acte de naissance :
// fourni » et ne pouvait RIEN OUVRIR.
//
// Une case cochée sans document derrière est un MENSONGE D'INTERFACE — et c'est
// PIRE que de ne pas avoir la fonctionnalité, parce que l'école croit détenir la
// pièce. Le jour de l'inspection, elle ne l'a pas.
//
// Ici : le fichier est lu, stocké, et OUVRABLE.
//
// LIMITE ASSUMÉE, ET DITE : en démonstration tout vit dans le navigateur (~5 Mo).
// Une photo est donc RÉDUITE avant stockage (1400 px, JPEG) — lisible à l'écran,
// dix fois plus légère — et un PDF est plafonné à 2 Mo. Ce qui ne tient pas est
// REFUSÉ avec un message clair, jamais perdu en silence. Le vrai stockage
// (serveur, antivirus, chiffrement) viendra avec le backend : c'est écrit dans
// docs/PLAN.md, pas caché sous le tapis.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Paperclip, Check, Upload, Eye, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { t as tr } from '@core/i18n.js'

// PDF : 2 Mo, on ne sait pas le compresser. IMAGE : 12 Mo acceptés à l'entrée,
// parce qu'on la RÉDUIT nous-mêmes (1400 px, JPEG) avant de la stocker — une
// photo de téléphone de 5 Mo devient ~200 Ko. C'est ce qui permet à QUATRE
// pièces de tenir dans le navigateur : le 2026-07-14, quatre photos brutes en
// base64 ont dépassé le quota et fait perdre une candidature réelle.
const MAX_PDF = 2 * 1024 * 1024
const MAX_IMG = 12 * 1024 * 1024
const MAX_STORED = 1.2 * 1024 * 1024   // après compression — au-delà, on refuse et on le dit
const IMG_EDGE = 1400                  // suffisant pour lire un acte de naissance à l'écran

const readAsDataUrl = file => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = reject
  r.readAsDataURL(file)
})

/** Réduire une image AVANT de la stocker. Une pièce sert à être LUE, pas imprimée en A0. */
async function shrinkImage(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i); i.onerror = rej; i.src = url
    })
    const scale = Math.min(1, IMG_EDGE / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    const data = canvas.toDataURL('image/jpeg', 0.82)
    // taille réelle stockée ≈ la longueur de la data URL
    return { data, size: data.length, mime: 'image/jpeg' }
  } finally { URL.revokeObjectURL(url) }
}

const human = n =>
  n < 1024 ? `${n} o` : n < 1048576 ? `${Math.round(n / 1024)} Ko` : `${(n / 1048576).toFixed(1)} Mo`

/**
 * `types` accepte deux formes :
 *   ['Acte de naissance', …]                    (historique — Comptes)
 *   [{ key: 'naissance', label: 'Acte de naissance' }, …]   (Inscriptions)
 * On stocke toujours la CLÉ ; on affiche toujours le LIBELLÉ.
 */
export default function Attach({ types, value = [], onChange, readOnly = false }) {
  const [busy, setBusy] = useState(null)
  const norm = types.map(t => typeof t === 'string' ? { key: t, label: t } : t)
  const has = k => value.find(a => a.type === k)

  const pick = t => async e => {
    const f = e.target.files?.[0]
    if (!f) return
    const isImg = String(f.type || '').startsWith('image/')
    if (!isImg && f.size > MAX_PDF) {
      toast.error(`« ${f.name} » fait ${human(f.size)}. La limite est de 2 Mo pour un PDF.`)
      e.target.value = ''
      return
    }
    if (isImg && f.size > MAX_IMG) {
      toast.error(`« ${f.name} » fait ${human(f.size)}. La limite est de 12 Mo pour une photo.`)
      e.target.value = ''
      return
    }
    setBusy(t)
    try {
      // une image est RÉDUITE avant stockage ; un PDF passe tel quel
      const stored = isImg
        ? await shrinkImage(f)
        : { data: await readAsDataUrl(f), size: f.size, mime: f.type }
      if (stored.size > MAX_STORED) {
        toast.error(`« ${f.name} » reste trop lourd même compressé. Reprenez la photo en qualité moyenne.`)
        return
      }
      onChange([
        ...value.filter(a => a.type !== t),
        { type: t, name: f.name, size: stored.size, mime: stored.mime, data: stored.data, at: Date.now() },
      ])
      toast.success(`${t} · reçu.`)
    } catch {
      toast.error('Ce fichier n’a pas pu être lu. Réessayez.')
    } finally {
      setBusy(null)
      e.target.value = ''
    }
  }

  /** OUVRIR la pièce. C'est tout l'intérêt : l'administration doit pouvoir VOIR. */
  const open = a => {
    if (!a.data) return toast.error('Cette pièce a été enregistrée sans fichier (ancienne version).')
    const w = window.open()
    if (!w) return toast.error('Autorisez les fenêtres pour ouvrir la pièce.')
    w.document.write(
      String(a.mime || '').startsWith('image/')
        ? `<title>${a.name}</title><body style="margin:0;background:#0E2135"><img src="${a.data}" style="max-width:100%;display:block;margin:auto">`
        : `<title>${a.name}</title><iframe src="${a.data}" style="border:0;width:100%;height:100vh"></iframe>`
    )
  }

  return (
    <div className="space-y-1.5">
      {norm.map(({ key: t, label }) => {
        const a = has(t)
        return (
          <div key={t} className="flex items-center justify-between gap-2 border border-line rounded-xl px-3 py-2 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              {a
                ? <Check size={15} style={{ color: '#12946F' }} />
                : <Paperclip size={15} className="text-muted" />}
              <span className="truncate">{tr(label)}</span>
              {a?.size ? <span className="text-[11px] text-muted shrink-0">({human(a.size)})</span> : null}
            </span>

            <span className="flex items-center gap-2 shrink-0">
              {a && (
                <button type="button" onClick={() => open(a)}
                  className="text-xs font-semibold accent-text inline-flex items-center gap-1">
                  <Eye size={13} /> {tr('Ouvrir')}
                </button>
              )}
              {a && !readOnly && (
                <button type="button" title="Retirer" onClick={() => onChange(value.filter(x => x.type !== t))}
                  className="text-muted hover:text-ink"><X size={13} /></button>
              )}
              {!readOnly && (
                <label className="cursor-pointer text-xs font-semibold accent-text inline-flex items-center gap-1">
                  <Upload size={13} /> {busy === t ? tr('Lecture…') : a ? tr('Remplacer') : tr('Joindre')}
                  <input type="file" className="hidden" accept="image/*,.pdf"
                    onChange={pick(t)} disabled={busy === t} />
                </label>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
