import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { hydrate } from './src/storage.js'
import { C } from './src/ui.js'

// L'app ne rend RIEN tant que le stockage natif n'est pas hydraté : le premier
// db() déclenche seed/migrate, il doit voir les données déjà rechargées.
export default function App() {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState(null)
  const [screens, setScreens] = useState(null)

  useEffect(() => {
    (async () => {
      await hydrate()
      // Les modules qui touchent db() ne sont chargés qu'après l'hydratation.
      const [{ current }, clock, Login, Dashboard] = await Promise.all([
        import('@core/auth.js'),
        import('@core/clock.js'),
        import('./src/screens/Login.js'),
        import('./src/screens/Dashboard.js'),
      ])
      // Tant qu'il n'y a pas de vraie école : mode démonstration par défaut
      // (équivalent du ?live=1 du web), sans écraser un choix déjà mémorisé.
      const { getItem } = await import('@core/storage.js')
      if (getItem('coreon_demo_live') == null) clock.setDemoLive(true)
      setScreens({ Login: Login.default, Dashboard: Dashboard.default })
      setUser(current())
      setReady(true)
    })()
  }, [])

  if (!ready) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.canvas }}>
      <ActivityIndicator size="large" color="#0D9488" />
    </View>
  )

  const { Login, Dashboard } = screens
  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <StatusBar style="dark" />
      {user
        ? <Dashboard user={user} onLogout={() => setUser(null)} />
        : <Login onLogin={setUser} />}
    </View>
  )
}
