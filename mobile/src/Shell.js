// Coquille de navigation : barre d'onglets par rôle + pile d'écrans.
// Volontairement fait main (pas de react-navigation) : ~100 lignes suffisent
// pour onglets + push/back, zéro dépendance native de plus, et le jour où on
// veut expo-router, seul ce fichier change — les écrans reçoivent déjà
// ({ user, params, nav }) comme contrat stable.
import { useState, useCallback, useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { NAV } from '@core/nav.js'
import { canAccess } from '@core/access.js'
import { logout as coreLogout } from '@core/auth.js'
import { ROLE } from '@core/theme.js'
import { Ic } from './icons.js'
import { C, F } from './ui.js'
import { Screen, EmptyState, Row, tap } from './components.js'
import { SCREENS } from './registry.js'

// 4 onglets clés par rôle ; tout le reste vit dans « Plus ».
const TABS = {
  parent:  ['/app', '/app/live', '/app/social', '/app/messages'],
  teacher: ['/app', '/app/evaluate', '/app/attendance', '/app/social'],
  default: ['/app', '/app/notices', '/app/events', '/app/messages'],
}

const navItem = to => NAV.find(n => n.to === to)
const labelOf = (item, role) => (item.labelFor && item.labelFor[role]) || item.label

function ComingSoon({ title }) {
  return (
    <Screen title={title}>
      <EmptyState icon="Hammer" title="Bientôt sur mobile"
        sub="Cet écran existe déjà sur le web et arrive dans l'application. Rien ne se perd : mêmes données des deux côtés." />
    </Screen>
  )
}

// « Plus » : le reste du menu du rôle, même source de vérité que le web (nav.js).
function More({ user, nav }) {
  const tabs = TABS[user.role] || TABS.default
  const rest = NAV.filter(n => n.roles.includes(user.role) && !tabs.includes(n.to))
  return (
    <Screen title="Plus" sub={`${ROLE[user.role]?.label || ''} · tout le reste du menu`}>
      <View style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line, paddingHorizontal: 16 }}>
        {rest.map(n => (
          <Row key={n.to} icon={n.icon} iconColor={ROLE[user.role]?.color || C.muted}
            title={labelOf(n, user.role)}
            right={<Ic n="ChevronRight" size={15} color={C.muted} />}
            onPress={() => nav.navigate(n.to)} />
        ))}
        <Row icon="LogOut" iconColor={C.danger} title="Se déconnecter" onPress={nav.logout} style={{ borderBottomWidth: 0 }} />
      </View>
    </Screen>
  )
}

export default function Shell({ user, onLogout }) {
  const insets = useSafeAreaInsets()
  const [stack, setStack] = useState([{ route: '/app', params: null }])
  const top = stack[stack.length - 1]

  const navigate = useCallback((route, params = null) => {
    if (route !== '/more' && !route.startsWith('~') && !canAccess(user.role, route)) return
    setStack(s => [...s, { route, params }])
  }, [user.role])
  const back = useCallback(() => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)), [])
  const switchTab = useCallback(route => { tap(); setStack([{ route, params: null }]) }, [])
  const nav = useMemo(() => ({
    navigate, back, canBack: stack.length > 1,
    logout: () => { coreLogout(); onLogout() },
  }), [navigate, back, stack.length, onLogout])

  const tabs = TABS[user.role] || TABS.default
  const Comp = top.route === '/more' ? More : SCREENS[top.route]
  const item = navItem(top.route)
  const accent = ROLE[user.role]?.color || '#6366F1'

  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <View style={{ flex: 1 }}>
        {stack.length > 1 && (
          <Pressable onPress={back} style={{ position: 'absolute', top: Math.max(insets.top, 40) + 16, right: 20, zIndex: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 999, padding: 9 }}>
            <Ic n="ArrowLeft" size={16} color={C.ink} />
          </Pressable>
        )}
        {Comp
          ? <Comp user={user} params={top.params} nav={nav} />
          : <ComingSoon title={item ? labelOf(item, user.role) : 'Écran'} />}
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line, paddingBottom: Math.max(insets.bottom, 10) + 4, paddingTop: 8 }}>
        {[...tabs, '/more'].map(to => {
          const it = to === '/more' ? { icon: 'Menu', label: 'Plus' } : navItem(to)
          if (!it) return null
          const isActive = top.route === to || (stack[0].route === to && stack.length > 1) || (to === '/more' && top.route === '/more')
          return (
            <Pressable key={to} onPress={() => switchTab(to)} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <Ic n={it.icon} size={21} color={isActive ? accent : C.muted} />
              <Text numberOfLines={1} style={{ fontSize: 10, fontFamily: F.bold, fontWeight: '700', color: isActive ? accent : C.muted }}>
                {to === '/more' ? 'Plus' : labelOf(it, user.role)}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
