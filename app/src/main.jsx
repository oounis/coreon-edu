import React from 'react'
import ReactDOM from 'react-dom/client'
import { setAssetBase } from '@core/livestatus.js'
import { getItem } from '@core/storage.js'
import { setDemoLive } from '@core/clock.js'
import App from './App.jsx'
import RemoteGate from './RemoteGate.jsx'
import { isRemote, remoteMail } from './remote.js'
import { setMailTransport } from '@core/admissions.js'
import { mailReady, sendViaWorker } from './mail.js'
import { initTelemetry } from './telemetry.js'
// Suivi des erreurs (KOG-86) : en premier, pour voir même un plantage de
// démarrage. Sans DSN ou sur localhost, cette ligne ne fait strictement rien.
initTelemetry()
setAssetBase(import.meta.env.BASE_URL)
// Emails du candidat (accusé de réception + chaque décision). Par priorité :
// Worker Cloudflare coreon-mail (envoi réel via Zoho, expéditeur
// contact@kogiagroup.com) → backend serveur → sinon rien (l'email reste
// « préparé » et journalisé sur le dossier, visible côté admin — jamais faussé).
if (mailReady()) setMailTransport(sendViaWorker)
else if (isRemote()) setMailTransport(remoteMail)
// Après un déploiement, les noms des morceaux (code-splitting) changent : un
// onglet resté ouvert clique un module → l'ancien fichier n'existe plus → le
// clic « ne fait rien ». Vite émet vite:preloadError dans ce cas exact : on
// recharge UNE fois pour récupérer la nouvelle version (garde anti-boucle).
window.addEventListener('vite:preloadError', e => {
  e.preventDefault()
  if (sessionStorage.getItem('coreon_chunk_reload')) return   // déjà tenté
  sessionStorage.setItem('coreon_chunk_reload', '1')
  location.reload()
})
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem('coreon_chunk_reload'), 10000))
// Tant qu'aucune vraie école n'utilise le produit : première visite en mode
// démonstration (journée de classe simulée), comme sur mobile. ?live=0 ou le
// bouton « revenir au réel » désactivent, et le choix est mémorisé.
// En mode SERVEUR (coreon_api posé), jamais : une vraie école vit au réel.
if (!isRemote() && getItem('coreon_demo_live') == null) setDemoLive(true)
import './index.css'
import '@fontsource-variable/nunito'
import '@fontsource-variable/plus-jakarta-sans'
// Tajawal : le Nunito de l'arabe — rond, chaleureux. Chargé localement comme les
// autres (jamais de CDN). Les trois graisses que l'interface utilise vraiment.
import '@fontsource/tajawal/400.css'
import '@fontsource/tajawal/500.css'
import '@fontsource/tajawal/700.css'
import { locale, dir, setLocale, loadDict } from '@core/i18n.js'
import { settings } from '@core/db.js'
import { setCurrency } from '@core/currency.js'
import { setLocalePack } from '@core/locales.js'

// ⚠️ QA FAT 2026-07-26 : hors-ligne, un chunk paresseux qui échoue laissait un
// ÉCRAN BLANC muet. Vite émet 'vite:preloadError' — on recharge une fois
// (souvent le réseau est revenu) au lieu de mourir en silence.
window.addEventListener('vite:preloadError', e => {
  e.preventDefault()
  if (!sessionStorage.getItem('coreon_chunk_retry')) {
    sessionStorage.setItem('coreon_chunk_retry', '1')
    location.reload()
  }
})
window.addEventListener('load', () => sessionStorage.removeItem('coreon_chunk_retry'))
import { applyCurriculum } from '@core/academic.js'
// Paramètres de l'ÉCOLE posés avant le premier rendu : le pack de PAYS (régions,
// pièce d'identité, cadre légal), la devise (money() la lit en mémoire) et la
// langue PAR DÉFAUT — cette dernière ne s'applique que si l'appareil n'a pas
// déjà fait son propre choix (coreon_locale absent).
const _school = settings()
setLocalePack(_school.country)
setCurrency(_school.currency)
applyCurriculum()   // CR-024 : matières + barème du pays, avant le 1er rendu
if (getItem('coreon_locale') == null && _school.locale) setLocale(_school.locale)
// L'arabe n'est pas une traduction, c'est une DIRECTION : la langue et le sens
// de lecture se posent sur <html> avant le premier rendu.
document.documentElement.lang = locale()
document.documentElement.dir = dir()
// Le DICTIONNAIRE de la langue lue est un morceau à part (i18n.ar.js /
// i18n.en.js) : une visiteuse française ne télécharge plus l'arabe ni l'anglais.
// On l'attend AVANT le premier rendu — sinon l'écran s'afficherait un instant en
// français puis basculerait sous les yeux. Le français, lui, n'attend rien
// (il EST la clé) ; et si le morceau manque, `t()` retombe sur le français.
loadDict().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>{isRemote() ? <RemoteGate/> : <App/>}</React.StrictMode>)
})
