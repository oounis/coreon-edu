// ── L'IMPORT : faire naître l'école sur le serveur ───────────────────────────
// Deux chemins :
//   node server/import.mjs export.json   → reprend les données d'une école
//     (le fichier = le contenu de localStorage `coreon_db`, exporté du navigateur)
//   node server/import.mjs --demo        → sème l'école de démonstration
//
// Dans les deux cas : les mots de passe sont HACHÉS dans le registre d'auth,
// puis RETIRÉS du blob — aucun mot de passe ne vit dans les données.
// Une sauvegarde est prise AVANT d'écraser quoi que ce soit.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeStore } from './store.mjs'
import { hashPw } from './pw.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA = process.env.COREON_DATA || join(HERE, 'data')
const arg = process.argv[2]
if (!arg) { console.error('Usage : node server/import.mjs <export.json | --demo>'); process.exit(1) }

let blob
if (arg === '--demo') {
  const { setStorage } = await import('../core/src/storage.js')
  const mem = new Map()
  setStorage({ getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) })
  const { db } = await import('../core/src/db.js')
  blob = db()
} else {
  blob = JSON.parse(readFileSync(arg, 'utf8'))
}

// Même choix de magasin que server.mjs — voir le commentaire là-bas.
const store = process.env.TURSO_DATABASE_URL
  ? await (await import('./store.turso.mjs')).makeStore(process.env.TURSO_DATABASE_URL, process.env.TURSO_AUTH_TOKEN)
  : makeStore(DATA)
await store.backup()

const users = (blob.users || []).filter(u => u.email)
const authUsers = users.map(u => ({ id: u.id, email: u.email, hash: hashPw(u.pw || Math.random().toString(36)) }))
blob.users = (blob.users || []).map(({ pw, ...u }) => u)

// Attendues : ce script CLI quitte juste après — Turso doit avoir confirmé
// l'écriture avant que le process ne meure (le fichier local, lui, écrit déjà
// de façon synchrone : attendre ne change rien pour ce chemin-là).
await store.write('school', { rev: 1, blob })
await store.write('auth', { users: authUsers, sessions: {} })
console.log(`École importée · ${blob.students?.length || 0} élèves · ${authUsers.length} comptes (mots de passe hachés) · données : ${DATA}`)
if (arg === '--demo') console.log('Comptes de démo : direction@alnour.tn/admin, etc. — mêmes mots de passe qu\'en démo.')
