// -----------------------------------------------------------------------------
// Sitemap für Suchmaschinen (https://rock4aid.de/sitemap.xml).
// Entsteht bei jedem Build neu. Sie enthält nur Seiten, die gerade veröffentlicht
// sind. Ausgeblendete Seiten, Vorschau-Adressen und Helfer-Dankesseiten fehlen
// bewusst, damit Google sie nicht aufnimmt.
// -----------------------------------------------------------------------------
import { getTable } from '../lib/content.js';

const SITE = 'https://rock4aid.de';

export async function GET() {
  const e = await getTable('einstellungen', { single: true });
  const charity = await getTable('charity', { single: true });
  const anfahrt = await getTable('anfahrt', { single: true });
  const ueber = await getTable('ueber_uns', { single: true });
  const mitglied = await getTable('mitglied', { single: true });
  const jahre = (await getTable('rueckblick_jahre', { order: 'reihenfolge.desc' })) || [];

  const seiten = [
    ['/', true],
    ['/line-up/', e.lineup_sichtbar !== false],
    ['/charity/', e.charity_sichtbar !== false && charity.sichtbar !== false],
    ['/ueber-uns/', e.ueberuns_sichtbar !== false && ueber.sichtbar !== false],
    ['/mitglied-werden/', e.mitglied_sichtbar !== false && mitglied.sichtbar !== false],
    ['/anfahrt-kontakt/', e.anfahrt_sichtbar !== false && anfahrt.sichtbar !== false],
    ['/kontakt/', true],
    ['/helfer/', e.helfer_sichtbar !== false],
    ['/impressum/', true],
    ['/datenschutz/', true],
    ...jahre.filter((j) => j.sichtbar !== false && j.slug).map((j) => [`/${j.slug}/`, true]),
  ].filter(([, sichtbar]) => sichtbar);

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + seiten.map(([pfad]) => `  <url><loc>${SITE}${pfad}</loc></url>`).join('\n')
    + '\n</urlset>\n';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
