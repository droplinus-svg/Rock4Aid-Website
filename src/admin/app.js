// ===========================================================================
//  Rock4Aid – Redaktionssystem (/admin)
//  Läuft komplett im Browser. supabase-js wird NUR hier verwendet.
//  Bedienung: Login → Bereich wählen → Formulare ausfüllen → "Speichern".
//  "Speichern" schreibt nur in die Datenbank. Erst "Veröffentlichen" baut die
//  öffentliche Website neu (Netlify Build-Hook).
// ===========================================================================
import { createClient } from '@supabase/supabase-js';

const URL = (import.meta.env.PUBLIC_SUPABASE_URL || '').trim().replace(/\s+/g, '').replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
const KEY = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '').trim();
const BUILD_HOOK = (import.meta.env.PUBLIC_NETLIFY_BUILD_HOOK || '').trim();

let sb = null;
const $ = (sel, el = document) => el.querySelector(sel);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
const esc = (s) => (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function toast(msg, kind = 'ok', ms) {
  const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`);
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), ms || (kind === 'err' ? 6000 : 3200));
}

// ---------------------------------------------------------------------------
//  SCHEMA – beschreibt alle Bereiche und Felder
// ---------------------------------------------------------------------------
const PLATTFORMEN = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['website', 'Website'], ['spotify', 'Spotify'], ['tiktok', 'TikTok'], ['bandcamp', 'Bandcamp']];
const GROESSEN = [['klein', 'Klein'], ['mittel', 'Mittel'], ['gross', 'Groß']];

const SCHEMA = {
  einstellungen: {
    titel: 'Start & Einstellungen', single: true,
    felder: [
      { key: 'festival_jahr', label: 'Festival-Jahr', type: 'text' },
      { key: 'festival_datum', label: 'Festival-Datum & Uhrzeit (steuert den Countdown; leer = „wird zeitnah veröffentlicht“)', type: 'datetime' },
      { key: 'info_titel', label: 'Titelzeile Startseite (Enter = neue Zeile / Umbruch)', type: 'textarea' },
      { key: 'info_untertitel', label: 'Zweite Zeile (frei – z. B. Ort/Datum, Enter = Umbruch)', type: 'textarea' },
      { key: 'claim_zeile_1', label: 'Claim-Zeile 1', type: 'text' },
      { key: 'claim_zeile_2', label: 'Claim-Zeile 2', type: 'text' },
      { key: 'kontakt_email', label: 'Kontakt-E-Mail', type: 'text' },
      { key: 'hero_video', label: 'Hero-Hintergrundvideo (optional, stumme Schleife)', type: 'video' },
      { key: 'termin_sichtbar', label: 'Termin-Block auf Startseite anzeigen', type: 'bool' },
      { key: 'lineup_sichtbar', label: 'Seite „Line-Up“ anzeigen', type: 'bool' },
      { key: 'charity_sichtbar', label: 'Seite „Charity“ anzeigen', type: 'bool' },
      { key: 'anfahrt_sichtbar', label: 'Seite „Anfahrt & Kontakt“ anzeigen', type: 'bool' },
    ],
  },
  sponsoren: {
    titel: 'Sponsoren', order: 'reihenfolge', labelKey: 'name',
    felder: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'logo', label: 'Logo', type: 'image', minW: 300 },
      { key: 'groesse', label: 'Anzeigegröße', type: 'select', options: GROESSEN },
      { key: 'reihenfolge', label: 'Reihenfolge', type: 'number' },
      { key: 'sichtbar', label: 'Sichtbar', type: 'bool' },
    ],
  },
  bands: {
    titel: 'Bands (aktuelles Line-Up)', order: 'reihenfolge', labelKey: 'name',
    felder: [
      { key: 'name', label: 'Bandname (Zeilenumbruch mit Enter möglich)', type: 'textarea' },
      { key: 'spielzeit', label: 'Spielzeit', type: 'text' },
      { key: 'buehne', label: 'Bühne (optional, z. B. CAMPFIRE STAGE)', type: 'text' },
      { key: 'foto', label: 'Foto (Hochformat)', type: 'image', minW: 600, minH: 660 },
      { key: 'reihenfolge', label: 'Reihenfolge', type: 'number' },
      { key: 'sichtbar', label: 'Sichtbar', type: 'bool' },
    ],
    kinder: [{ table: 'band_links', fk: 'band_id', titel: 'Links', linkList: true }],
  },
  charity: {
    titel: 'Charity / Das Projekt', single: true,
    felder: [
      { key: 'charity_hint', label: '', type: 'hinweis', text: 'Die ganze Seite kannst du unter „Start & Einstellungen“ aus- und einblenden.' },
      { key: 'hero_titel', label: 'Titel (Hero)', type: 'text' },
      { key: 'hero_bild', label: 'Hintergrundbild (Hero, groß)', type: 'image', minW: 1200 },
      { key: 'intro_text', label: 'Intro-Text', type: 'richtext' },
      { key: 'warum_titel', label: 'Überschrift „Warum wir rocken?“', type: 'text' },
      { key: 'warum_bild', label: 'Bild', type: 'image', minW: 800 },
      { key: 'warum_text', label: 'Text', type: 'richtext' },
      { key: 'wasser_bild', label: 'Bild (Wasser-Sektion)', type: 'image', minW: 1000 },
      { key: 'wasser_text', label: 'Text (Wasser-Sektion)', type: 'richtext' },
      { key: 'spenden_titel', label: 'Überschrift Spenden', type: 'text' },
      { key: 'spenden_link_url', label: 'Info-Link (URL)', type: 'text' },
      { key: 'spenden_link_text', label: 'Info-Link (Anzeigetext)', type: 'text' },
      { key: 'spenden_text', label: 'Spenden-Text (IBAN, Verwendungszweck)', type: 'richtext' },
    ],
  },
  anfahrt: {
    titel: 'Anfahrt & Kontakt', single: true,
    felder: [
      { key: 'eintritt_zeile', label: 'Eintritt-Zeile', type: 'text' },
      { key: 'ort_titel', label: 'Karte 1 – Überschrift', type: 'text' },
      { key: 'ort_text', label: 'Karte 1 – Text (mehrzeilig)', type: 'textarea' },
      { key: 'datum_titel', label: 'Karte 2 – Überschrift', type: 'text' },
      { key: 'datum_text', label: 'Karte 2 – Text (mehrzeilig)', type: 'textarea' },
      { key: 'kontakt_titel', label: 'Karte 3 – Überschrift', type: 'text' },
      { key: 'kontakt_text', label: 'Karte 3 – Text (E-Mail wird automatisch verlinkt)', type: 'textarea' },
      { key: 'karte_bild', label: 'Kartenbild (statischer Screenshot)', type: 'image', minW: 900 },
      { key: 'karte_link', label: '„Route planen“-Link (Google Maps)', type: 'text' },
      { key: 'veranstalter_titel', label: 'Veranstalter – Überschrift', type: 'text' },
      { key: 'veranstalter_bild', label: 'Veranstalter – Bild', type: 'image', minW: 700 },
      { key: 'veranstalter_text', label: 'Veranstalter – Text', type: 'richtext' },
    ],
  },
  rechtstexte: {
    titel: 'Impressum & Datenschutz', single: true,
    felder: [
      { key: 'impressum_html', label: 'Impressum', type: 'richtext' },
      { key: 'datenschutz_html', label: 'Datenschutz', type: 'richtext' },
    ],
  },
};

// Rückblick wird eigens behandelt (verschachtelt)
const RB_JAHR_FELDER = [
  { key: 'jahr', label: 'Jahr', type: 'number' },
  { key: 'slug', label: 'Adresse (slug), z. B. rueckblick-2027', type: 'text' },
  { key: 'titel', label: 'Titel', type: 'text' },
  { key: 'kennzahlen', label: 'Kennzahlen-Zeile (optional)', type: 'richtext' },
  { key: 'fliesstext', label: 'Fließtext', type: 'richtext' },
  { key: 'reihenfolge', label: 'Reihenfolge (meist = Jahr)', type: 'number' },
  { key: 'sichtbar', label: 'Sichtbar', type: 'bool' },
];

// ---------------------------------------------------------------------------
//  Bild-/Video-Qualitätsprüfung
// ---------------------------------------------------------------------------
function pruefeBild(file, minW = 0, minH = 0) {
  return new Promise((resolve) => {
    const groesseMB = file.size / (1024 * 1024);
    if (file.type.startsWith('video')) {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        const warnungen = [];
        if (groesseMB > 12) warnungen.push(`Video ist ${groesseMB.toFixed(1)} MB groß – für ein Hintergrundvideo besser < 8 MB (kürzen/komprimieren).`);
        resolve({ ok: warnungen.length === 0, ampel: warnungen.length ? 'gelb' : 'gruen', warnungen, w: v.videoWidth, h: v.videoHeight });
      };
      v.onerror = () => resolve({ ok: false, ampel: 'rot', warnungen: ['Video konnte nicht gelesen werden.'], w: 0, h: 0 });
      v.src = URL_forFile(file);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, hh = img.naturalHeight;
      const warnungen = [];
      let ampel = 'gruen';
      if ((minW && w < minW) || (minH && hh < minH)) { ampel = 'rot'; warnungen.push(`Auflösung ${w}×${hh} px ist zu niedrig (empfohlen mind. ${minW || '—'}×${minH || '—'} px). Das Bild wirkt unscharf.`); }
      else if ((minW && w < minW * 1.3) || (minH && hh < minH * 1.3)) { ampel = 'gelb'; warnungen.push(`Auflösung ${w}×${hh} px ist knapp – etwas größer wäre besser.`); }
      if (groesseMB > 6) { if (ampel === 'gruen') ampel = 'gelb'; warnungen.push(`Datei ist ${groesseMB.toFixed(1)} MB groß – vor dem Hochladen verkleinern spart Ladezeit.`); }
      resolve({ ok: ampel === 'gruen', ampel, warnungen, w, h: hh });
    };
    img.onerror = () => resolve({ ok: false, ampel: 'rot', warnungen: ['Bild konnte nicht gelesen werden.'], w: 0, h: 0 });
    img.src = URL_forFile(file);
  });
}
function URL_forFile(f) { return window.URL.createObjectURL(f); }

async function uploadDatei(file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '').slice(0, 40);
  const path = `${Date.now()}-${safe}.${ext}`;
  const { error } = await sb.storage.from('images').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = sb.storage.from('images').getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
//  Feld-Widgets
// ---------------------------------------------------------------------------
function feldWidget(feld, wert) {
  const id = `f_${feld.key}`;
  if (feld.type === 'hinweis') return h(`<div class="hinweis">${esc(feld.text)}</div>`);
  const wrap = h(`<div class="feld"><label for="${id}">${esc(feld.label)}</label></div>`);
  let input;
  switch (feld.type) {
    case 'text': input = h(`<input id="${id}" type="text" value="${esc(wert || '')}">`); break;
    case 'number': input = h(`<input id="${id}" type="number" value="${wert ?? ''}">`); break;
    case 'textarea': input = h(`<textarea id="${id}" rows="3">${esc(wert || '')}</textarea>`); break;
    case 'datetime': {
      const local = wert ? new Date(wert).toISOString().slice(0, 16) : '';
      input = h(`<input id="${id}" type="datetime-local" value="${local}">`); break;
    }
    case 'bool': {
      input = h(`<label class="switch"><input id="${id}" type="checkbox" ${wert ? 'checked' : ''}><span>ein</span></label>`);
      wrap.appendChild(input); wrap.dataset.type = 'bool'; wrap.dataset.key = feld.key; return wrap;
    }
    case 'select': {
      input = h(`<select id="${id}">${feld.options.map(([v, l]) => `<option value="${v}" ${String(wert) === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`); break;
    }
    case 'image': case 'video': { input = medienWidget(feld, wert); break; }
    case 'richtext': { input = richtextWidget(feld, wert); break; }
    default: input = h(`<input id="${id}" type="text" value="${esc(wert || '')}">`);
  }
  input.dataset && (input.dataset.key = feld.key);
  wrap.dataset.key = feld.key; wrap.dataset.type = feld.type;
  wrap.appendChild(input);
  return wrap;
}

function medienWidget(feld, wert) {
  const box = h(`<div class="medien" data-key="${feld.key}" data-type="${feld.type}"></div>`);
  const vorschau = h(`<div class="vorschau">${wert ? medienVorschauHtml(wert) : '<span class="leer">Kein ' + (feld.type === 'video' ? 'Video' : 'Bild') + '</span>'}</div>`);
  const accept = feld.type === 'video' ? 'video/*' : 'image/*';
  const fileInp = h(`<input type="file" accept="${accept}">`);
  const status = h(`<div class="upl-status"></div>`);
  const hidden = h(`<input type="hidden" data-value value="${esc(wert || '')}">`);
  fileInp.addEventListener('change', async () => {
    const file = fileInp.files[0]; if (!file) return;
    status.innerHTML = 'Prüfe …';
    const p = await pruefeBild(file, feld.minW || 0, feld.minH || 0);
    status.innerHTML = `<span class="ampel ${p.ampel}"></span>${p.w}×${p.h}px. ${p.warnungen.map(esc).join(' ')}`;
    if (p.ampel === 'rot' && !confirm('Die Bildqualität ist niedrig:\n\n' + p.warnungen.join('\n') + '\n\nTrotzdem hochladen?')) { fileInp.value = ''; status.innerHTML = 'Abgebrochen.'; return; }
    try {
      status.innerHTML += ' – lade hoch …';
      const url = await uploadDatei(file);
      hidden.value = url;
      vorschau.innerHTML = medienVorschauHtml(url);
      status.innerHTML = `<span class="ampel ${p.ampel}"></span>Hochgeladen ✓`;
    } catch (e) { status.innerHTML = 'Fehler beim Hochladen: ' + esc(e.message); }
  });
  box.append(vorschau, fileInp, status, hidden);
  return box;
}
function medienVorschauHtml(url) {
  if (/\.(mp4|webm|mov|m4v)$/i.test(url)) return `<video src="${esc(url)}" muted controls></video>`;
  return `<img src="${esc(url)}" alt="">`;
}

// Einfacher Rich-Text: Fett, Unterstreichung, feste Größenstufen
function richtextWidget(feld, wert) {
  const box = h(`<div class="rte" data-key="${feld.key}" data-type="richtext"></div>`);
  const bar = h(`<div class="rte-bar">
    <button type="button" data-cmd="bold" title="Fett"><b>F</b></button>
    <button type="button" data-cmd="underline" title="Unterstreichen"><u>U</u></button>
    <span class="sep"></span>
    <button type="button" data-size="klein">Klein</button>
    <button type="button" data-size="normal">Normal</button>
    <button type="button" data-size="gross">Groß</button>
    <button type="button" data-size="sehrgross">Sehr groß</button>
  </div>`);
  const area = h(`<div class="rte-area rt" contenteditable="true"></div>`);
  area.innerHTML = wert || '';
  bar.querySelectorAll('button[data-cmd]').forEach((b) => b.addEventListener('mousedown', (e) => { e.preventDefault(); document.execCommand(b.dataset.cmd, false); }));
  bar.querySelectorAll('button[data-size]').forEach((b) => b.addEventListener('mousedown', (e) => { e.preventDefault(); groesseAnwenden(area, b.dataset.size); }));
  box.append(bar, area);
  return box;
}
function groesseAnwenden(area, stufe) {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) { toast('Bitte zuerst Text markieren.', 'err'); return; }
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  if (stufe !== 'normal') span.className = 'rt-' + stufe;
  try { span.appendChild(range.extractContents()); range.insertNode(span); } catch (e) { /* ignore */ }
  sel.removeAllRanges();
}

// Werte aus einem Formular einsammeln
function formSammeln(container, felder) {
  const row = {};
  for (const feld of felder) {
    if (feld.type === 'hinweis') continue;
    const wrap = container.querySelector(`.feld[data-key="${feld.key}"], .medien[data-key="${feld.key}"], .rte[data-key="${feld.key}"]`);
    if (!wrap) continue;
    if (feld.type === 'bool') { row[feld.key] = wrap.querySelector('input[type=checkbox]').checked; continue; }
    if (feld.type === 'image' || feld.type === 'video') { row[feld.key] = wrap.querySelector('input[data-value]').value || ''; continue; }
    if (feld.type === 'richtext') { row[feld.key] = normalisiereRichtext(wrap.querySelector('.rte-area').innerHTML); continue; }
    const el = wrap.querySelector('input,textarea,select');
    if (feld.type === 'number') row[feld.key] = el.value === '' ? null : Number(el.value);
    else if (feld.type === 'datetime') row[feld.key] = el.value ? new Date(el.value).toISOString() : null;
    else row[feld.key] = el.value;
  }
  return row;
}
function normalisiereRichtext(html) {
  return (html || '').replace(/<b>/g, '<strong>').replace(/<\/b>/g, '</strong>')
    .replace(/<div>/g, '<p class="rt">').replace(/<\/div>/g, '</p>')
    .replace(/style="[^"]*"/g, '');
}

// ---------------------------------------------------------------------------
//  Datenzugriff
// ---------------------------------------------------------------------------
async function ladeListe(table, order) {
  let q = sb.from(table).select('*');
  if (order) q = q.order(order, { ascending: true });
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
async function ladeSingle(table) {
  const { data, error } = await sb.from(table).select('*').limit(1);
  if (error) throw error;
  return (data && data[0]) || {};
}
async function speichern(table, row) {
  const { data, error } = await sb.from(table).upsert(row).select();
  if (error) throw error;
  return data && data[0];
}
async function loeschen(table, id) {
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
//  UI: Bereiche
// ---------------------------------------------------------------------------
async function renderSingle(key) {
  const def = SCHEMA[key];
  const daten = await ladeSingle(key);
  const main = $('#main'); main.innerHTML = '';
  main.appendChild(h(`<h1>${esc(def.titel)}</h1>`));
  const form = h(`<div class="form"></div>`);
  def.felder.forEach((f) => form.appendChild(feldWidget(f, daten[f.key])));
  const btn = h(`<button class="btn primary">Speichern</button>`);
  btn.addEventListener('click', async () => {
    try {
      const row = formSammeln(form, def.felder);
      if (daten.id) row.id = daten.id;
      await speichern(key, row);
      toast('Gespeichert ✓ – aber noch nicht live! Damit die Änderung auf der Website erscheint, oben zusätzlich auf „Veröffentlichen“ klicken.', 'ok', 8000);
    } catch (e) { toast('Fehler: ' + e.message, 'err'); }
  });
  main.append(form, btn);
}

async function renderListe(key) {
  const def = SCHEMA[key];
  const rows = await ladeListe(key, def.order);
  const main = $('#main'); main.innerHTML = '';
  main.appendChild(h(`<h1>${esc(def.titel)}</h1>`));
  const addBtn = h(`<button class="btn">+ Neu anlegen</button>`);
  addBtn.addEventListener('click', () => editForm(key, {}));
  main.appendChild(addBtn);
  const list = h(`<div class="liste"></div>`);
  rows.forEach((r) => {
    const zeile = h(`<div class="listrow">
      <span class="lr-name">${esc(r[def.labelKey] || '(ohne Namen)').replace(/\n/g, ' ')}</span>
      <span class="lr-flag">${r.sichtbar === false ? '<em>ausgeblendet</em>' : 'sichtbar'}</span>
    </div>`);
    const edit = h(`<button class="btn small">Bearbeiten</button>`);
    edit.addEventListener('click', () => editForm(key, r));
    const del = h(`<button class="btn small danger">Löschen</button>`);
    del.addEventListener('click', async () => { if (confirm('Wirklich löschen?')) { try { await loeschen(key, r.id); toast('Gelöscht.'); renderListe(key); } catch (e) { toast('Fehler: ' + e.message, 'err'); } } });
    zeile.append(edit, del);
    list.appendChild(zeile);
  });
  main.appendChild(list);
}

async function editForm(key, row) {
  const def = SCHEMA[key];
  const main = $('#main'); main.innerHTML = '';
  main.appendChild(h(`<h1>${esc(def.titel)} – ${row.id ? 'bearbeiten' : 'neu'}</h1>`));
  const form = h(`<div class="form"></div>`);
  def.felder.forEach((f) => form.appendChild(feldWidget(f, row[f.key])));
  main.appendChild(form);

  // Kinder (z. B. Band-Links) nur bei gespeichertem Datensatz
  if (def.kinder && row.id) {
    for (const kd of def.kinder) main.appendChild(await linkListe(kd.table, kd.fk, row.id, kd.titel));
  } else if (def.kinder && !row.id) {
    main.appendChild(h(`<div class="hinweis">Erst speichern, danach können Links hinzugefügt werden.</div>`));
  }

  const save = h(`<button class="btn primary">Speichern</button>`);
  save.addEventListener('click', async () => {
    try {
      const data = formSammeln(form, def.felder);
      if (row.id) data.id = row.id;
      const gespeichert = await speichern(key, data);
      toast('Gespeichert ✓ – aber noch nicht live! Damit die Änderung auf der Website erscheint, oben zusätzlich auf „Veröffentlichen“ klicken.', 'ok', 8000);
      editForm(key, gespeichert); // neu laden (jetzt mit id für Kinder)
    } catch (e) { toast('Fehler: ' + e.message, 'err'); }
  });
  const back = h(`<button class="btn">Zurück zur Liste</button>`);
  back.addEventListener('click', () => renderListe(key));
  main.append(save, back);
}

// Link-Unterliste (Band-Links, Act-Links)
async function linkListe(table, fk, parentId, titel) {
  const box = h(`<div class="kinder"><h3>${esc(titel)}</h3></div>`);
  const { data } = await sb.from(table).select('*').eq(fk, parentId).order('reihenfolge', { ascending: true });
  (data || []).forEach((l) => {
    const zeile = h(`<div class="linkrow"><span>${esc(l.plattform)}: ${esc(l.url)}</span></div>`);
    const del = h(`<button class="btn small danger">×</button>`);
    del.addEventListener('click', async () => { await sb.from(table).delete().eq('id', l.id); linkListe(table, fk, parentId, titel).then((n) => box.replaceWith(n)); });
    zeile.appendChild(del); box.appendChild(zeile);
  });
  const sel = h(`<select>${PLATTFORMEN.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`);
  const url = h(`<input type="url" placeholder="https://…">`);
  const add = h(`<button class="btn small">+ Link</button>`);
  add.addEventListener('click', async () => {
    if (!url.value) return;
    await sb.from(table).insert({ [fk]: parentId, plattform: sel.value, url: url.value });
    linkListe(table, fk, parentId, titel).then((n) => box.replaceWith(n));
  });
  box.append(h('<div class="linkadd"></div>'));
  box.lastChild.append(sel, url, add);
  return box;
}

// ---------------------------------------------------------------------------
//  Rückblick (verschachtelt)
// ---------------------------------------------------------------------------
async function renderRueckblick() {
  const rows = await ladeListe('rueckblick_jahre', 'reihenfolge');
  const main = $('#main'); main.innerHTML = '';
  main.appendChild(h(`<h1>Rückblick-Jahre</h1>`));
  const add = h(`<button class="btn">+ Neues Jahr anlegen</button>`);
  add.addEventListener('click', () => rueckblickForm({}));
  main.appendChild(add);
  const list = h('<div class="liste"></div>');
  rows.reverse().forEach((r) => {
    const zeile = h(`<div class="listrow"><span class="lr-name">${esc(r.titel)}</span><span class="lr-flag">${r.sichtbar === false ? '<em>ausgeblendet</em>' : 'sichtbar'}</span></div>`);
    const edit = h(`<button class="btn small">Bearbeiten</button>`);
    edit.addEventListener('click', () => rueckblickForm(r));
    const del = h(`<button class="btn small danger">Löschen</button>`);
    del.addEventListener('click', async () => { if (confirm('Jahr inkl. aller Bilder/Acts löschen?')) { await loeschen('rueckblick_jahre', r.id); toast('Gelöscht.'); renderRueckblick(); } });
    zeile.append(edit, del); list.appendChild(zeile);
  });
  main.appendChild(list);
}
async function rueckblickForm(row) {
  const main = $('#main'); main.innerHTML = '';
  main.appendChild(h(`<h1>Rückblick ${row.id ? esc(row.titel) : 'neu'}</h1>`));
  const form = h('<div class="form"></div>');
  RB_JAHR_FELDER.forEach((f) => form.appendChild(feldWidget(f, row[f.key])));
  main.appendChild(form);
  const save = h(`<button class="btn primary">Speichern</button>`);
  save.addEventListener('click', async () => {
    try {
      const data = formSammeln(form, RB_JAHR_FELDER);
      if (!data.slug && data.jahr) data.slug = 'rueckblick-' + data.jahr;
      if (row.id) data.id = row.id;
      const g = await speichern('rueckblick_jahre', data);
      toast('Gespeichert ✓ – aber noch nicht live! Damit die Änderung auf der Website erscheint, oben zusätzlich auf „Veröffentlichen“ klicken.', 'ok', 8000); rueckblickForm(g);
    } catch (e) { toast('Fehler: ' + e.message, 'err'); }
  });
  const back = h(`<button class="btn">Zurück</button>`); back.addEventListener('click', renderRueckblick);
  main.append(save, back);
  if (row.id) {
    main.appendChild(await mediaListe('rueckblick_intro', row.id, 'Intro-Galerie', [{ key: 'bild', type: 'image', minW: 700 }, { key: 'alt', type: 'text', label: 'Bildbeschreibung' }, { key: 'rahmen', type: 'bool', label: 'Im Goldrahmen (Urkunde)' }]));
    main.appendChild(await actListe(row.id));
    main.appendChild(await mediaListe('rueckblick_presse', row.id, 'Presse', [{ key: 'bild', type: 'image', minW: 700 }, { key: 'alt', type: 'text', label: 'Bildbeschreibung' }]));
  } else {
    main.appendChild(h('<div class="hinweis">Erst speichern, danach Galerie, Acts und Presse pflegen.</div>'));
  }
}
async function mediaListe(table, jahrId, titel, felder) {
  const box = h(`<div class="kinder"><h3>${esc(titel)}</h3></div>`);
  const { data } = await sb.from(table).select('*').eq('jahr_id', jahrId).order('reihenfolge', { ascending: true });
  (data || []).forEach((it) => {
    const z = h(`<div class="mediarow">${medienVorschauHtml(it.bild || '')}<span>${esc(it.alt || '')}</span></div>`);
    const del = h(`<button class="btn small danger">×</button>`);
    del.addEventListener('click', async () => { await sb.from(table).delete().eq('id', it.id); mediaListe(table, jahrId, titel, felder).then((n) => box.replaceWith(n)); });
    z.appendChild(del); box.appendChild(z);
  });
  const addForm = h('<div class="miniform"></div>');
  felder.forEach((f) => addForm.appendChild(feldWidget({ label: f.label || 'Bild/Video', ...f }, '')));
  const add = h(`<button class="btn small">+ Hinzufügen</button>`);
  add.addEventListener('click', async () => {
    const r = formSammeln(addForm, felder); r.jahr_id = jahrId;
    if (!r.bild) { toast('Bitte zuerst ein Bild/Video hochladen.', 'err'); return; }
    await sb.from(table).insert(r); mediaListe(table, jahrId, titel, felder).then((n) => box.replaceWith(n));
  });
  box.append(addForm, add);
  return box;
}
async function actListe(jahrId) {
  const box = h(`<div class="kinder"><h3>Line-Up-Acts</h3></div>`);
  const { data } = await sb.from('rueckblick_acts').select('*').eq('jahr_id', jahrId).order('reihenfolge', { ascending: true });
  for (const a of (data || [])) {
    const z = h(`<div class="actrow"><strong>${esc(a.name)}</strong> – ${esc(a.beschreibung || '')}</div>`);
    const del = h(`<button class="btn small danger">×</button>`);
    del.addEventListener('click', async () => { await sb.from('rueckblick_acts').delete().eq('id', a.id); actListe(jahrId).then((n) => box.replaceWith(n)); });
    z.appendChild(del);
    z.appendChild(await linkListe('rueckblick_act_links', 'act_id', a.id, 'Links'));
    box.appendChild(z);
  }
  const felder = [
    { key: 'name', type: 'text', label: 'Name' }, { key: 'beschreibung', type: 'text', label: 'Beschreibung' },
    { key: 'foto_a', type: 'image', minW: 700, label: 'Foto A' }, { key: 'foto_b', type: 'image', minW: 700, label: 'Foto B' },
    { key: 'reihenfolge', type: 'number', label: 'Reihenfolge' },
  ];
  const addForm = h('<div class="miniform"></div>');
  felder.forEach((f) => addForm.appendChild(feldWidget(f, '')));
  const add = h(`<button class="btn small">+ Act hinzufügen</button>`);
  add.addEventListener('click', async () => { const r = formSammeln(addForm, felder); r.jahr_id = jahrId; await sb.from('rueckblick_acts').insert(r); actListe(jahrId).then((n) => box.replaceWith(n)); });
  box.append(addForm, add);
  return box;
}

// ---------------------------------------------------------------------------
//  Veröffentlichen
// ---------------------------------------------------------------------------
async function veroeffentlichen() {
  if (!BUILD_HOOK) { toast('Kein Build-Hook hinterlegt (PUBLIC_NETLIFY_BUILD_HOOK in Netlify setzen).', 'err'); return; }
  try { await fetch(BUILD_HOOK, { method: 'POST' }); toast('Veröffentlichung gestartet – in 1–2 Minuten ist der neue Stand live.'); }
  catch (e) { toast('Fehler beim Veröffentlichen: ' + e.message, 'err'); }
}

// ---------------------------------------------------------------------------
//  Navigation / Auth
// ---------------------------------------------------------------------------
const NAV = [
  ['einstellungen', 'Start & Einstellungen', renderSingle],
  ['sponsoren', 'Sponsoren', renderListe],
  ['bands', 'Bands', renderListe],
  ['charity', 'Charity', renderSingle],
  ['anfahrt', 'Anfahrt & Kontakt', renderSingle],
  ['rueckblick', 'Rückblick', renderRueckblick],
  ['rechtstexte', 'Impressum & Datenschutz', renderSingle],
];
function renderDashboard(email) {
  document.body.innerHTML = '';
  const nav = h(`<aside id="nav"><div class="brand">ROCK4AID<br><small>Redaktion</small></div></aside>`);
  NAV.forEach(([key, label, fn]) => {
    const b = h(`<button class="navbtn">${esc(label)}</button>`);
    b.addEventListener('click', () => { $$all('.navbtn').forEach((x) => x.classList.remove('active')); b.classList.add('active'); fn(key === 'rueckblick' ? undefined : key); });
    nav.appendChild(b);
  });
  const pub = h(`<button class="navbtn publish">✓ Veröffentlichen</button>`);
  pub.addEventListener('click', veroeffentlichen); nav.appendChild(pub);
  const out = h(`<button class="navbtn logout">Abmelden (${esc(email)})</button>`);
  out.addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); }); nav.appendChild(out);
  const main = h(`<main id="main"></main>`);
  const toasts = h(`<div id="toasts"></div>`);
  document.body.append(nav, main, toasts);
  // erste Ansicht
  nav.querySelector('.navbtn').classList.add('active');
  renderSingle('einstellungen');
}
function $$all(s) { return Array.from(document.querySelectorAll(s)); }

function renderLogin(fehler) {
  document.body.innerHTML = '';
  const box = h(`<div id="login">
    <div class="brand">ROCK4AID<br><small>Redaktion</small></div>
    ${fehler ? `<div class="loginerr">${esc(fehler)}</div>` : ''}
    <label>E-Mail<input id="le" type="email" autocomplete="username"></label>
    <label>Passwort<input id="lp" type="password" autocomplete="current-password"></label>
    <button class="btn primary" id="lb">Anmelden</button>
    <div id="toasts"></div>
  </div>`);
  document.body.appendChild(box);
  $('#lb').addEventListener('click', async () => {
    const { error } = await sb.auth.signInWithPassword({ email: $('#le').value, password: $('#lp').value });
    if (error) renderLogin('Anmeldung fehlgeschlagen: ' + error.message);
  });
  $('#lp').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#lb').click(); });
}

export async function start() {
  if (!URL || !KEY) { document.body.innerHTML = '<div id="login"><div class="brand">ROCK4AID</div><p style="max-width:420px">Das Redaktionssystem ist noch nicht konfiguriert. Trage in Netlify die Variablen <b>PUBLIC_SUPABASE_URL</b> und <b>PUBLIC_SUPABASE_ANON_KEY</b> ein und veröffentliche neu.</p></div>'; return; }
  sb = createClient(URL, KEY);
  const { data } = await sb.auth.getSession();
  if (data.session) renderDashboard(data.session.user.email);
  else renderLogin();
  sb.auth.onAuthStateChange((_e, session) => { if (session) renderDashboard(session.user.email); });
}
