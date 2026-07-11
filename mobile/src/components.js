// Kit de composants natifs partagé par tous les écrans — même langage visuel
// que le web (canvas doux, cartes blanches, encre sombre, accent par rôle).
// Les écrans ne composent QUE ces briques + View/Text : cohérence garantie.
import { View, Text, Pressable, ScrollView, TextInput, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Ic } from './icons.js'
import { C, S, F } from './ui.js'

export { C, S, F }

// Petit retour tactile sur les interactions clés (silencieux sur le web).
export const tap = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) }

// ── Page ─────────────────────────────────────────────────────────────────────
export function Screen({ title, sub, right, children, scroll = true }) {
  const insets = useSafeAreaInsets()
  const padTop = Math.max(insets.top, 40) + 20
  const head = (title || right) && (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
      <View style={{ flex: 1 }}>
        {!!title && <Text style={S.h1}>{title}</Text>}
        {!!sub && <Text style={S.sub}>{sub}</Text>}
      </View>
      {right}
    </View>
  )
  if (!scroll) return <View style={[S.screen, { padding: 20, paddingTop: padTop, flex: 1 }]}>{head}{children}</View>
  return (
    <ScrollView style={S.screen} contentContainerStyle={{ padding: 20, paddingTop: padTop, paddingBottom: 110 }}>
      {head}{children}
    </ScrollView>
  )
}

export const Card = ({ style, children, onPress }) => onPress
  ? <Pressable onPress={onPress} style={({ pressed }) => [S.card, { opacity: pressed ? 0.85 : 1 }, style]}>{children}</Pressable>
  : <View style={[S.card, style]}>{children}</View>

export const Section = ({ title, right, children, style }) => (
  <View style={[{ marginTop: 18 }, style]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ fontWeight: '800', color: C.ink, fontSize: 16, flex: 1 }}>{title}</Text>
      {right}
    </View>
    {children}
  </View>
)

// ── Briques ──────────────────────────────────────────────────────────────────
export const Chip = ({ label, icon, color = C.muted, active, onPress }) => (
  <Pressable onPress={onPress} style={{
    flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 13, marginRight: 8,
    backgroundColor: active ? color : '#fff',
    borderWidth: 1, borderColor: active ? color : C.line,
  }}>
    {!!icon && <Ic n={icon} size={13} color={active ? '#fff' : color} />}
    <Text style={{ fontWeight: '700', fontSize: 13, color: active ? '#fff' : C.ink }}>{label}</Text>
  </Pressable>
)

export const Badge = ({ label, color = C.muted }) => (
  <View style={{ alignSelf: 'flex-start', backgroundColor: color + '1A', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
    <Text style={{ color, fontWeight: '800', fontSize: 11 }}>{label}</Text>
  </View>
)

export const Avatar = ({ name = '?', color = '#6366F1', size = 38 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color, fontWeight: '800', fontSize: size * 0.38 }}>
      {String(name).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
    </Text>
  </View>
)

export const Tile = ({ icon, label, value, sub, color = '#6366F1', onPress }) => (
  <Card onPress={onPress} style={{ flexBasis: '47%', flexGrow: 1 }}>
    <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: color + '1A', marginBottom: 8 }}>
      <Ic n={icon} size={18} color={color} />
    </View>
    <Text style={S.value}>{value}</Text>
    <Text style={S.label}>{label}{sub ? ` · ${sub}` : ''}</Text>
  </Card>
)

export const Row = ({ icon, iconColor = C.muted, avatar, title, sub, right, onPress, style }) => (
  <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: C.line, opacity: pressed ? 0.7 : 1,
  }, style]}>
    {avatar}
    {!!icon && !avatar && (
      <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: iconColor + '15' }}>
        <Ic n={icon} size={17} color={iconColor} />
      </View>
    )}
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text numberOfLines={1} style={{ fontWeight: '700', color: C.ink, fontSize: 14 }}>{title}</Text>
      {!!sub && <Text numberOfLines={2} style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>{sub}</Text>}
    </View>
    {right}
  </Pressable>
)

export const Btn = ({ label, icon, color = '#0D9488', kind = 'solid', small, onPress, disabled }) => (
  <Pressable onPress={onPress ? () => { tap(); onPress() } : undefined} disabled={disabled} style={({ pressed }) => ({
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 14, paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 14 : 18,
    backgroundColor: kind === 'solid' ? color : '#fff',
    borderWidth: kind === 'solid' ? 0 : 1, borderColor: color,
    opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
  })}>
    {!!icon && <Ic n={icon} size={small ? 14 : 16} color={kind === 'solid' ? '#fff' : color} />}
    <Text style={{ color: kind === 'solid' ? '#fff' : color, fontFamily: F.black, fontWeight: '800', fontSize: small ? 13 : 15 }}>{label}</Text>
  </Pressable>
)

export const Input = ({ style, ...rest }) => (
  <TextInput placeholderTextColor={C.muted} {...rest}
    style={[{ borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, color: C.ink, backgroundColor: '#fff' }, style]} />
)

export const EmptyState = ({ icon = 'Inbox', title, sub }) => (
  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
      <Ic n={icon} size={26} color={C.muted} />
    </View>
    <Text style={{ fontWeight: '800', color: C.ink, fontSize: 15 }}>{title}</Text>
    {!!sub && <Text style={{ color: C.muted, fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 30 }}>{sub}</Text>}
  </View>
)

// Barre de progression fine (moyennes, quorums…)
export const Bar = ({ pct = 0, color = '#6366F1', height = 6 }) => (
  <View style={{ height, borderRadius: height / 2, backgroundColor: C.canvas, overflow: 'hidden' }}>
    <View style={{ height, borderRadius: height / 2, width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} />
  </View>
)
