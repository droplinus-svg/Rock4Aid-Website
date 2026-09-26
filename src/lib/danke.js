import { getTable } from './content.js';

/** Alle sichtbaren Dankesseiten mit Zahlen, Fotos und Presse, neueste zuerst. */
export async function ladeDankesseiten() {
  const seiten = (await getTable('danke_seiten', { order: 'jahr.desc' })).filter((s) => s && s.jahr && s.sichtbar !== false);
  if (!seiten.length) return [];
  const [zahlen, bilder, presse] = await Promise.all([
    getTable('danke_zahlen', { order: 'reihenfolge.asc' }),
    getTable('danke_bilder', { order: 'reihenfolge.asc' }),
    getTable('danke_presse', { order: 'reihenfolge.asc' }),
  ]);
  const jahre = seiten.map((s) => s.jahr);
  return seiten.map((seite) => ({
    seite,
    zahlen: zahlen.filter((x) => x.seite_id === seite.id),
    bilder: bilder.filter((x) => x.seite_id === seite.id && x.bild),
    presse: presse.filter((x) => x.seite_id === seite.id && x.bild),
    jahre,
  }));
}
