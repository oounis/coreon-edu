import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito'
import { hydrate } from './src/storage.js'
import { C } from './src/ui.js'

// L'app ne rend RIEN tant que le stockage natif n'est pas hydraté : le premier
// db() déclenche seed/migrate, il doit voir les données déjà rechargées.
export default function App() {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState(null)
  const [mods, setMods] = useState(null)
  // Nunito = la voix du web (index.css) ; chargée ici une fois pour toute l'app.
  const [fontsLoaded] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold })

  useEffect(() => {
    (async () => {
      await hydrate()
      // Les modules qui touchent db() ne sont chargés qu'après l'hydratation.
      const [{ current }, clock, storage, Login, Shell] = await Promise.all([
        import('@core/auth.js'),
        import('@core/clock.js'),
        import('@core/storage.js'),
        import('./src/screens/Login.js'),
        import('./src/Shell.js'),
      ])
      // Tant qu'il n'y a pas de vraie école : mode démonstration par défaut
      // (équivalent du ?live=1 du web), sans écraser un choix déjà mémorisé.
      if (storage.getItem('coreon_demo_live') == null) clock.setDemoLive(true)
      setMods({ Login: Login.default, Shell: Shell.default })
      setUser(current())
      setReady(true)
    })()
  }, [])

  if (!ready || !fontsLoaded) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.canvas }}>
      <ActivityIndicator size="large" color="#0D9488" />
    </View>
  )

  const { Login, Shell } = mods
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.canvas }}>
        <StatusBar style="dark" />
        {user
          ? <Shell key={user.id} user={user} onLogout={() => setUser(null)} />
          : <Login onLogin={setUser} />}
      </View>
    </SafeAreaProvider>
  )
}
