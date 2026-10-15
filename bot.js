import { AtpAgent } from '@atproto/api';
import 'dotenv/config';

// ============================================================
//   BLUESKY WEATHER BOT — hosted version (Render Cron Job)
//   Render runs it at 8am and 6pm. The bot posts once and exits.
// ============================================================

const VILLE = {
  nom: 'Paris',
  latitude: 48.8566,
  longitude: 2.3522,
};

const CODES_METEO = {
  0: '☀️ Ciel dégagé', 1: '🌤️ Plutôt ensoleillé', 2: '⛅ Partiellement nuageux',
  3: '☁️ Couvert', 45: '🌫️ Brouillard', 48: '🌫️ Brouillard givrant',
  51: '🌦️ Bruine légère', 53: '🌦️ Bruine', 55: '🌧️ Bruine dense',
  61: '🌧️ Pluie faible', 63: '🌧️ Pluie', 65: '🌧️ Forte pluie',
  71: '🌨️ Neige faible', 73: '🌨️ Neige', 75: '❄️ Forte neige',
  80: '🌦️ Averses', 81: '🌧️ Averses', 82: '⛈️ Fortes averses',
  95: '⛈️ Orage', 96: '⛈️ Orage avec grêle',
};

async function recupererMeteo() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${VILLE.latitude}&longitude=${VILLE.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe/Paris`;
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error('Météo indisponible (code ' + reponse.status + ')');
  const data = await reponse.json();
  return data.current;
}

function construireMessage(meteo) {
  const description = CODES_METEO[meteo.weather_code] || '🌍 Conditions variables';
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
  return `🌤️ Météo à ${VILLE.nom} — ${date} à ${heure}

${description}
🌡️ Température : ${Math.round(meteo.temperature_2m)}°C (ressenti ${Math.round(meteo.apparent_temperature)}°C)
💧 Humidité : ${meteo.relative_humidity_2m}%
💨 Vent : ${Math.round(meteo.wind_speed_10m)} km/h

#météo #${VILLE.nom}`;
}

async function posterMeteo() {
  const meteo = await recupererMeteo();
  const texte = construireMessage(meteo);

  const agent = new AtpAgent({ service: 'https://bsky.social' });
  await agent.login({
    identifier: process.env.BLUESKY_IDENTIFIER,
    password: process.env.BLUESKY_PASSWORD,
  });
  const post = await agent.post({ text: texte, createdAt: new Date().toISOString() });

  console.log(`✅ [${new Date().toISOString()}] Météo publiée !`);
  console.log('   URI :', post.uri);
}

// Run once then exit (Render handles the scheduling)
posterMeteo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erreur :', err.message || err);
    process.exit(1);
  });