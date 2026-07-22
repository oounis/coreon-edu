// ════════════════════════════════════════════════════════════════════════════
// ONEROSTER v1.2 — l'interopérabilité, et ce qu'elle IMPOSE au modèle de données.
//
// Recherche (kogia-research, vérifié 3-0) : « OneRoster n'est PAS une API unique.
// C'est TROIS services indépendamment implémentables (Rostering, Gradebook,
// Resources), chacun avec un modèle d'information ET une liaison REST, PLUS une
// liaison CSV — et s'y conformer IMPOSE un modèle compatible : Orgs, Academic
// Sessions, Courses, Classes, Enrollments, Users, Demographics, Roles, Results. »
//
// Et la conclusion de la recherche, mot pour mot :
//   « C'est la chose la plus coûteuse à rater, et elle ne coûte presque rien à
//     faire correctement aujourd'hui. »
//
// CE QUI MANQUAIT À NOTRE MODÈLE — et c'était le piège :
//   · pas d'entité COURSE. Nos « classes » mélangeaient DEUX concepts OneRoster :
//     le COURS (Mathématiques 5ème, ce qui est enseigné) et la CLASSE (5ème A,
//     le groupe qui l'apprend, avec son enseignant et sa salle).
//   · pas d'entité ENROLLMENT. L'élève portait un `classId` en dur : impossible
//     d'inscrire un élève à plusieurs cours, impossible de dater une inscription,
//     impossible de dire « il a quitté ce cours en janvier ».
//   · pas d'ACADEMIC SESSION : les trimestres n'existaient que dans les bulletins.
//   · pas d'ORG : une école n'était pas une entité.
//
// Ce fichier ne réécrit RIEN. Il PROJETTE notre modèle sur le modèle OneRoster et
// produit l'export CSV conforme. C'est ce qui permet à un directeur informatique de
// dire « oui, Coreon EDU s'intègre » — et c'est une condition d'achat dans toute
// école internationale.
// ════════════════════════════════════════════════════════════════════════════
import { db } from './db.js'
import { LEVELS, labelOf } from './levels.js'
import { TERMS, reports, average } from './academic.js'

const SCHOOL_YEAR = '2025-2026'

/**
 * Un `sourcedId` doit être ASCII et stable. Bug attrapé au test : nos identifiants
 * sortaient accentués (`crs_nursery_Éveil`) — un consommateur OneRoster (Clever,
 * Wonde, un LMS) casse dessus. On translittère, et on garde l'accent UNIQUEMENT
 * dans les libellés lisibles.
 */
const ascii = s => String(s)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // é -> e
  .replace(/[^A-Za-z0-9_-]/g, '')
const uid = (kind, id) => `${kind}_${ascii(id)}`

// ── 1. ORGS — l'établissement. Une école EST une entité. ────────────────────
export function orgs() {
  const s = db().settings || {}
  return [{
    sourcedId: uid('org', 'school'),
    status: 'active',
    dateLastModified: new Date().toISOString(),
    name: s.schoolName || 'École',
    type: 'school',
    identifier: s.shortName || 'SCH',
    parentSourcedId: '',
  }]
}

// ── 2. ACADEMIC SESSIONS — l'année, et ses trimestres. ──────────────────────
export function academicSessions() {
  const year = {
    sourcedId: uid('as', 'year'),
    status: 'active',
    dateLastModified: new Date().toISOString(),
    title: SCHOOL_YEAR,
    type: 'schoolYear',
    startDate: '2025-09-15',
    endDate: '2026-06-30',
    parentSourcedId: '',
    schoolYear: '2026',
  }
  const terms = TERMS.map((t, i) => ({
    sourcedId: uid('as', t.key),
    status: 'active',
    dateLastModified: new Date().toISOString(),
    title: t.label,
    type: 'term',
    startDate: ['2025-09-15', '2026-01-05', '2026-04-01'][i],
    endDate: ['2025-12-20', '2026-03-20', '2026-06-30'][i],
    parentSourcedId: year.sourcedId,
    schoolYear: '2026',
  }))
  return [year, ...terms]
}

// ── 3. COURSES — CE QUI EST ENSEIGNÉ. L'entité qui nous manquait. ───────────
/**
 * Un COURS = une matière × un niveau. « Mathématiques — 5ème année ».
 * Il existe indépendamment du groupe qui le suit : c'est la définition OneRoster,
 * et c'est ce qui permettra un jour d'avoir deux classes qui suivent le même cours.
 */
export const SUBJECTS = ['Mathématiques', 'Français', 'Arabe', 'Éveil scientifique', 'Anglais']

export function courses() {
  const d = db()
  const levelsUsed = [...new Set((d.classes || []).map(c => c.level).filter(Boolean))]
  const out = []
  for (const lvl of levelsUsed) {
    const early = LEVELS.find(l => l.key === lvl)?.cycle === 'petiteEnfance'
    // En petite enfance il n'y a pas de « matières » : il y a des domaines. On ne
    // fabrique pas des cours de mathématiques pour une crèche juste pour remplir
    // un CSV — ce serait un mensonge dans une norme.
    const subjects = early ? ['Éveil'] : SUBJECTS
    for (const s of subjects) {
      out.push({
        sourcedId: uid('crs', `${lvl}_${s}`.replace(/\s+/g, '')),
        status: 'active',
        dateLastModified: new Date().toISOString(),
        schoolYearSourcedId: uid('as', 'year'),
        title: `${s} · ${labelOf(lvl)}`,
        courseCode: ascii(`${lvl.toUpperCase()}-${s.slice(0, 3).toUpperCase()}`),
        grades: lvl,
        orgSourcedId: uid('org', 'school'),
        subjects: s,
      })
    }
  }
  return out
}

// ── 4. CLASSES — LE GROUPE qui suit un cours, avec son enseignant. ──────────
export function classesOR() {
  const d = db()
  const out = []
  for (const c of d.classes || []) {
    const early = LEVELS.find(l => l.key === c.level)?.cycle === 'petiteEnfance'
    const subjects = early ? ['Éveil'] : SUBJECTS
    for (const s of subjects) {
      out.push({
        sourcedId: uid('cls', `${c.id}_${s}`.replace(/\s+/g, '')),
        status: 'active',
        dateLastModified: new Date().toISOString(),
        title: `${c.name} · ${s}`,
        grades: c.level || '',
        courseSourcedId: uid('crs', `${c.level}_${s}`.replace(/\s+/g, '')),
        classCode: ascii(`${c.id}-${s.slice(0, 3).toUpperCase()}`),
        classType: 'scheduled',
        location: '',
        schoolSourcedId: uid('org', 'school'),
        termSourcedIds: TERMS.map(t => uid('as', t.key)).join(','),
        subjects: s,
      })
    }
  }
  return out
}

// ── 5. USERS — élèves, enseignants, parents, administration. ────────────────
const ROLE_MAP = {
  teacher: 'teacher', schooladmin: 'administrator', admin: 'administrator',
  supervisor: 'aide', security: 'aide', parent: 'parent', owner: 'administrator',
}

export function users() {
  const d = db()
  const out = []

  for (const s of d.students || []) {
    const parent = (d.users || []).find(u => (u.childIds || []).includes(s.id))
    out.push({
      sourcedId: uid('usr', s.id),
      status: s.archived ? 'tobedeleted' : 'active',   // ARCHIVÉ ≠ SUPPRIMÉ, même ici
      dateLastModified: new Date().toISOString(),
      enabledUser: s.archived ? 'false' : 'true',
      orgSourcedIds: uid('org', 'school'),
      role: 'student',
      username: s.id,
      givenName: s.name.split(' ')[0] || '',
      familyName: s.name.split(' ').slice(1).join(' ') || '',
      email: s.email || '',
      phone: s.phone || '',
      agents: parent ? uid('usr', parent.id) : '',      // le lien parent → enfant
      identifier: s.rollNo || '',
      grades: (d.classes || []).find(c => c.id === s.classId)?.level || '',
    })
  }

  for (const u of d.users || []) {
    if (u.role === 'parent' || ROLE_MAP[u.role]) {
      out.push({
        sourcedId: uid('usr', u.id),
        status: u.disabled ? 'tobedeleted' : 'active',
        dateLastModified: new Date().toISOString(),
        enabledUser: u.disabled ? 'false' : 'true',
        orgSourcedIds: uid('org', 'school'),
        role: ROLE_MAP[u.role] || 'aide',
        username: u.email,
        givenName: u.name.split(' ')[0] || '',
        familyName: u.name.split(' ').slice(1).join(' ') || '',
        email: u.email || '',
        phone: u.phone || '',
        agents: '',
        identifier: u.id,
        grades: '',
      })
    }
  }
  return out
}

// ── 6. ENROLLMENTS — L'ENTITÉ QUI NOUS MANQUAIT. ───────────────────────────
/**
 * Une INSCRIPTION relie un utilisateur à une classe, avec un RÔLE et des DATES.
 * C'est ce qui permet de dire « cet élève a quitté ce cours en janvier » — chose
 * strictement impossible avec un `classId` posé sur l'élève.
 */
export function enrollments() {
  const d = db()
  const out = []
  for (const cls of classesOR()) {
    const baseClassId = cls.classCode.split('-')[0]   // ASCII, donc stable
    const subject = cls.subjects

    // Les élèves du groupe.
    for (const s of (d.students || []).filter(x => x.classId === baseClassId && !x.archived)) {
      out.push({
        sourcedId: uid('enr', `${s.id}_${cls.sourcedId}`),
        status: 'active',
        dateLastModified: new Date().toISOString(),
        classSourcedId: cls.sourcedId,
        schoolSourcedId: uid('org', 'school'),
        userSourcedId: uid('usr', s.id),
        role: 'student',
        primary: 'false',
        beginDate: s.admissionDate || '2025-09-15',
        endDate: '',
      })
    }

    // L'enseignant du groupe.
    const t = (d.teachers || []).find(x => (x.classes || []).includes(baseClassId))
    if (t) {
      out.push({
        sourcedId: uid('enr', `${t.id}_${cls.sourcedId}`),
        status: 'active',
        dateLastModified: new Date().toISOString(),
        classSourcedId: cls.sourcedId,
        schoolSourcedId: uid('org', 'school'),
        userSourcedId: uid('usr', t.id),
        role: 'teacher',
        primary: 'true',
        beginDate: t.joiningDate || '2025-09-15',
        endDate: '',
      })
    }
  }
  return out
}

// ── 7. RESULTS (Gradebook) — les notes, dans la norme. ─────────────────────
export function results() {
  const out = []
  for (const r of reports()) {
    // Un enfant de crèche n'a pas de note. On n'invente pas un score pour
    // remplir une norme : on n'exporte pas ce qui n'existe pas.
    if (r.early) continue
    const avg = average(r)
    if (avg == null) continue
    out.push({
      sourcedId: uid('res', r.id),
      status: 'active',
      dateLastModified: new Date().toISOString(),
      lineItemSourcedId: uid('li', `${r.level}_${r.term}`),
      studentSourcedId: uid('usr', r.studentId),
      scoreStatus: 'fully graded',
      score: String(avg),
      scoreDate: new Date(r.at).toISOString().slice(0, 10),
      comment: r.comment || '',
    })
  }
  return out
}

// ── L'EXPORT CSV (liaison CSV de OneRoster v1.2) ───────────────────────────
const csv = rows => {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = v => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')
}

/** Le paquet complet : un fichier par entité, comme l'exige la liaison CSV. */
export function exportCsv() {
  return {
    'manifest.csv': csv([
      { propertyName: 'manifest.version', value: '1.0' },
      { propertyName: 'oneroster.version', value: '1.2' },
      { propertyName: 'file.orgs', value: 'bulk' },
      { propertyName: 'file.academicSessions', value: 'bulk' },
      { propertyName: 'file.courses', value: 'bulk' },
      { propertyName: 'file.classes', value: 'bulk' },
      { propertyName: 'file.users', value: 'bulk' },
      { propertyName: 'file.enrollments', value: 'bulk' },
      { propertyName: 'file.results', value: 'bulk' },
    ]),
    'orgs.csv': csv(orgs()),
    'academicSessions.csv': csv(academicSessions()),
    'courses.csv': csv(courses()),
    'classes.csv': csv(classesOR()),
    'users.csv': csv(users()),
    'enrollments.csv': csv(enrollments()),
    'results.csv': csv(results()),
  }
}

/** Le compte, pour l'écran : ce qu'on exporte réellement. */
export function summary() {
  return {
    orgs: orgs().length,
    academicSessions: academicSessions().length,
    courses: courses().length,
    classes: classesOR().length,
    users: users().length,
    enrollments: enrollments().length,
    results: results().length,
  }
}
