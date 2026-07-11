import React from 'react'
import ReactDOM from 'react-dom/client'
import { setAssetBase } from '@core/livestatus.js'
import { getItem } from '@core/storage.js'
import { setDemoLive } from '@core/clock.js'
import App from './App.jsx'
setAssetBase(import.meta.env.BASE_URL)
// Tant qu'aucune vraie école n'utilise le produit : première visite en mode
// démonstration (journée de classe simulée), comme sur mobile. ?live=0 ou le
// bouton « revenir au réel » désactivent, et le choix est mémorisé.
if (getItem('coreon_demo_live') == null) setDemoLive(true)
import './index.css'
import '@fontsource-variable/nunito'
import '@fontsource-variable/plus-jakarta-sans'
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
