// -----------------------------------------------------------------------------
// Datenschicht – lädt Inhalte BEIM BUILD per REST-fetch aus Supabase.
// Bewusst KEIN supabase-js hier (das erzeugt in Node einen WebSocket-Build-
// Fehler). supabase-js wird nur im Browser (/admin) benutzt.
// Ohne gültige Umgebungsvariablen fällt alles auf src/data/fallback.json
// zurück, damit die Seite immer baut.
// -----------------------------------------------------------------------------
import fallback from '../data/fallback.json';

// Stolperfalle 1: URL säubern – Leerzeichen weg, End-Slash weg, versehentliches
// /rest/v1 weg. Erwartet wird exakt https://<ref>.supabase.co
export function cleanUrl(u) {
  let s = (u || '').trim().replace(/\s+/g, '');
  s = s.replace(/\/+$/, '');          // ein oder mehrere End-Slashes
  s = s.replace(/\/rest\/v1$/i, '');  // versehentlich mitkopiertes /rest/v1
  return s;
}

const SUPABASE_URL = cleanUrl(import.meta.env.PUBLIC_SUPABASE_URL);
const SUPABASE_KEY = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '').trim();
const CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const usingFallback = !CONFIGURED;

function fromFallback(table, single) {
  const d = fallback[table];
  if (single) return Array.isArray(d) ? (d[0] || {}) : (d || {});
  return Array.isArray(d) ? d : (d ? [d] : []);
}

// Generischer Tabellen-Loader.
//   select   – Spalten (PostgREST-Syntax, inkl. eingebetteter Relationen)
//   order    – z.B. 'reihenfolge.asc'
//   filters  – { sichtbar: 'eq.true' }
//   single   – true → ein Objekt statt Array
export async function getTable(table, { select = '*', order, filters = {}, single = false } = {}) {
  if (!CONFIGURED) return fromFallback(table, single);
  try {
    const params = new URLSearchParams();
    params.set('select', select);
    if (order) params.set('order', order);
    for (const [k, v] of Object.entries(filters)) params.set(k, v);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (single) return data[0] || fromFallback(table, true);
    return Array.isArray(data) && data.length ? data : fromFallback(table, false);
  } catch (err) {
    console.warn(`[content] '${table}' konnte nicht geladen werden → Fallback (${err.message})`);
    return fromFallback(table, single);
  }
}

export { fallback };
