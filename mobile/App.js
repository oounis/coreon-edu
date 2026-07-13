import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
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
  // Sans session, on ouvre par le rituel de marque (Welcome) avant Login.
  const [welcomed, setWelcomed] = useState(false)
  // Nunito = la voix du web (index.css) ; chargée ici une fois pour toute l'app.
  // useFonts renvoie AUSSI une erreur — et on l'ignorait. Résultat : si la police
  // ne se charge pas (réseau lent, hors ligne, CDN bloqué), l'app restait bloquée
  // sur le rond de chargement, POUR TOUJOURS. Sur un téléphone bon marché avec une
  // mauvaise connexion, l'utilisateur ne voyait jamais l'application.
  // On affiche maintenant l'app quand même : une police système vaut mieux qu'un
  // écran vide. La marque tient sans sa police ; elle ne tient pas sans son écran.
  const [fontsLoaded, fontError] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold })

  const [bootError, setBootError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
      await hydrate()
      // Les modules qui touchent db() ne sont chargés qu'après l'hydratation.
      const [{ current }, clock, storage, Login, Shell, Welcome] = await Promise.all([
        import('@core/auth.js'),
        import('@core/clock.js'),
        import('@core/storage.js'),
        import('./src/screens/Login.js'),
        import('./src/Shell.js'),
        import('./src/screens/Welcome.js'),
      ])
      // Tant qu'il n'y a pas de vraie école : mode démonstration par défaut
      // (équivalent du ?live=1 du web), sans écraser un choix déjà mémorisé.
      if (storage.getItem('coreon_demo_live') == null) clock.setDemoLive(true)
      setMods({ Login: Login.default, Shell: Shell.default, Welcome: Welcome.default })
      setUser(current())
      setReady(true)
      } catch (e) {
        // Sans ce try/catch, une seule exception au démarrage rejetait la promesse
        // EN SILENCE : setReady(true) n'était jamais appelé et l'app restait sur le
        // rond de chargement, pour toujours. L'utilisateur ne voyait jamais rien, et
        // nous non plus. Un écran qui DIT ce qui ne va pas vaut mieux qu'un écran
        // qui tourne dans le vide.
        console.error('[boot]', e)
        setBootError(e)
      }
    })()
  }, [])

  if (bootError) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.canvas }}>
      <Text style={{ fontWeight: '800', fontSize: 16, color: C.ink, marginBottom: 8 }}>
        L'application n'a pas pu démarrer.
      </Text>
      <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>
        {String(bootError && (bootError.message || bootError))}
      </Text>
    </View>
  )

  if (!ready || (!fontsLoaded && !fontError)) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.canvas }}>
      <ActivityIndicator size="large" color="#0D9488" />
    </View>
  )

  const { Login, Shell, Welcome } = mods
  const showWelcome = !user && !welcomed
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.canvas }}>
        <StatusBar style={showWelcome ? 'light' : 'dark'} />
        {user
          ? <Shell key={user.id} user={user} onLogout={() => { setUser(null); setWelcomed(true) }} />
          : showWelcome
            ? <Welcome onDone={() => setWelcomed(true)} />
            : <Login onLogin={setUser} />}
      </View>
    </SafeAreaProvider>
  )
}
