// ════════════════════════════════════════════════════════════════════════════
// LA PORTE D'INTÉGRATION (CR-034) — les données du client entrent chez Coreon.
//
// Une école qui achète Coreon EDU a DÉJÀ ses données ailleurs (Excel, un autre
// SIS, OneRoster). Ce module est le chemin par lequel elles arrivent :
//
//   1. LIRE      — parseCSV : CSV robuste (BOM, guillemets, ; ou , ou tab)
//   2. RAPPROCHER— autoMap : les colonnes du client → nos champs (FR/EN/AR +
//                  en-têtes OneRoster reconnus d'office)
//   3. VALIDER   — buildPlan : chaque ligne devient créer / mettre à jour /
//                  ignorer / erreur, avec ses messages. RIEN n'est écrit :
//                  le plan EST la répétition générale (dry-run).
//   4. APPLIQUER — applyPlan : écrit par les MÊMES chemins que l'écran Élèves
//                  (assignRef, setStudentParent, échéancier) — un élève importé
//                  est indistinguable d'un élève saisi.
//   5. ANNULER   — une photographie de la base est prise AVANT l'écriture ;
//                  undoLastImport() la restaure (un seul cran, le dernier).
//   6. TRACER    — chaque import est journalisé dans d.imports (qui, quand,
//                  fichier, comptes) : le monitoring de l'intégration.
//
// Doublons : un élève existant est reconnu par (nom normalisé + date de
// naissance) ou par email pour le personnel — il devient « mettre à jour »
// (les champs non vides du fichier complètent la fiche), jamais un double.
// ════════════════════════════════════════════════════════════════════════════
import { db, mutate, uid, assignRef, setStudentParent, FEE_MONTHS } from './db.js'
import { getItem, setItem, removeItem } from './storage.js'

const DB_KEY = 'coreon_db'              // la clé du blob (db.js)
const UNDO_KEY = 'coreon_import_undo'   // la photographie d'avant-import (1 cran)

// ── 1. LIRE : un CSV robuste, zéro dépendance ────────────────────────────────
export function parseCSV(text) {
  let s = String(text || '')
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1)              // BOM Excel
  const firstLine = s.slice(0, s.indexOf('\n') + 1 || s.length)
  const count = ch => (firstLine.match(new RegExp('\\' + ch, 'g')) || []).length
  const delim = [[';', count(';')], [',', count(',')], ['\t', count('\t')]].sort((a, b) => b[1] - a[1])[0][0]
  const rows = []; let row = [], cell = '', inQ = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++ } else inQ = false }
      else cell += c
    } else if (c === '"') inQ = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some(x => x.trim() !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some(x => x.trim() !== '')) rows.push(row)
  if (!rows.length) return { headers: [], rows: [], delimiter: delim }
  return { headers: rows[0].map(h => h.trim()), rows: rows.slice(1), delimiter: delim }
}

// ── Normalisation ────────────────────────────────────────────────────────────
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim()
const normKey = s => norm(s).replace(/\s+/g, '')

/** Une date libre → ISO. Accepte yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy. */
export function toIsoDate(v) {
  const s = String(v || '').trim()
  if (!s) return null
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s)     // convention dd/mm/yyyy
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}
const validIso = iso => { const d = new Date(iso + 'T12:00:00'); return !Number.isNaN(d.getTime()) && iso === d.toISOString().slice(0, 10) }
const GENDERS = { m: 'Garçon', masculin: 'Garçon', garcon: 'Garçon', male: 'Garçon', boy: 'Garçon', 'ذكر': 'Garçon', f: 'Fille', feminin: 'Fille', fille: 'Fille', female: 'Fille', girl: 'Fille', 'أنثى': 'Fille' }
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// ── 2. RAPPROCHER : nos champs et leurs noms d'ailleurs ──────────────────────
// `aliases` : FR, EN, AR, et les en-têtes OneRoster (users.csv) reconnus d'office.
export const TARGETS = {
  students: {
    label: 'Élèves (+ parents)',
    fields: [
      { key: 'name', label: 'Nom complet', required: 'soft', aliases: ['nom', 'nom complet', 'nom et prenom', 'nom de l eleve', 'eleve', 'student', 'student name', 'full name', 'الاسم', 'الاسم الكامل'] },
      { key: 'firstName', label: 'Prénom', aliases: ['prenom', 'first name', 'firstname', 'givenname', 'given name', 'الاسم الأول'] },
      { key: 'lastName', label: 'Nom de famille', aliases: ['nom de famille', 'last name', 'lastname', 'familyname', 'family name', 'surname', 'اللقب'] },
      { key: 'gender', label: 'Sexe', aliases: ['sexe', 'genre', 'gender', 'sex', 'الجنس'] },
      { key: 'dob', label: 'Date de naissance', aliases: ['date de naissance', 'ne le', 'nee le', 'naissance', 'dob', 'birthdate', 'birth date', 'date of birth', 'تاريخ الولادة', 'تاريخ الميلاد'] },
      { key: 'className', label: 'Classe', aliases: ['classe', 'class', 'niveau', 'grade', 'section', 'class name', 'القسم', 'الصف'] },
      { key: 'nationality', label: 'Nationalité', aliases: ['nationalite', 'nationality', 'الجنسية'] },
      { key: 'cin', label: 'Pièce d’identité', aliases: ['cin', 'cpr', 'qid', 'id', 'identifiant', 'identifier', 'national id', 'numero identite', 'رقم الهوية'] },
      { key: 'address', label: 'Adresse', aliases: ['adresse', 'address', 'العنوان'] },
      { key: 'phone', label: 'Téléphone', aliases: ['telephone', 'tel', 'phone', 'mobile', 'sms', 'الهاتف'] },
      { key: 'email', label: 'Email', aliases: ['email', 'e mail', 'courriel', 'mail', 'البريد'] },
      { key: 'allergies', label: 'Allergies', aliases: ['allergies', 'allergie', 'allergy', 'الحساسية'] },
      { key: 'medical', label: 'Dossier médical', aliases: ['medical', 'sante', 'health', 'remarques medicales', 'ملاحظات طبية'] },
      { key: 'bloodGroup', label: 'Groupe sanguin', aliases: ['groupe sanguin', 'blood group', 'blood type', 'فصيلة الدم'] },
      { key: 'parentName', label: 'Parent — nom', aliases: ['parent', 'tuteur', 'guardian', 'parent name', 'pere', 'mere', 'ولي الأمر'] },
      { key: 'parentEmail', label: 'Parent — email', aliases: ['email parent', 'parent email', 'guardian email', 'بريد الولي'] },
      { key: 'parentPhone', label: 'Parent — téléphone', aliases: ['telephone parent', 'parent phone', 'guardian phone', 'هاتف الولي'] },
      { key: 'rollNo', label: 'N° d’ordre', aliases: ['n ordre', 'roll', 'roll no', 'matricule'] },
      { key: 'admissionDate', label: 'Date d’admission', aliases: ['date d admission', 'admission', 'admission date', 'inscrit le'] },
      { key: 'prevSchool', label: 'École précédente', aliases: ['ecole precedente', 'previous school', 'المدرسة السابقة'] },
    ],
  },
  staff: {
    label: 'Personnel (comptes)',
    fields: [
      { key: 'name', label: 'Nom complet', required: 'soft', aliases: ['nom', 'nom complet', 'name', 'full name', 'الاسم'] },
      { key: 'firstName', label: 'Prénom', aliases: ['prenom', 'first name', 'givenname'] },
      { key: 'lastName', label: 'Nom de famille', aliases: ['nom de famille', 'last name', 'familyname', 'surname'] },
      { key: 'role', label: 'Rôle', required: true, aliases: ['role', 'fonction', 'poste', 'position', 'الدور', 'الوظيفة'] },
      { key: 'email', label: 'Email', required: true, aliases: ['email', 'e mail', 'courriel', 'mail', 'username', 'البريد'] },
      { key: 'phone', label: 'Téléphone', aliases: ['telephone', 'tel', 'phone', 'mobile', 'الهاتف'] },
      { key: 'gender', label: 'Sexe', aliases: ['sexe', 'genre', 'gender', 'الجنس'] },
      { key: 'cin', label: 'Pièce d’identité', aliases: ['cin', 'cpr', 'qid', 'id', 'identifier', 'رقم الهوية'] },
      { key: 'subject', label: 'Matière (enseignant)', aliases: ['matiere', 'subject', 'discipline', 'المادة'] },
    ],
  },
}

const ROLE_MAP = {
  enseignant: 'teacher', enseignante: 'teacher', teacher: 'teacher', instituteur: 'teacher', institutrice: 'teacher', educatrice: 'teacher', educateur: 'teacher', 'معلم': 'teacher', 'معلمة': 'teacher',
  direction: 'schooladmin', directeur: 'schooladmin', directrice: 'schooladmin', principal: 'schooladmin', 'مدير': 'schooladmin',
  administration: 'admin', admin: 'admin', administratif: 'admin', secretaire: 'admin', aide: 'admin',
  comptable: 'accountant', accountant: 'accountant', finance: 'accountant', 'محاسب': 'accountant',
  rh: 'hr', hr: 'hr', 'ressources humaines': 'hr',
  surveillant: 'supervisor', surveillante: 'supervisor', supervisor: 'supervisor',
  securite: 'security', security: 'security', gardien: 'security', 'حارس': 'security',
  parent: 'parent',
}

/** Devine la correspondance colonnes → champs. Renvoie { fieldKey: index|null }. */
export function autoMap(headers, targetKey) {
  const t = TARGETS[targetKey]
  const hs = headers.map(h => normKey(h))
  const map = {}
  for (const f of t.fields) {
    const candidates = [f.key, f.label, ...(f.aliases || [])].map(normKey)
    let idx = hs.findIndex(h => candidates.includes(h))
    if (idx < 0) idx = hs.findIndex(h => h && candidates.some(c => c.length > 3 && (h.includes(c) || c.includes(h))))
    map[f.key] = idx >= 0 ? idx : null
  }
  return map
}

/** Applique la correspondance : lignes CSV → enregistrements {champ: valeur}. */
export function applyMapping(rows, mapping) {
  return rows.map(r => {
    const rec = {}
    for (const [k, idx] of Object.entries(mapping)) if (idx != null && idx >= 0) rec[k] = String(r[idx] ?? '').trim()
    return rec
  })
}

// ── 3. VALIDER : le plan (répétition générale, rien n'est écrit) ─────────────
export function buildPlan(d, targetKey, records) {
  const seen = new Map()
  const existingStudents = new Map((d.students || []).map(s => [normKey(s.name) + '|' + (s.dob || ''), s]))
  const existingByEmail = new Map((d.users || []).filter(u => u.email).map(u => [u.email.toLowerCase(), u]))
  const classNames = new Map((d.classes || []).map(c => [normKey(c.name), c]))

  const rows = records.map((rec, i) => {
    const errors = [], warnings = []
    const r = { ...rec }
    if (!r.name && (r.firstName || r.lastName)) r.name = `${r.firstName || ''} ${r.lastName || ''}`.trim()
    if (!r.name) errors.push('Nom manquant.')

    if (r.gender) { const g = GENDERS[normKey(r.gender)]; if (g) r.gender = g; else warnings.push(`Sexe non reconnu : « ${rec.gender} ».`) }
    for (const k of ['dob', 'admissionDate']) if (r[k]) {
      const iso = toIsoDate(r[k])
      if (!iso || !validIso(iso)) { errors.push(`Date invalide (${k}) : « ${rec[k]} ».`) } else r[k] = iso
    }
    if (r.email && !EMAIL_RE.test(r.email)) warnings.push(`Email douteux : « ${r.email} ».`)
    if (r.parentEmail && !EMAIL_RE.test(r.parentEmail)) warnings.push(`Email parent douteux : « ${r.parentEmail} ».`)

    let action = 'create', matchId = null
    if (targetKey === 'students') {
      if (r.dob) {
        const age = (Date.now() - new Date(r.dob + 'T12:00:00').getTime()) / (365.25 * 86400000)
        if (age < 1 || age > 20) warnings.push(`Âge inhabituel (${Math.round(age)} ans) — vérifier la date.`)
      }
      if (r.className && !classNames.has(normKey(r.className))) warnings.push(`Classe inconnue « ${r.className} » : elle sera créée.`)
      if (!r.className) warnings.push('Sans classe : l’élève sera importé non affecté.')
      const key = normKey(r.name) + '|' + (r.dob || '')
      if (seen.has(key)) { action = 'skip'; warnings.push(`Doublon dans le fichier (ligne ${seen.get(key) + 1}).`) }
      else {
        seen.set(key, i)
        const ex = existingStudents.get(key)
        if (ex) { action = 'update'; matchId = ex.id; warnings.push(`Élève déjà connu (${ex.ref || ex.id}) : mise à jour des champs fournis.`) }
      }
    } else if (targetKey === 'staff') {
      const role = ROLE_MAP[normKey(r.role || '')]
      if (!role) errors.push(`Rôle non reconnu : « ${rec.role || '' } » (enseignant, administration, comptable, rh, surveillant, sécurité…).`)
      else r.role = role
      if (!r.email) errors.push('Email manquant (il sert d’identifiant de connexion).')
      else {
        const key = r.email.toLowerCase()
        if (seen.has(key)) { action = 'skip'; warnings.push(`Doublon dans le fichier (ligne ${seen.get(key) + 1}).`) }
        else {
          seen.set(key, i)
          const ex = existingByEmail.get(key)
          if (ex) { action = 'update'; matchId = ex.id; warnings.push(`Compte déjà connu (${ex.name}) : mise à jour.`) }
        }
      }
    }
    if (errors.length) action = 'error'
    return { n: i + 1, action, data: r, errors, warnings, matchId }
  })

  const count = a => rows.filter(x => x.action === a).length
  return { target: targetKey, rows, counts: { create: count('create'), update: count('update'), skip: count('skip'), error: count('error') } }
}

// ── 4. APPLIQUER — par les mêmes chemins que la saisie manuelle ──────────────
const tempPw = () => Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6)
const initialsOf = name => name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()

export function applyPlan(targetKey, plan, { byId = '', byName = '', file = '' } = {}) {
  // La photographie d'AVANT — le cran d'annulation. Best-effort : si le quota
  // la refuse, l'import continue mais se déclare non annulable.
  const before = getItem(DB_KEY)
  const undoOk = before != null && setItem(UNDO_KEY, before)

  let created = 0, updated = 0, credentials = []
  const importId = uid('imp')
  const d = mutate(d => {
    d.imports = d.imports || []
    for (const row of plan.rows) {
      if (row.action !== 'create' && row.action !== 'update') continue
      const r = row.data
      if (targetKey === 'students') {
        let cls = null
        if (r.className) {
          cls = d.classes.find(c => normKey(c.name) === normKey(r.className))
          if (!cls) { cls = { id: uid('c'), name: r.className, grade: r.className, cycle: null }; d.classes.push(cls) }
        }
        let pid = null
        if (r.parentEmail || r.parentName) {
          const pByMail = r.parentEmail && d.users.find(u => u.role === 'parent' && (u.email || '').toLowerCase() === r.parentEmail.toLowerCase())
          if (pByMail) pid = pByMail.id
          else {
            const pw = tempPw()
            pid = uid('p')
            d.users.push({ id: pid, role: 'parent', name: r.parentName || r.parentEmail, email: r.parentEmail || '', pw, phone: r.parentPhone || '', childIds: [] })
            if (r.parentEmail) credentials.push({ role: 'parent', name: r.parentName || r.parentEmail, email: r.parentEmail, pw })
          }
        }
        if (row.action === 'create') {
          const sid = uid('s')
          const st = {
            id: sid, name: r.name, initials: initialsOf(r.name), classId: cls?.id || null, parentId: null,
            gender: r.gender || '·', dob: r.dob || '', bloodGroup: r.bloodGroup || '', nationality: r.nationality || '',
            rollNo: r.rollNo || '', admissionDate: r.admissionDate || new Date().toISOString().slice(0, 10),
            prevSchool: r.prevSchool || '', address: r.address || '', phone: r.phone || '', email: r.email || '',
            cin: r.cin || '', guardianPhone: r.parentPhone || '', medical: r.medical || 'Aucune',
            allergies: r.allergies || 'Aucune', emergencyName: r.parentName || '', emergencyPhone: r.parentPhone || '',
          }
          assignRef(d, 'student', st)
          d.students.push(st)
          if (pid) setStudentParent(d, sid, pid)
          d.payments[sid] = FEE_MONTHS.map(m => ({ month: m, status: 'due' }))
          created++
        } else {
          const ex = d.students.find(s => s.id === row.matchId)
          if (!ex) continue
          // Mise à jour : les champs NON VIDES du fichier complètent la fiche.
          for (const k of ['gender', 'dob', 'nationality', 'address', 'phone', 'email', 'cin', 'allergies', 'medical', 'bloodGroup', 'rollNo', 'prevSchool']) if (r[k]) ex[k] = r[k]
          if (cls) ex.classId = cls.id
          if (pid) setStudentParent(d, ex.id, pid)
          updated++
        }
      } else if (targetKey === 'staff') {
        if (row.action === 'create') {
          const pw = tempPw()
          const uidU = uid('u')
          d.users.push({ id: uidU, role: r.role, name: r.name, email: r.email, pw, phone: r.phone || '', gender: r.gender || '', cin: r.cin || '' })
          if (r.role === 'teacher') d.teachers.push({ id: uid('t'), name: r.name, subject: r.subject || '', classes: [], gender: r.gender || '', phone: r.phone || '', email: r.email, address: r.address || '', salary: 0 })
          credentials.push({ role: r.role, name: r.name, email: r.email, pw })
          created++
        } else {
          const ex = d.users.find(u => u.id === row.matchId)
          if (!ex) continue
          for (const k of ['name', 'phone', 'gender', 'cin']) if (r[k]) ex[k] = r[k]
          updated++
        }
      }
    }
    d.imports.unshift({
      id: importId, at: Date.now(), by: byId, byName, file, target: targetKey,
      created, updated, skipped: plan.counts.skip, errors: plan.counts.error, undo: undoOk,
    })
  })
  const persisted = getItem(DB_KEY) != null && JSON.parse(getItem(DB_KEY))?.imports?.[0]?.id === importId
  return { ok: persisted, importId, created, updated, skipped: plan.counts.skip, undoAvailable: undoOk, credentials, exportBlob: before }
}

// ── 5. ANNULER — restaurer la photographie d'avant le DERNIER import ─────────
export function undoLastImport() {
  const before = getItem(UNDO_KEY)
  if (!before) return { error: 'Aucune photographie d’avant-import disponible.' }
  const ok = setItem(DB_KEY, before)
  if (!ok) return { error: 'Le stockage a refusé la restauration.' }
  removeItem(UNDO_KEY)
  return { ok: true }
}

// ── 6. TRACER ────────────────────────────────────────────────────────────────
export const importJournal = () => (db().imports || [])
