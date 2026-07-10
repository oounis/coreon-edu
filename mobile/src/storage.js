// Branchement du stockage natif sur la couture `core/src/storage.js`.
//
// db.js exige un stockage SYNCHRONE ; AsyncStorage ne l'est pas. On garde donc
// toutes les paires en mémoire (lectures synchrones) et chaque écriture est
// répliquée vers AsyncStorage en tâche de fond. `hydrate()` recharge la mémoire
// au démarrage — à attendre AVANT le premier appel à db().
//
// (react-native-mmkv ferait ça nativement, mais exige un dev-build ; on garde
// AsyncStorage tant que l'app tourne dans Expo Go. La couture rend l'échange
// trivial le jour venu — seul ce fichier change.)
import AsyncStorage from '@react-native-async-storage/async-storage'
import { setStorage, setSessionStorage } from '@core/storage.js'

const cache = new Map()

const adapter = {
  getItem: k => (cache.has(k) ? cache.get(k) : null),
  setItem: (k, v) => { cache.set(k, String(v)); AsyncStorage.setItem(k, String(v)).catch(() => {}) },
  removeItem: k => { cache.delete(k); AsyncStorage.removeItem(k).catch(() => {}) },
}

export async function hydrate() {
  const keys = await AsyncStorage.getAllKeys()
  const pairs = keys.length ? await AsyncStorage.multiGet(keys) : []
  for (const [k, v] of pairs) if (v != null) cache.set(k, v)
  setStorage(adapter)
  // Sur téléphone, la session survit au redémarrage (on ne retape pas son mot
  // de passe à chaque ouverture) : même adaptateur persistant que les données.
  setSessionStorage(adapter)
}
