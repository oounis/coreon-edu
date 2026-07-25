// ── Le magasin du serveur : des fichiers JSON, écrits ATOMIQUEMENT ──────────
// Pilote v1 : une école = un blob + un registre d'authentification. L'écriture
// passe par un fichier temporaire puis un rename (atomique sur un même volume) :
// une coupure de courant laisse l'ancienne version, jamais un fichier à moitié.
// Les sauvegardes sont des copies datées, conservées 30 — et testables.
import { readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, copyFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export function makeStore(dataDir) {
  // ⚠️ AUDIT 2026-07-25 (S-14) : mode 0700/0600 — le registre d'auth (hachages,
  // sessions) et les sauvegardes (tout le dossier élèves) ne sont lisibles que
  // par le propriétaire du processus, jamais par les autres comptes de l'hôte.
  mkdirSync(dataDir, { recursive: true, mode: 0o700 })
  mkdirSync(join(dataDir, 'backups'), { recursive: true, mode: 0o700 })
  const fileOf = name => join(dataDir, name + '.json')

  const read = (name, fallback) => {
    try { return JSON.parse(readFileSync(fileOf(name), 'utf8')) } catch { return fallback }
  }
  const write = (name, value) => {
    const tmp = fileOf(name) + '.tmp'
    writeFileSync(tmp, JSON.stringify(value), { mode: 0o600 })
    renameSync(tmp, fileOf(name))
  }

  // ⚠️ AUDIT 2026-07-25 : auth.json n'était JAMAIS sauvegardé — une restauration
  // rendait l'école sans AUCUN mot de passe : personne, Direction comprise, ne
  // pouvait plus se connecter. On copie désormais les DEUX fichiers, avec un
  // horodatage à la seconde (deux sauvegardes dans la même minute ne s'écrasent plus).
  const rotate = prefix => {
    const all = readdirSync(join(dataDir, 'backups')).filter(f => f.startsWith(prefix + '-')).sort()
    for (const f of all.slice(0, Math.max(0, all.length - 30))) unlinkSync(join(dataDir, 'backups', f))
  }
  const backup = () => {
    if (!existsSync(fileOf('school'))) return null
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const dest = join(dataDir, 'backups', `school-${stamp}.json`)
    copyFileSync(fileOf('school'), dest)
    if (existsSync(fileOf('auth'))) copyFileSync(fileOf('auth'), join(dataDir, 'backups', `auth-${stamp}.json`))
    rotate('school'); rotate('auth')
    return dest
  }

  return { read, write, backup }
}
