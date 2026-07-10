import { useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { db } from '@core/db.js'
import { login, loginAs } from '@core/auth.js'
import { ROLE } from '@core/theme.js'
import { C, S } from '../ui.js'

// Même contrat que la page web : e-mail + mot de passe, et les boutons de
// connexion rapide de la démo (un par rôle). À la venue du backend, seul
// core/auth.js change — cet écran reste tel quel.
export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

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

  return (
    <KeyboardAvoidingView style={S.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Text style={{ fontSize: 34 }}>🐋</Text>
          <Text style={[S.h1, { marginTop: 6 }]}>coreon <Text style={{ color: ROLE.owner.color }}>edu</Text></Text>
          <Text style={S.sub}>L'école, en un coup d'œil — dans votre poche.</Text>
        </View>

        <View style={S.card}>
          <Text style={S.label}>E-mail</Text>
          <TextInput
            value={email} onChangeText={t => { setEmail(t); setErr('') }}
            autoCapitalize="none" keyboardType="email-address" placeholder="vous@ecole.tn"
            placeholderTextColor={C.muted}
            style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, marginTop: 6, marginBottom: 12, color: C.ink }}
          />
          <Text style={S.label}>Mot de passe</Text>
          <TextInput
            value={pw} onChangeText={t => { setPw(t); setErr('') }}
            secureTextEntry placeholder="Mot de passe" placeholderTextColor={C.muted}
            onSubmitEditing={go}
            style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, marginTop: 6, color: C.ink }}
          />
          {!!err && <Text style={{ color: C.danger, marginTop: 10, fontWeight: '600' }}>{err}</Text>}
          <Pressable onPress={go} style={{ backgroundColor: ROLE.owner.color, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 16 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Se connecter</Text>
          </Pressable>
        </View>

        <Text style={[S.label, { textAlign: 'center', marginVertical: 14 }]}>Démonstration — entrer comme :</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          {quick.map(u => {
            const r = ROLE[u.role]
            return (
              <Pressable key={u.id} onPress={() => quickGo(u.id)}
                style={{ borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}>
                <Text style={{ color: r.color, fontWeight: '700', fontSize: 13 }}>{r.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
