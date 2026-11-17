/**
 * Netlify Function: Band-Abgabe (Pressefoto, Logo, Vorstellungstext)
 *
 * Aufruf: POST /.netlify/functions/band-abgabe  mit JSON { aktion, token, ... }
 *
 *   aktion "laden"    → Bandname, Abgabedatum und die bisherige Abgabe
 *   aktion "upload"   → signierte Upload-Adresse für Foto, Logo oder Technical Rider
 *   aktion "absenden" → prüft alles auf dem Server und speichert die Abgabe
 *   aktion "entfernen" → löscht das gesendete Foto, Logo oder eine Rider-Datei wieder
 *
 * Die Band hat nie direkten Zugriff auf Tabellen oder Speicher. Jede Aktion
 * prüft zuerst das Token und das Abgabedatum. Der Link gilt bis 23:59 Uhr
 * deutscher Zeit am Abgabetag.
 *
 * Benötigte Umgebungsvariablen (Netlify, Site der Website):
 *   PUBLIC_WEB_SUPABASE_URL       (gibt es schon, sonst SUPABASE_URL)
 *   PUBLIC_WEB_SUPABASE_ANON_KEY  (gibt es schon; öffentlicher Schlüssel)
 *   SUPABASE_SERVICE_ROLE_KEY     (neu, geheim, nur für Funktionen)
 */

const BUCKET = 'band-uploads';
const MB = 1024 * 1024;
const FOTO_MAX = 25 * MB;
const LOGO_MAX = 50 * MB;
const FOTO_MIN_LANGE_SEITE = 3000;
const LOGO_PNG_MIN_BREITE = 5000;
const TEXT_MIN = 1000;
const TEXT_MAX = 1500;
const CREDIT_MAX = 120;
// Technical Rider und Bühnenplan: freiwillig, bis zu fünf Dateien
const RIDER_MAX = 25 * MB;
const RIDER_ANZAHL = 5;
const RIDER_ENDUNGEN = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];

export const RECHTE_VERSION = 'v1-2026-11';
export const RECHTE_TEXT =
  'Wir räumen dem Rock4Aid e.V. das einfache, zeitlich unbegrenzte und unentgeltliche Recht ein, '
  + 'das hochgeladene Pressefoto, unser Logo und unseren Vorstellungstext für die Ankündigung des '
  + 'Festivals zu nutzen. Das gilt für die Website rock4aid.de, für Plakate und Flyer in jedem Format '
  + 'und für die Social-Media-Kanäle des Vereins. Wir bestätigen, dass wir diese Rechte einräumen dürfen '
  + 'und dass die Fotografin oder der Fotograf mit der Nutzung einverstanden ist.';

const VEKTOR_ENDUNGEN = ['svg', 'pdf', 'eps', 'ai'];
// Kanäle der Band, gleiche Schlüssel wie web.band_links.plattform
export const PLATTFORMEN = ['website', 'instagram', 'facebook', 'youtube', 'spotify', 'tiktok', 'bandcamp'];

/** Links prüfen und vereinheitlichen. Gibt { links } oder { fehler } zurück. */
export function pruefeLinks(roh) {
  if (roh == null) return { links: [] };
  if (!Array.isArray(roh) || roh.length > 20) return { fehler: 'Die Links konnten nicht gelesen werden.' };
  const links = [];
  for (const l of roh) {
    const plattform = String(l?.plattform || '');
    let url = String(l?.url || '').trim();
    if (!url) continue;
    if (!PLATTFORMEN.includes(plattform)) return { fehler: 'Unbekannter Kanal.' };
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    let u;
    try { u = new URL(url); } catch { return { fehler: `Die Adresse „${url}“ ist keine gültige Internetadresse.` }; }
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.') || url.length > 300) {
      return { fehler: `Die Adresse „${url}“ ist keine gültige Internetadresse.` };
    }
    links.push({ plattform, url: u.toString() });
  }
  return { links };
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
const fehler = (status, meldung) => json(status, { fehler: meldung });

function umgebung() {
  const url = (process.env.PUBLIC_WEB_SUPABASE_URL || process.env.SUPABASE_URL || '')
    .trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const anon = (process.env.PUBLIC_WEB_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  return { url, service, anon };
}

// ---------------------------------------------------------------------------
//  Zugriff auf Supabase (REST und Speicher) mit dem Service-Schlüssel
// ---------------------------------------------------------------------------
function sbHeaders(env, extra = {}) {
  return { apikey: env.service, Authorization: `Bearer ${env.service}`, ...extra };
}
async function ladeAbgabe(env, token) {
  const p = new URLSearchParams({ select: '*,band:bands(name)', token: `eq.${token}`, limit: '1' });
  const r = await fetch(`${env.url}/rest/v1/band_abgaben?${p}`, { headers: sbHeaders(env, { 'Accept-Profile': 'web' }) });
  if (!r.ok) throw new Error(`Datenbank ${r.status}`);
  const d = await r.json();
  return d[0] || null;
}
async function speichereAbgabe(env, id, felder) {
  const r = await fetch(`${env.url}/rest/v1/band_abgaben?id=eq.${id}`, {
    method: 'PATCH',
    headers: sbHeaders(env, { 'Content-Profile': 'web', 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(felder),
  });
  if (!r.ok) throw new Error(`Speichern ${r.status}`);
}
const objPfad = (pfad) => pfad.split('/').map(encodeURIComponent).join('/');
async function signiereUpload(env, pfad) {
  const r = await fetch(`${env.url}/storage/v1/object/upload/sign/${BUCKET}/${objPfad(pfad)}`, {
    method: 'POST', headers: sbHeaders(env, { 'Content-Type': 'application/json' }), body: '{}',
  });
  if (!r.ok) throw new Error(`Upload-Adresse ${r.status}`);
  const d = await r.json();
  return `${env.url}/storage/v1${d.url}`;
}
async function signiereDownload(env, pfad, sekunden = 600) {
  const r = await fetch(`${env.url}/storage/v1/object/sign/${BUCKET}/${objPfad(pfad)}`, {
    method: 'POST', headers: sbHeaders(env, { 'Content-Type': 'application/json' }), body: JSON.stringify({ expiresIn: sekunden }),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return `${env.url}/storage/v1${d.signedURL}`;
}
/** Liest die ersten Bytes einer Datei und ihre Gesamtgröße. */
async function leseAnfang(env, pfad, bytes = 262144) {
  const r = await fetch(`${env.url}/storage/v1/object/${BUCKET}/${objPfad(pfad)}`, {
    headers: sbHeaders(env, { Range: `bytes=0-${bytes - 1}` }),
  });
  if (!r.ok) return null;
  let groesse = 0;
  const cr = r.headers.get('content-range');
  if (cr && /\/(\d+)$/.test(cr)) groesse = Number(cr.match(/\/(\d+)$/)[1]);
  else groesse = Number(r.headers.get('content-length') || 0);
  // Falls der Speicher den Bereich ignoriert, nur den Anfang lesen.
  const teile = []; let gelesen = 0;
  const reader = r.body.getReader();
  while (gelesen < bytes) {
    const { done, value } = await reader.read();
    if (done) break;
    teile.push(value); gelesen += value.length;
  }
  try { await reader.cancel(); } catch { /* egal */ }
  const anfang = new Uint8Array(Math.min(gelesen, bytes));
  let pos = 0;
  for (const t of teile) { const n = Math.min(t.length, anfang.length - pos); anfang.set(t.subarray(0, n), pos); pos += n; if (pos >= anfang.length) break; }
  return { anfang, groesse: groesse || gelesen };
}
async function listeOrdner(env, ordner) {
  const r = await fetch(`${env.url}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST', headers: sbHeaders(env, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefix: `${ordner}/`, limit: 1000 }),
  });
  if (!r.ok) return [];
  const d = await r.json();
  return (d || []).filter((o) => o.id).map((o) => `${ordner}/${o.name}`);
}
async function loescheDateien(env, pfade) {
  if (!pfade.length) return;
  await fetch(`${env.url}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE', headers: sbHeaders(env, { 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: pfade }),
  });
}

// ---------------------------------------------------------------------------
//  Dateien erkennen (aus den ersten Bytes, nicht aus der Endung)
// ---------------------------------------------------------------------------
export function erkenneDatei(b) {
  if (!b || b.length < 8) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { typ: 'jpg', ...jpegMasse(b) };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { typ: 'png', ...pngInfo(b) };
  if (b[0] === 0xc5 && b[1] === 0xd0 && b[2] === 0xd3 && b[3] === 0xc6) return { typ: 'eps' };
  // Word: DOCX ist ein ZIP-Archiv, DOC ein altes Office-Format
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return { typ: 'zip' };
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return { typ: 'doc' };
  const kopf = new TextDecoder('latin1').decode(b.subarray(0, Math.min(b.length, 4096)));
  if (kopf.startsWith('%PDF-')) return { typ: 'pdf' };
  if (kopf.startsWith('%!PS-Adobe')) return { typ: 'eps' };
  const text = kopf.replace(/^﻿/, '').replace(/^ï»¿/, '').trimStart();
  if ((text.startsWith('<?xml') || text.startsWith('<svg') || text.startsWith('<!--') || text.startsWith('<!DOCTYPE svg'))
    && /<svg[\s>]/i.test(new TextDecoder('utf-8').decode(b))) return { typ: 'svg' };
  return null;
}
function jpegMasse(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === 0xff) { i += m === 0xff ? 1 : 2; continue; }
    const len = (b[i + 2] << 8) | b[i + 3];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { hoehe: (b[i + 5] << 8) | b[i + 6], breite: (b[i + 7] << 8) | b[i + 8] };
    }
    i += 2 + len;
  }
  return { breite: 0, hoehe: 0 };
}
function pngInfo(b) {
  const u32 = (o) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
  const breite = u32(16); const hoehe = u32(20); const farbtyp = b[25];
  let transparenz = farbtyp === 4 || farbtyp === 6;
  // tRNS-Block vor den Bilddaten bedeutet ebenfalls Transparenz
  let o = 8;
  while (!transparenz && o + 8 < b.length) {
    const len = u32(o); const name = String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]);
    if (name === 'tRNS') transparenz = true;
    if (name === 'IDAT' || name === 'IEND') break;
    o += 12 + len;
  }
  return { breite, hoehe, transparenz };
}

// ---------------------------------------------------------------------------
//  Regeln
// ---------------------------------------------------------------------------
/** Heutiges Datum in Deutschland als JJJJ-MM-TT. */
export function heuteBerlin(jetzt = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(jetzt);
}
export const istOffen = (abgabe, jetzt) => heuteBerlin(jetzt) <= String(abgabe.abgabe_bis);
/** Zeichen so zählen wie der Zähler auf der Seite: Zeilenumbruch = 1 Zeichen. */
export const zeichen = (t) => [...String(t || '').replace(/\r\n?/g, '\n').trim()].length;
const tokenOk = (t) => typeof t === 'string' && /^[a-f0-9]{64}$/.test(t);

export function pruefeFoto(info, groesse) {
  if (!info || !['jpg', 'png'].includes(info.typ)) return 'Das Pressefoto muss eine JPG- oder PNG-Datei sein.';
  if (groesse > FOTO_MAX) return 'Das Pressefoto darf höchstens 25 MB groß sein.';
  const lang = Math.max(info.breite || 0, info.hoehe || 0);
  if (lang < FOTO_MIN_LANGE_SEITE) return `Das Pressefoto ist für ein großes Plakat leider zu klein. Bitte ladet die Originaldatei in voller Größe hoch. (Technisch: ${lang} Pixel an der langen Seite, wir brauchen mindestens ${FOTO_MIN_LANGE_SEITE}.)`;
  return null;
}
export function pruefeLogo(info, groesse) {
  if (!info) return 'Das Logo muss eine SVG-, PDF-, EPS- oder AI-Datei sein, notfalls ein PNG mit transparentem Hintergrund.';
  if (groesse > LOGO_MAX) return 'Das Logo darf höchstens 50 MB groß sein.';
  if (info.typ === 'jpg') return 'Ein JPG-Logo können wir nicht verwenden, weil es keinen transparenten Hintergrund hat. Bitte eine Vektordatei oder ein PNG mit transparentem Hintergrund hochladen.';
  if (info.typ === 'png') {
    if ((info.breite || 0) < LOGO_PNG_MIN_BREITE) return `Das Logo ist für ein großes Plakat leider zu klein. Bitte ladet eine Vektordatei oder eine größere Fassung hoch. (Technisch: ${info.breite} Pixel breit, wir brauchen mindestens ${LOGO_PNG_MIN_BREITE}.)`;
    if (!info.transparenz) return 'Das PNG-Logo hat keinen transparenten Hintergrund.';
  }
  return null;
}

/** Rider-Datei prüfen. Gibt { typ } oder { fehler } zurück. */
export function pruefeRider(info, groesse, ext) {
  const nicht = 'Der Technical Rider muss eine PDF-, Word-, JPG- oder PNG-Datei sein.';
  if (!info) return { fehler: nicht };
  if (groesse > RIDER_MAX) return { fehler: 'Eine Rider-Datei darf höchstens 25 MB groß sein.' };
  if (info.typ === 'zip') return ext === 'docx' ? { typ: 'docx' } : { fehler: nicht };
  if (['pdf', 'doc', 'jpg', 'png'].includes(info.typ)) return { typ: info.typ };
  return { fehler: nicht };
}
const riderListe = (a) => (Array.isArray(a.rider) ? a.rider : []);

function endung(name) { return (String(name || '').split('.').pop() || '').toLowerCase(); }
function sichererName(name) { return String(name || 'datei').replace(/[^\w.\-]+/g, '_').slice(-80); }

// ---------------------------------------------------------------------------
//  Aktionen
// ---------------------------------------------------------------------------
async function aktionLaden(env, a) {
  const offen = istOffen(a);
  const foto = a.foto_pfad ? {
    name: a.foto_dateiname, breite: a.foto_breite, hoehe: a.foto_hoehe,
    vorschau: await signiereDownload(env, a.foto_pfad),
  } : null;
  const logo = a.logo_pfad ? {
    name: a.logo_dateiname, art: a.logo_art, typ: a.logo_typ,
    vorschau: ['svg', 'png'].includes(a.logo_typ) ? await signiereDownload(env, a.logo_pfad) : null,
  } : null;
  const rider = await Promise.all(riderListe(a).map(async (r) => ({
    pfad: r.pfad, name: r.name, typ: r.typ, groesse: r.groesse, url: await signiereDownload(env, r.pfad),
  })));
  return json(200, {
    band: a.band?.name || '', abgabeBis: a.abgabe_bis, offen, status: a.status, rider,
    text: a.vorstellungstext || '', credit: a.foto_credit || '',
    rechteBestaetigtAm: a.rechte_bestaetigt_am, eingereichtAm: a.eingereicht_am,
    foto, logo, rechteText: RECHTE_TEXT, links: Array.isArray(a.links) ? a.links : [],
  });
}

async function aktionUpload(env, a, body) {
  const art = ['foto', 'logo', 'rider'].includes(body.art) ? body.art : null;
  if (!art) return fehler(400, 'Unbekannte Dateiart.');
  const name = String(body.dateiname || '');
  const ext = endung(name);
  const groesse = Number(body.groesse || 0);
  if (art === 'foto') {
    if (!['jpg', 'jpeg', 'png'].includes(ext)) return fehler(400, 'Das Pressefoto muss eine JPG- oder PNG-Datei sein.');
    if (groesse > FOTO_MAX) return fehler(400, 'Das Pressefoto darf höchstens 25 MB groß sein.');
  } else if (art === 'logo') {
    if (![...VEKTOR_ENDUNGEN, 'png'].includes(ext)) return fehler(400, 'Das Logo muss eine SVG-, PDF-, EPS- oder AI-Datei sein, notfalls ein PNG.');
    if (groesse > LOGO_MAX) return fehler(400, 'Das Logo darf höchstens 50 MB groß sein.');
  } else {
    if (!RIDER_ENDUNGEN.includes(ext)) return fehler(400, 'Der Technical Rider muss eine PDF-, Word-, JPG- oder PNG-Datei sein.');
    if (groesse > RIDER_MAX) return fehler(400, 'Eine Rider-Datei darf höchstens 25 MB groß sein.');
    if (riderListe(a).length >= RIDER_ANZAHL) return fehler(400, `Ihr habt schon ${RIDER_ANZAHL} Rider-Dateien gesendet. Löscht zuerst eine, bevor ihr eine neue hochladet.`);
  }
  const typen = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', pdf: 'application/pdf', eps: 'application/postscript', ai: 'application/octet-stream',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  const zufall = Math.random().toString(36).slice(2, 8);
  const pfad = `${a.id}/${art}-${Date.now()}-${zufall}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const signedUrl = await signiereUpload(env, pfad);
  return json(200, { pfad, signedUrl, contentType: typen[ext], apikey: env.anon });
}

async function aktionAbsenden(env, a, body, jetzt) {
  const text = String(body.text || '').replace(/\r\n?/g, '\n').trim();
  const n = zeichen(text);
  if (n < TEXT_MIN || n > TEXT_MAX) return fehler(400, `Der Vorstellungstext hat ${n} Zeichen. Er muss zwischen ${TEXT_MIN} und ${TEXT_MAX} Zeichen lang sein.`);
  const credit = String(body.credit || '').trim();
  if (!credit) return fehler(400, 'Bitte den Namen der Fotografin oder des Fotografen eintragen.');
  if (credit.length > CREDIT_MAX) return fehler(400, `Der Fotografen-Credit darf höchstens ${CREDIT_MAX} Zeichen lang sein.`);
  if (body.rechte !== true) return fehler(400, 'Bitte bestätigt die Nutzungsrechte.');
  const lk = pruefeLinks(body.links);
  if (lk.fehler) return fehler(400, lk.fehler);

  const ordnerPraefix = `${a.id}/`;
  const fotoPfad = body.fotoPfad || a.foto_pfad;
  const logoPfad = body.logoPfad || a.logo_pfad;
  if (!fotoPfad) return fehler(400, 'Bitte ein Pressefoto hochladen.');
  if (!logoPfad) return fehler(400, 'Bitte ein Logo hochladen.');
  if (!fotoPfad.startsWith(ordnerPraefix) || !logoPfad.startsWith(ordnerPraefix)) return fehler(400, 'Ungültige Datei.');

  const felder = {
    vorstellungstext: text, foto_credit: credit, status: 'eingereicht', eingereicht_am: jetzt.toISOString(),
    rechte_bestaetigt_am: jetzt.toISOString(), rechte_version: RECHTE_VERSION, rechte_text: RECHTE_TEXT,
    links: lk.links,
  };

  if (fotoPfad !== a.foto_pfad) {
    const d = await leseAnfang(env, fotoPfad);
    if (!d) return fehler(400, 'Das Pressefoto ist nicht angekommen. Bitte noch einmal hochladen.');
    const info = erkenneDatei(d.anfang);
    const f = pruefeFoto(info, d.groesse);
    if (f) { await loescheDateien(env, [fotoPfad]); return fehler(400, f); }
    Object.assign(felder, {
      foto_pfad: fotoPfad, foto_typ: info.typ, foto_groesse: d.groesse, foto_breite: info.breite, foto_hoehe: info.hoehe,
      foto_dateiname: sichererName(body.fotoName || fotoPfad.split('/').pop()),
    });
  }
  if (logoPfad !== a.logo_pfad) {
    const d = await leseAnfang(env, logoPfad);
    if (!d) return fehler(400, 'Das Logo ist nicht angekommen. Bitte noch einmal hochladen.');
    let info = erkenneDatei(d.anfang);
    // AI-Dateien sind PDF- oder PostScript-Dateien. Die Endung entscheidet nur über den Namen.
    if (info && info.typ === 'pdf' && endung(logoPfad) === 'ai') info = { ...info, typ: 'ai' };
    if (info && info.typ === 'eps' && endung(logoPfad) === 'ai') info = { ...info, typ: 'ai' };
    const f = pruefeLogo(info, d.groesse);
    if (f) { await loescheDateien(env, [logoPfad]); return fehler(400, f); }
    Object.assign(felder, {
      logo_pfad: logoPfad, logo_typ: info.typ, logo_groesse: d.groesse,
      logo_art: info.typ === 'png' ? 'png' : 'vektor', logo_breite: info.breite || null, logo_hoehe: info.hoehe || null,
      logo_dateiname: sichererName(body.logoName || logoPfad.split('/').pop()),
    });
  }

  // Technical Rider: neue Dateien an die vorhandenen anhängen
  const riderNeu = Array.isArray(body.riderNeu) ? body.riderNeu : [];
  if (riderNeu.length) {
    const vorhanden = riderListe(a);
    if (vorhanden.length + riderNeu.length > RIDER_ANZAHL) return fehler(400, `Für den Technical Rider sind höchstens ${RIDER_ANZAHL} Dateien möglich.`);
    const neu = [];
    for (const r of riderNeu) {
      const pfad = String(r?.pfad || '');
      if (!pfad.startsWith(`${ordnerPraefix}rider-`)) return fehler(400, 'Ungültige Datei.');
      const d = await leseAnfang(env, pfad, 8192);
      if (!d) return fehler(400, 'Eine Rider-Datei ist nicht angekommen. Bitte noch einmal hochladen.');
      const erg = pruefeRider(erkenneDatei(d.anfang), d.groesse, endung(pfad));
      if (erg.fehler) { await loescheDateien(env, riderNeu.map((x) => String(x?.pfad || '')).filter((x) => x.startsWith(ordnerPraefix))); return fehler(400, erg.fehler); }
      neu.push({ pfad, name: sichererName(r?.name || pfad.split('/').pop()), typ: erg.typ, groesse: d.groesse });
    }
    felder.rider = [...vorhanden, ...neu];
  }

  await speichereAbgabe(env, a.id, felder);
  // Alte und nicht verwendete Uploads dieser Band aufräumen
  const behalten = new Set([felder.foto_pfad || a.foto_pfad, felder.logo_pfad || a.logo_pfad,
    ...(felder.rider || riderListe(a)).map((r) => r.pfad)]);
  const alle = await listeOrdner(env, String(a.id));
  await loescheDateien(env, alle.filter((p) => !behalten.has(p)));
  return json(200, { ok: true });
}

async function aktionEntfernen(env, a, body) {
  // Eine Rider-Datei löschen. Der Rider ist freiwillig, die Einreichung bleibt gültig.
  if (body.art === 'rider') {
    const liste = riderListe(a);
    const ziel = liste.find((r) => r.pfad === body.pfad);
    if (!ziel) return fehler(400, 'Diese Datei gibt es nicht mehr.');
    await loescheDateien(env, [ziel.pfad]);
    await speichereAbgabe(env, a.id, { rider: liste.filter((r) => r.pfad !== ziel.pfad) });
    return json(200, { ok: true });
  }
  const art = body.art === 'logo' ? 'logo' : body.art === 'foto' ? 'foto' : null;
  if (!art) return fehler(400, 'Unbekannte Dateiart.');
  const pfad = a[`${art}_pfad`];
  if (pfad) await loescheDateien(env, [pfad]);
  const leer = art === 'foto'
    ? { foto_pfad: null, foto_dateiname: null, foto_typ: null, foto_groesse: null, foto_breite: null, foto_hoehe: null }
    : { logo_pfad: null, logo_dateiname: null, logo_typ: null, logo_groesse: null, logo_art: null, logo_breite: null, logo_hoehe: null };
  // Ohne Foto oder Logo ist die Einreichung unvollständig. Die Website zeigt bis zur nächsten Freigabe die alte Fassung.
  await speichereAbgabe(env, a.id, { ...leer, status: 'offen' });
  return json(200, { ok: true });
}

export default async (request) => {
  if (request.method !== 'POST') return fehler(405, 'Nur POST erlaubt.');
  const env = umgebung();
  if (!env.url || !env.service) return fehler(500, 'Der Upload ist gerade nicht eingerichtet. Bitte meldet euch bei uns.');
  let body;
  try { body = await request.json(); } catch { return fehler(400, 'Ungültige Anfrage.'); }
  if (!tokenOk(body.token)) return fehler(404, 'Dieser Link ist ungültig.');
  try {
    const a = await ladeAbgabe(env, body.token);
    if (!a) return fehler(404, 'Dieser Link ist ungültig.');
    const jetzt = new Date();
    if (body.aktion === 'laden') return await aktionLaden(env, a);
    if (!istOffen(a, jetzt)) return fehler(403, 'Der Stichtag ist vorbei. Änderungen sind nicht mehr möglich.');
    if (body.aktion === 'upload') return await aktionUpload(env, a, body);
    if (body.aktion === 'absenden') return await aktionAbsenden(env, a, body, jetzt);
    if (body.aktion === 'entfernen') return await aktionEntfernen(env, a, body);
    return fehler(400, 'Unbekannte Aktion.');
  } catch (e) {
    console.error('[band-abgabe]', e);
    return fehler(500, 'Da ist etwas schiefgelaufen. Bitte versucht es gleich noch einmal.');
  }
};
