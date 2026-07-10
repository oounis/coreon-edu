// ── Le seul endroit du cœur qui touche la plateforme ────────────────────────
//
// Le web a `localStorage`. Android n'en a pas. Plutôt que de saupoudrer des
// `typeof window` dans toute la base, tout passe par ici : chaque plateforme
// branche son implémentation au démarrage, et le reste du code n'en sait rien.
//
// L'API est SYNCHRONE, parce que db.js l'est. Côté Android on branche donc un
// stockage synchrone (react-native-mmkv), pas AsyncStorage.
//
// C'est aussi la couture par laquelle passera le serveur : le jour où les
// données vivent dans Postgres, c'est ce fichier qui devient un cache local et
// db.js n'aura pas à changer.

const memory = () => {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)) },
    removeItem: k => { m.delete(k) },
  }
}

// Défaut : le navigateur s'il est là (web, tests jsdom), sinon la mémoire.
// Un stockage en mémoire n'échoue jamais — il oublie, ce qui est un mode
// dégradé acceptable (navigation privée, quota plein) mais jamais un crash.
let impl = (typeof localStorage !== 'undefined' && localStorage) || memory()

export function setStorage(next) { impl = next || memory() }

export const getItem = k => { try { return impl.getItem(k) } catch { return null } }
export const setItem = (k, v) => { try { impl.setItem(k, v) } catch { /* quota, mode privé */ } }
export const removeItem = k => { try { impl.removeItem(k) } catch { /* ignore */ } }

// ── Session (auth) ───────────────────────────────────────────────────────────
// Même couture, durée de vie différente : le web veut `sessionStorage` (la
// session meurt avec l'onglet), Android branche un stockage persistant — sur
// téléphone on ne redemande pas le mot de passe à chaque ouverture.
let sessionImpl = (typeof sessionStorage !== 'undefined' && sessionStorage) || memory()

export function setSessionStorage(next) { sessionImpl = next || memory() }

export const getSession = k => { try { return sessionImpl.getItem(k) } catch { return null } }
export const setSession = (k, v) => { try { sessionImpl.setItem(k, v) } catch { /* ignore */ } }
export const removeSession = k => { try { sessionImpl.removeItem(k) } catch { /* ignore */ } }
