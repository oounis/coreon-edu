// ── Le magasin du serveur, variante Turso (libSQL) ──────────────────────────
// Même interface que store.mjs ({read, write, backup}) mais persiste sur une
// base Turso distante au lieu du disque local — nécessaire pour un hébergeur
// aux instances SANS disque persistant (ex. Render, plan gratuit).
//
// Compromis assumé : `write`/`backup` ne sont PAS attendus par server.mjs
// (mêmes points d'appel que la version fichier, qui elle est synchrone).
// La donnée vraie reste en mémoire process (`school`/`auth` dans server.mjs)
// pendant toute la durée de vie du processus ; Turso n'est que la couche de
// DURABILITÉ contre un redémarrage/redéploiement — pas le chemin de lecture.
// Un échec d'écriture est donc journalisé, jamais renvoyé au client HTTP :
// c'est le prix du modèle « un seul process, zéro base transactionnelle »
// hérité de store.mjs, PAS une régression introduite ici.
//
// `read`, elle, EST attendue — mais seulement DEUX fois, au démarrage de
// server.mjs (école + registre d'auth). C'est le seul endroit où `await`
// a été ajouté au code existant.
import { createClient } from '@libsql/client'

export async function makeStore(url, authToken) {
  const client = createClient({ url, authToken })
  await client.execute('CREATE TABLE IF NOT EXISTS coreon_kv (name TEXT PRIMARY KEY, value TEXT NOT NULL)')
  await client.execute('CREATE TABLE IF NOT EXISTS coreon_backups (id TEXT PRIMARY KEY, prefix TEXT NOT NULL, stamp TEXT NOT NULL, value TEXT NOT NULL)')

  const read = async (name, fallback) => {
    const r = await client.execute({ sql: 'SELECT value FROM coreon_kv WHERE name = ?', args: [name] })
    if (!r.rows.length) return fallback
    try { return JSON.parse(r.rows[0].value) } catch { return fallback }
  }

  // Signature synchrone en apparence (comme store.mjs) : les appelants ne
  // l'attendent pas. La promesse retournée reste utilisable par qui veut une
  // vraie garantie (import.mjs le fait, pour ne pas quitter le CLI trop tôt).
  const write = (name, value) =>
    client.execute({
      sql: 'INSERT INTO coreon_kv (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value',
      args: [name, JSON.stringify(value)],
    }).catch(e => console.error(`[store.turso] échec écriture "${name}" :`, e?.message || e))

  const rotate = async prefix => {
    const r = await client.execute({ sql: 'SELECT id FROM coreon_backups WHERE prefix = ? ORDER BY stamp ASC', args: [prefix] })
    const ids = r.rows.map(row => row.id)
    for (const id of ids.slice(0, Math.max(0, ids.length - 30))) {
      await client.execute({ sql: 'DELETE FROM coreon_backups WHERE id = ?', args: [id] })
    }
  }

  const backup = () => (async () => {
    const school = await read('school', null)
    if (!school) return null
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    await client.execute({
      sql: 'INSERT INTO coreon_backups (id, prefix, stamp, value) VALUES (?, ?, ?, ?)',
      args: [`school-${stamp}`, 'school', stamp, JSON.stringify(school)],
    })
    const auth = await read('auth', null)
    if (auth) {
      await client.execute({
        sql: 'INSERT INTO coreon_backups (id, prefix, stamp, value) VALUES (?, ?, ?, ?)',
        args: [`auth-${stamp}`, 'auth', stamp, JSON.stringify(auth)],
      })
    }
    await rotate('school'); await rotate('auth')
    return stamp
  })().catch(e => { console.error('[store.turso] échec sauvegarde :', e?.message || e); return null })

  return { read, write, backup }
}
