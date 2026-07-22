// ════════════════════════════════════════════════════════════════════════════
// LE MODE SERVEUR — l'école cesse de vivre dans un navigateur.
//
// Sans la clé `coreon_api`, RIEN ne change : la démo publique reste 100 %
// locale. Avec elle, ce module devient la couture entre le cœur (storage.js)
// et le serveur :
//   · connexion → jeton + blob DU RÔLE (le serveur filtre, acl.js)
//   · chaque écriture locale du personnel est POUSSÉE (débouncée) avec sa
//     révision — un 409 recharge les données fraîches au lieu d'écraser
//   · un sondage léger tire les écritures des autres appareils
//   · le parent ne pousse jamais un bloc : ses actions passent par /api/op
// ════════════════════════════════════════════════════════════════════════════
import { setStorage } from '@core/storage.js'
import { loginAs, logout, current } from '@core/auth.js'

const DB = 'coreon_db', TOKEN = 'coreon_token', REV = 'coreon_rev', UID = 'coreon_uid', ROLE = 'coreon_role'
const ls = () => window.localStorage

export const apiUrl = () => { try { return ls().getItem('coreon_api') || import.meta.env.VITE_COREON_API || '' } catch { return '' } }
export const isRemote = () => !!apiUrl()
export const hasSession = () => !!ls().getItem(TOKEN)

async function call(path, body, method) {
  const res = await fetch(apiUrl() + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(ls().getItem(TOKEN) ? { authorization: 'Bearer ' + ls().getItem(TOKEN) } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

/** Tirer l'école du serveur vers le cache local. */
export async function pull() {
  const d = await call('/api/db')
  if (d.status !== 200) return false
  ls().setItem(DB, JSON.stringify(d.json.blob))
  ls().setItem(REV, String(d.json.rev))
  return true
}

export async function remoteLogin(email, pw) {
  const r = await call('/api/login', { email, pw })
  if (r.status !== 200) return { error: r.json.error || 'Connexion impossible : vérifiez l\'adresse du serveur.' }
  ls().setItem(TOKEN, r.json.token)
  ls().setItem(UID, r.json.user.id)
  ls().setItem(ROLE, r.json.user.role)
  ls().setItem('coreon_demo_live', '0')          // une vraie école vit au réel
  if (!(await pull())) return { error: 'Connecté, mais impossible de charger l\'école.' }
  loginAs(r.json.user.id)
  return { user: r.json.user }
}

export function remoteLogout() {
  call('/api/logout', {})
  for (const k of [TOKEN, UID, ROLE, REV, DB]) ls().removeItem(k)
  logout()
  location.reload()
}

/** Les actions du parent : des opérations nommées, gardées côté serveur. */
export async function remoteOp(op, args) {
  const r = await call('/api/op', { op, args })
  if (r.status === 200) await pull()
  return r.json
}
/** Pré-inscription publique : passe par le serveur, même règles, même reçu. */
export async function remoteApply(payload) {
  const r = await call('/api/apply', payload)
  return r.json
}
/** Mot de passe oublié : demander un lien. Le serveur répond TOUJOURS la même
 *  chose — savoir si un compte existe serait déjà une fuite. */
export async function remoteForgot(email) {
  const r = await call('/api/forgot', { email })
  return { status: r.status, ...r.json }
}
/** Poser le nouveau mot de passe avec le jeton reçu par email. */
export async function remoteReset(token, pw) {
  const r = await call('/api/reset', { token, pw })
  return { status: r.status, ...r.json }
}

/** Emails du candidat (accusé de réception, décision…) — envoyés par le serveur.
 *  Branché comme transport de `admissions.js` en mode serveur (voir main.jsx). */
export async function remoteMail(mail) {
  const r = await call('/api/mail', mail)
  if (r.status >= 400) throw new Error(r.json?.error || 'mail failed')
  return r.json
}

// ── La synchronisation ────────────────────────────────────────────────────────
let timer = null, pushing = false
export function startSync() {
  // reprise de session après un rechargement : le jeton survit, la session d'onglet non
  if (!current() && ls().getItem(UID)) loginAs(ls().getItem(UID))
  const canPush = ls().getItem(ROLE) && ls().getItem(ROLE) !== 'parent'
  const base = window.localStorage

  setStorage({
    getItem: k => base.getItem(k),
    setItem: (k, v) => { base.setItem(k, v); if (k === DB && canPush) schedule() },
    removeItem: k => base.removeItem(k),
  })

  async function push() {
    if (pushing) return
    pushing = true
    const r = await call('/api/db', { baseRev: +base.getItem(REV) || 0, blob: JSON.parse(base.getItem(DB) || '{}') })
    pushing = false
    if (r.status === 200) base.setItem(REV, String(r.json.rev))
    else if (r.status === 409) {
      // Quelqu'un a écrit entre-temps : on prend la version du serveur, on le DIT.
      base.setItem(DB, JSON.stringify(r.json.blob))
      base.setItem(REV, String(r.json.rev))
      window.dispatchEvent(new CustomEvent('coreon:remote-conflict'))
      location.reload()
    } else if (r.status === 401) remoteLogout()
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(push, 800) }

  // les écritures des AUTRES appareils : sondage léger, rechargement honnête
  setInterval(async () => {
    if (pushing || timer && document.hidden) return
    const r = await call('/api/rev')
    if (r.status === 401) return remoteLogout()
    if (r.status === 200 && r.json.rev > (+base.getItem(REV) || 0) && !pushing) {
      if (await pull()) location.reload()
    }
  }, 20000)

  window.addEventListener('coreon:logout', remoteLogout)
}
