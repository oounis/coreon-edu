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
export async function fetchWeather(lat=36.8065, lon=10.1815){
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`
  const r=await fetch(url); if(!r.ok) throw new Error('weather'); const j=await r.json()
  const c=j.current; const [mode,label]=mapWMO(c.weather_code)
  return { temp:Math.round(c.temperature_2m), code:c.weather_code, mode, label,
    wind:Math.round(c.wind_speed_10m), humidity:c.relative_humidity_2m, isDay:!!c.is_day,
    hi:Math.round(j.daily?.temperature_2m_max?.[0]), lo:Math.round(j.daily?.temperature_2m_min?.[0]) }
}
