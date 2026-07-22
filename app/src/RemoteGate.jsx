// La porte du mode serveur : tant qu'il n'y a pas de session serveur, seul
// l'écran de connexion existe — l'application (et ses données) n'apparaît
// qu'authentifié. En mode démo (pas de `coreon_api`), ce composant n'est
// jamais monté : la démo publique ne change pas d'un pixel.
import { useState, useEffect } from 'react'
import App from './App.jsx'
import { hasSession, remoteLogin, startSync } from './remote.js'

export default function RemoteGate() {
  const [ready, setReady] = useState(hasSession())
  useEffect(() => { if (ready) startSync() }, [ready])
  if (!ready) return <RemoteLogin onDone={() => setReady(true)} />
  return <App />
}

function RemoteLogin({ onDone }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault()
    setBusy(true); setErr('')
    const r = await remoteLogin(email, pw)
    setBusy(false)
    if (r.error) return setErr(r.error)
    location.hash = '#/app'   // connecté → l'atelier, pas la page publique
    onDone()
  }
  return (
    <div className="min-h-screen grid place-items-center bg-canvas p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-7">
        <div className="text-2xl font-extrabold mb-1">Coreon Edu</div>
        <p className="text-sm text-muted mb-5">L'école de votre établissement : connectez-vous.</p>
        <label className="block mb-3">
          <span className="text-xs font-semibold text-muted">E-mail</span>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm" />
        </label>
        <label className="block mb-4">
          <span className="text-xs font-semibold text-muted">Mot de passe</span>
          <input type="password" required value={pw} onChange={e => setPw(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm" />
        </label>
        {err && <p className="text-sm font-semibold mb-3" style={{ color: '#DC4B54' }} role="alert">{err}</p>}
        <button disabled={busy} className="w-full rounded-xl accent-bg text-white font-bold py-2.5 disabled:opacity-50">
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <p className="text-[11px] text-muted mt-4">Session de 8 heures · les données restent sur le serveur de l'école.</p>
      </form>
    </div>
  )
}
