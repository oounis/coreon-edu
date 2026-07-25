// ════════════════════════════════════════════════════════════════════════════
// L'ENVOI D'EMAIL DU SITE — de vrais emails au candidat, sans backend.
//
// Le site est statique : un navigateur ne peut pas parler SMTP. On passe donc
// par un petit Worker Cloudflare (coreon-mail) qui relaie HTTP → SMTP Zoho et
// envoie depuis contact@kogiagroup.com. Le Worker verrouille l'Origin sur ce
// site et exige un jeton partagé (barrière anti-abus ; l'expéditeur est
// toujours contact@kogiagroup.com, jamais choisi par l'appelant).
//
// SANS Worker joignable, l'envoi échoue proprement et `admissions.js` garde
// l'email « préparé » (journalisé, jamais faussé).
// ════════════════════════════════════════════════════════════════════════════
const WORKER_URL = 'https://coreon-mail.kogiagroup.workers.dev'
// Jeton partagé : simple barrière (le Worker vérifie SURTOUT l'Origin + limite
// le débit). ⚠️ AUDIT 2026-07-25 (S-4) : l'ancien jeton vivait EN CLAIR dans ce
// fichier public — il a été RÉVOQUÉ. Le jeton vient désormais du build (secret
// CI `VITE_MAIL_TOKEN`) : plus jamais dans le dépôt ni son historique.
const WORKER_TOKEN = import.meta.env?.VITE_MAIL_TOKEN || ''

export const mailReady = () => Boolean(WORKER_URL && WORKER_TOKEN)

export async function sendViaWorker(mail) {
  if (!mail?.to) throw new Error('destinataire manquant')
  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${WORKER_TOKEN}` },
    body: JSON.stringify({ to: mail.to, subject: mail.subject, text: mail.text }),
  })
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json()).error || '' } catch { /* noop */ }
    throw new Error(`mail worker ${res.status}${detail ? ': ' + detail : ''}`)
  }
  return true
}
