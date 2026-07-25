// Live weather via Open-Meteo (free, no API key). WMO codes -> our 3D icons.
const WMO={
  0:['clear','Ensoleillé'],1:['clear','Plutôt ensoleillé'],2:['partly','Partiellement nuageux'],3:['overcast','Couvert'],
  45:['fog','Brouillard'],48:['fog','Brouillard givrant'],
  51:['drizzle','Bruine légère'],53:['drizzle','Bruine'],55:['drizzle','Bruine dense'],56:['drizzle','Bruine verglaçante'],57:['drizzle','Bruine verglaçante'],
  61:['rain','Pluie légère'],63:['rain','Pluie'],65:['rain','Forte pluie'],66:['sleet','Pluie verglaçante'],67:['sleet','Pluie verglaçante'],
  71:['snow','Neige légère'],73:['snow','Neige'],75:['snow','Forte neige'],77:['snow','Grains de neige'],
  80:['rain','Averses'],81:['rain','Averses'],82:['rain','Fortes averses'],85:['snow','Averses de neige'],86:['snow','Averses de neige'],
  95:['thunder','Orage'],96:['thunder','Orage + grêle'],99:['thunder','Orage violent'],
}
export const mapWMO=code=>WMO[code]||['cloudy','Nuageux']

// La pastille météo affichait le nom de la ville de l'école mais TOUJOURS la météo
// de Tunis. Coordonnées des principales villes tunisiennes ; repli sur Tunis.
import { pack } from './locales.js'
export const CITIES={
  'Tunis':[36.8065,10.1815], 'Ariana':[36.8625,10.1956], 'Ben Arous':[36.7533,10.2189],
  'La Marsa':[36.8783,10.3247], 'Carthage':[36.8528,10.3233], 'Bizerte':[37.2744,9.8739],
  'Nabeul':[36.4513,10.7357], 'Hammamet':[36.4000,10.6167], 'Sousse':[35.8256,10.6369],
  'Monastir':[35.7643,10.8113], 'Mahdia':[35.5047,11.0622], 'Sfax':[34.7406,10.7603],
  'Gabès':[33.8815,10.0982], 'Médenine':[33.3549,10.5055], 'Djerba':[33.8076,10.8451],
  'Tataouine':[32.9297,10.4518], 'Gafsa':[34.4250,8.7842], 'Tozeur':[33.9197,8.1335],
  'Kairouan':[35.6781,10.0963], 'Kasserine':[35.1676,8.8365], 'Sidi Bouzid':[35.0382,9.4849],
  'Béja':[36.7256,9.1817], 'Jendouba':[36.5011,8.7803], 'Le Kef':[36.1742,8.7049],
  'Siliana':[36.0849,9.3708], 'Zaghouan':[36.4029,10.1429], 'Manouba':[36.8078,10.0972],
  'Kébili':[33.7044,8.9690],
  // ⚠️ AUDIT 2026-07-25 : Manama voyait la météo de TUNIS. Les villes des
  // 4 marchés de lancement (locales.js) ont désormais leurs coordonnées.
  // — Bahreïn —
  'Manama':[26.2285,50.5860], 'Muharraq':[26.2572,50.6119], 'Riffa':[26.1300,50.5550],
  'Hamad Town':[26.1150,50.5070], "A'ali":[26.1550,50.5260], 'Isa Town':[26.1736,50.5478],
  'Sitra':[26.1540,50.6200], 'Budaiya':[26.2110,50.4830], 'Jidhafs':[26.2186,50.5380],
  'Al Hidd':[26.2450,50.6540], 'Sanabis':[26.2320,50.5560], 'Tubli':[26.1760,50.5770],
  // — Qatar —
  'Doha':[25.2854,51.5310], 'Al Rayyan':[25.2919,51.4244], 'Al Wakrah':[25.1715,51.6034],
  'Al Khor':[25.6804,51.4969], 'Lusail':[25.4300,51.4900], 'Umm Salal':[25.4173,51.4044],
  'Al Wukair':[25.1520,51.5430], 'Mesaieed':[24.9900,51.5500], 'Dukhan':[25.4280,50.7860],
  'Al Daayen':[25.5780,51.4830], 'Al Shamal':[26.1290,51.2010],
  // — Libye —
  'Tripoli':[32.8872,13.1913], 'Benghazi':[32.1167,20.0868], 'Misrata':[32.3783,15.0906],
  'Sabha':[27.0377,14.4283], 'Al Bayda':[32.7627,21.7551], 'Zawiya':[32.7522,12.7278],
  'Ajdabiya':[30.7554,20.2263], 'Tobruk':[32.0836,23.9764], 'Al Khums':[32.6486,14.2619],
  'Zliten':[32.4674,14.5687], 'Sirte':[31.2050,16.5887], 'Gharyan':[32.1722,13.0203],
  'Derna':[32.7670,22.6367], 'Sabratha':[32.7926,12.4885], 'Zuwara':[32.9312,12.0820],
  'Murzuq':[25.9155,13.9184],
}
// Repli : la PREMIÈRE ville du pays actif — plus jamais Tunis pour Manama.
export const coordsOf=city=>CITIES[String(city||'').trim()]||CITIES[(pack().cities||[])[0]]||CITIES['Tunis']

export async function fetchWeather(lat=36.8065, lon=10.1815){
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`
  const r=await fetch(url); if(!r.ok) throw new Error('weather'); const j=await r.json()
  const c=j.current; const [mode,label]=mapWMO(c.weather_code)
  return { temp:Math.round(c.temperature_2m), code:c.weather_code, mode, label,
    wind:Math.round(c.wind_speed_10m), humidity:c.relative_humidity_2m, isDay:!!c.is_day,
    hi:Math.round(j.daily?.temperature_2m_max?.[0]), lo:Math.round(j.daily?.temperature_2m_min?.[0]) }
}
