// Teilt einen HTML-Text hinter dem n-ten Absatz (</p>), damit ein Bild
// zwischen den Absätzen stehen kann. n = 0 setzt das Bild über den Text.
export function teileText(html, n) {
  const text = html || '';
  const nr = Number.isFinite(Number(n)) ? Number(n) : 1;
  if (nr <= 0) return ['', text];
  let pos = -1;
  for (let i = 0; i < nr; i++) {
    const hit = text.indexOf('</p>', pos + 1);
    if (hit === -1) return [text, ''];
    pos = hit;
  }
  return [text.slice(0, pos + 4), text.slice(pos + 4)];
}
