// SUIVI DES ERREURS — KOG-86 : le produit phare tournait sans aucun signal.
// « S'il plante chez un vrai utilisateur, personne ne le sait. »
//
// Règles :
//  · Sans DSN (VITE_SENTRY_DSN absent) : RIEN — pas de chargement, pas de
//    réseau. Le SDK est un morceau à part, importé seulement si on s'en sert.
//  · Jamais sur localhost / 127.0.0.1 : les parcours e2e (qui PROVOQUENT des
//    erreurs exprès) et le poste de dev ne polluent pas le projet. `?telemetry=1`
//    force l'envoi pour tester la chaîne de bout en bout.
//  · PDPL / INPDP : aucune donnée personnelle. Pas d'IP (sendDefaultPii:false),
//    pas d'utilisateur, pas d'en-têtes ; l'URL est réduite à son chemin de hash
//    (les routes ne portent pas d'identifiant, on le garantit quand même).
//  · Le CSP (public/_headers) n'autorise que l'hôte d'ingestion du DSN.
let sdk = null

export async function initTelemetry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return null
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
  if (local && !/[?&]telemetry=1/.test(location.search)) return null
  try {
    const Sentry = await import('@sentry/browser')
    Sentry.init({
      dsn,
      release: import.meta.env.VITE_RELEASE || 'dev',
      environment: location.hostname,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      autoSessionTracking: false,
      beforeSend(event) {
        delete event.user
        if (event.request) event.request = { url: String(event.request.url || '').replace(/[?#].*$/, '') + (location.hash || '').split('?')[0] }
        return event
      },
    })
    sdk = Sentry
    return Sentry
  } catch (e) {
    console.warn('[telemetry] SDK indisponible', e?.message || e)
    return null
  }
}

/** À appeler depuis la frontière d'erreur : une erreur de rendu que React a
 *  attrapée n'est PAS une exception globale, Sentry ne la verrait pas seul. */
export function captureException(error, extra) {
  try { sdk?.captureException(error, extra ? { extra } : undefined) } catch { /* jamais bloquant */ }
}
