import { useEffect, useMemo, useRef, useState } from 'react'
import { SKIN, EYE } from '@core/mark.js'
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Animated, Easing, StyleSheet } from 'react-native'
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg'
import { db } from '@core/db.js'
import { login, loginAs } from '@core/auth.js'
import { ROLE } from '@core/theme.js'
import { C, S, F, tap } from '../components.js'
import { KogiaMark } from '../kmark.js'

// La marque : indigo → violet, la voix du cachalot.
// La voie de Coreon Edu vient du cœur — plus de marque recopiée à la main ici.
const BRAND = SKIN.from
const BRAND2 = SKIN.to

// Même contrat que la page web : e-mail + mot de passe, et les boutons de
// connexion rapide de la démo (un par rôle). À la venue du backend, seul
// core/auth.js change — cet écran reste tel quel.
export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [focus, setFocus] = useState(null) // 'email' | 'pw' | null

  // Entrée en douceur : logo, carte, puis pastilles — 250 ms en tout.
  const NATIVE = Platform.OS !== 'web'
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current
  useEffect(() => {
    Animated.stagger(70, anims.map(v =>
      Animated.timing(v, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE })
    )).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const enter = i => ({
    opacity: anims[i],
    transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  })

  const quick = useMemo(() => {
    const roles = ['schooladmin', 'admin', 'teacher', 'supervisor', 'security', 'parent']
    return db().users.filter(u => roles.includes(u.role))
      .filter((u, i, a) => a.findIndex(x => x.role === u.role) === i)
  }, [])

  const go = () => {
    const u = login(email, pw)
    if (u && !u.disabled) return onLogin(u)
    setErr(u && u.disabled ? 'Ce compte a été désactivé. Contactez la direction.' : 'E-mail ou mot de passe incorrect.')
  }
  const quickGo = id => onLogin(loginAs(id))

  const field = name => ({
    borderWidth: 1.5,
    borderColor: focus === name ? BRAND : C.line,
    backgroundColor: focus === name ? '#FAFAFF' : '#FFFFFF',
    borderRadius: 12, padding: 12, marginTop: 6,
    color: C.ink, fontFamily: F.semi, fontSize: 15,
    // Sur le web, la bordure indigo EST l'indicateur de focus — pas l'anneau natif.
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null),
  })

  return (
    <KeyboardAvoidingView style={S.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <Animated.View style={[{ alignItems: 'center', marginBottom: 30 }, enter(0)]}>
          {/* La marque en pastille : le cachalot blanc sur son dégradé. */}
          <View style={{
            width: 68, height: 68, borderRadius: 21, overflow: 'hidden',
            alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND,
            shadowColor: BRAND, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
          }}>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={BRAND} />
                  <Stop offset="1" stopColor={BRAND2} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#tile)" />
            </Svg>
            {/* View englobante : position relative → peint AU-DESSUS du dégradé absolu (web). */}
            <View style={{ marginTop: 2 }}>
              {/* Le lockup de connexion porte LA MARQUE, pas la mascotte. */}
              <KogiaMark size={40} color="#FFFFFF" />
            </View>
          </View>
          <Text style={[S.h1, { marginTop: 14 }]}>coreon <Text style={{ color: BRAND }}>edu</Text></Text>
          <Text style={[S.sub, { marginTop: 4 }]}>{"L'école, en un coup d'œil — dans votre poche."}</Text>
        </Animated.View>

        <Animated.View style={[S.card, { padding: 20 }, enter(1)]}>
          <Text style={S.label}>E-mail</Text>
          <TextInput
            value={email} onChangeText={t => { setEmail(t); setErr('') }}
            onFocus={() => setFocus('email')} onBlur={() => setFocus(f => (f === 'email' ? null : f))}
            autoCapitalize="none" keyboardType="email-address" placeholder="vous@ecole.tn"
            placeholderTextColor={C.muted}
            style={[field('email'), { marginBottom: 14 }]}
          />
          <Text style={S.label}>Mot de passe</Text>
          <TextInput
            value={pw} onChangeText={t => { setPw(t); setErr('') }}
            onFocus={() => setFocus('pw')} onBlur={() => setFocus(f => (f === 'pw' ? null : f))}
            secureTextEntry placeholder="Mot de passe" placeholderTextColor={C.muted}
            onSubmitEditing={go}
            style={field('pw')}
          />
          {!!err && <Text style={{ color: C.danger, marginTop: 10, fontFamily: F.semi, fontWeight: '600' }}>{err}</Text>}
          <Pressable onPress={() => { tap(); go() }} style={({ pressed }) => ({
            backgroundColor: BRAND, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 18,
            opacity: pressed ? 0.88 : 1,
          })}>
            <Text style={{ color: '#fff', fontFamily: F.black, fontWeight: '800', fontSize: 15 }}>Se connecter</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={enter(2)}>
          <Text style={[S.label, { textAlign: 'center', marginTop: 22, marginBottom: 12 }]}>Démonstration — entrer comme :</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {quick.map(u => {
              const r = ROLE[u.role]
              return (
                <Pressable key={u.id} onPress={() => { tap(); quickGo(u.id) }}
                  style={({ pressed }) => ({
                    backgroundColor: r.soft, borderWidth: 1, borderColor: r.color + '55',
                    borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15,
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Text style={{ color: r.color, fontFamily: F.bold, fontWeight: '700', fontSize: 13 }}>{r.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
