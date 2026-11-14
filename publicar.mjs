// Publica en Instagram los reels de cola.json cuya hora ya pasó. Lo corre GitHub Actions cada 10 minutos.
// Instagram baja el video de GitHub Pages. Con --prueba solo revisa el token y muestra qué publicaría.
import fs from 'fs';
const PRUEBA = process.argv.includes('--prueba');
const TOKEN = process.env.INSTAGRAM_TOKEN, USER = process.env.INSTAGRAM_USER_ID;
const API = 'https://graph.instagram.com/v23.0/', PAGES = 'https://igna8o.github.io/iadebolsillo-videos/';
if (!TOKEN || !USER) { console.error('faltan INSTAGRAM_TOKEN o INSTAGRAM_USER_ID'); process.exit(2); }
const oculto = s => String(s).split(TOKEN).join('<token>');
async function api(camino, metodo = 'GET', params = {}) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const r = metodo === 'GET' ? await fetch(API + camino + '?' + body) : await fetch(API + camino, { method: metodo, body });
  const j = await r.json(); if (j.error) throw new Error(oculto(JSON.stringify(j.error))); return j;
}
const guardar = cola => fs.writeFileSync('cola.json', JSON.stringify(cola, null, 2) + '\n');
const cola = JSON.parse(fs.readFileSync('cola.json', 'utf8'));
const yo = await api('me', 'GET', { fields: 'username' });
console.log('cuenta:', yo.username);
const ahora = Date.now();
for (const r of cola) {
  if (r.estado !== 'pendiente') continue;
  if (Date.parse(r.hora) > ahora) { console.log(`espera: ${r.video} (${r.hora})`); continue; }
  const url = PAGES + r.video, tam = fs.statSync(r.video).size;
  const h = await fetch(url, { method: 'HEAD' });
  if (!h.ok || +h.headers.get('content-length') !== tam) { console.log(`todavía no está online: ${url}`); continue; }
  const caption = fs.readFileSync(r.caption, 'utf8').trim();
  if (PRUEBA) { console.log(`publicaría ahora: ${r.video} (${caption.length} caracteres de caption)`); continue; }
  try {
    const c = await api(`${USER}/media`, 'POST', { media_type: 'REELS', video_url: url, caption, share_to_feed: 'true', thumb_offset: String(r.portada_ms || 0) });
    let est = '';
    for (let i = 0; i < 60 && est !== 'FINISHED'; i++) {
      await new Promise(z => setTimeout(z, 5000));
      const s = await api(c.id, 'GET', { fields: 'status_code,status' }); est = s.status_code;
      if (est === 'ERROR' || est === 'EXPIRED') throw new Error('Instagram no pudo procesar el video: ' + JSON.stringify(s));
    }
    if (est !== 'FINISHED') throw new Error('se cansó de esperar el procesamiento');
    const pub = await api(`${USER}/media_publish`, 'POST', { creation_id: c.id });
    r.estado = 'publicado'; guardar(cola);
    const info = await api(pub.id, 'GET', { fields: 'permalink,timestamp' });
    Object.assign(r, { link: info.permalink, publicado: info.timestamp }); guardar(cola);
    console.log(`publicado: ${r.video} → ${info.permalink}`);
  } catch (e) {
    r.intentos = (r.intentos || 0) + 1; r.ultimo_error = oculto(e.message).slice(0, 300);
    if (r.intentos >= 3) r.estado = 'error';
    guardar(cola); console.error(`error con ${r.video}: ${r.ultimo_error}`);
  }
}
