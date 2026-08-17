// Restauration d'une école depuis ses sauvegardes Turso.
//
// Pourquoi ce fichier existe : jusqu'ici Coreon SAUVEGARDAIT (toutes les 6 h,
// rotation 30) mais n'avait aucune procédure pour REVENIR EN ARRIÈRE. Une
// sauvegarde qu'on n'a jamais restaurée n'est pas une sauvegarde — c'est une
// hypothèse. La checklist de production l'exige, et une école a le droit de
// demander la preuve avant de confier les données de ses élèves.
//
//   node server/restore.mjs --list
//   node server/restore.mjs --at 2026-08-11-14-30-05
//   node server/restore.mjs --at <stamp> --dry-run
//
// Variables : TURSO_DATABASE_URL, TURSO_AUTH_TOKEN (école ciblée).
import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
if (!url) {
  console.error('TURSO_DATABASE_URL manquant — précisez l\'école à restaurer.')
  process.exit(1)
}

const args = process.argv.slice(2)
const has = f => args.includes(f)
const valueOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }

const client = createClient({ url, authToken })

async function list() {
  const r = await client.execute(
    "SELECT stamp, prefix, length(value) AS bytes FROM coreon_backups ORDER BY stamp DESC",
  )
  if (!r.rows.length) return console.log('Aucune sauvegarde. (Le serveur en crée une au démarrage puis toutes les 6 h.)')
  console.log('Sauvegardes disponibles, de la plus récente à la plus ancienne :\n')
  const byStamp = new Map()
  for (const row of r.rows) {
    const e = byStamp.get(row.stamp) || {}
    e[row.prefix] = Number(row.bytes)
    byStamp.set(row.stamp, e)
  }
  for (const [stamp, parts] of byStamp) {
    const school = parts.school ? `école ${(parts.school / 1024).toFixed(0)} Ko` : 'école MANQUANTE'
    const auth = parts.auth ? `auth ${(parts.auth / 1024).toFixed(1)} Ko` : 'auth MANQUANT'
    console.log(`  ${stamp}   ${school} · ${auth}`)
  }
}

async function restore(stamp, dryRun) {
  const r = await client.execute({
    sql: 'SELECT prefix, value FROM coreon_backups WHERE stamp = ?',
    args: [stamp],
  })
  if (!r.rows.length) {
    console.error(`Aucune sauvegarde datée ${stamp}. Utilisez --list.`)
    process.exit(1)
  }

  // On refuse de restaurer une école sans son registre d'authentification :
  // l'école reviendrait, mais plus personne ne pourrait s'y connecter.
  const parts = Object.fromEntries(r.rows.map(row => [row.prefix, row.value]))
  if (!parts.school) {
    console.error('Cette sauvegarde ne contient pas l\'école. Restauration refusée.')
    process.exit(1)
  }
  if (!parts.auth) {
    console.error('Cette sauvegarde ne contient pas le registre d\'authentification :')
    console.error('les données reviendraient sans que personne ne puisse se connecter. Restauration refusée.')
    process.exit(1)
  }

  const school = JSON.parse(parts.school)
  const students = (school.blob?.students || []).length
  const users = (school.blob?.users || []).length
  console.log(`Sauvegarde ${stamp} : révision ${school.rev} · ${students} élèves · ${users} comptes`)

  if (dryRun) return console.log('\n--dry-run : rien n\'a été écrit.')

  // Filet avant d'écraser : on sauvegarde l'état ACTUEL sous un horodatage
  // « pre-restore ». Une restauration mal ciblée reste ainsi réversible.
  const now = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  for (const name of ['school', 'auth']) {
    const cur = await client.execute({ sql: 'SELECT value FROM coreon_kv WHERE name = ?', args: [name] })
    if (cur.rows.length) {
      await client.execute({
        sql: 'INSERT OR REPLACE INTO coreon_backups (id, prefix, stamp, value) VALUES (?, ?, ?, ?)',
        args: [`${name}-pre-restore-${now}`, name, `pre-restore-${now}`, cur.rows[0].value],
      })
    }
  }
  console.log(`État actuel conservé sous « pre-restore-${now} ».`)

  for (const name of ['school', 'auth']) {
    await client.execute({
      sql: 'INSERT INTO coreon_kv (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value',
      args: [name, parts[name]],
    })
  }

  const check = await client.execute({ sql: 'SELECT value FROM coreon_kv WHERE name = ?', args: ['school'] })
  const after = JSON.parse(check.rows[0].value)
  const ok = after.rev === school.rev && (after.blob?.students || []).length === students
  console.log(ok
    ? `\nRestauration vérifiée : révision ${after.rev}, ${students} élèves relus depuis la base.`
    : '\n⚠️ Relecture incohérente après écriture — NE PAS redémarrer le service, vérifier manuellement.')
  if (!ok) process.exit(1)
  console.log('Redémarrez le service de cette école pour qu\'il recharge les données.')
}

if (has('--list') || args.length === 0) await list()
else if (has('--at')) await restore(valueOf('--at'), has('--dry-run'))
else console.error('Usage : --list | --at <stamp> [--dry-run]')
