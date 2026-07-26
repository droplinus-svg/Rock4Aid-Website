# Rock4Aid – Website & Redaktionssystem

Statische Astro-Website mit Redaktionssystem unter `/admin` (Supabase).

- Öffentliche Seiten: statisch, Daten kommen beim Build per REST aus Supabase.
- Ohne Supabase-Zugang baut die Seite trotzdem (Fallback: `src/data/fallback.json`).
- Redaktionssystem: `/admin`, Login über Supabase Auth, Bilder in Storage-Bucket `images`.

## Einrichtung
Siehe den Ordner `00_START-HIER` (eine Ebene höher) – dort steht die komplette Anleitung.

## Lokale Entwicklung (optional, für Technikinteressierte)
```
npm install
npm run dev      # Vorschau unter http://localhost:4321
npm run build    # baut nach dist/
```
Umgebungsvariablen (`.env`, Vorlage siehe `.env.example`):
`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (Publishable key!), optional `PUBLIC_NETLIFY_BUILD_HOOK`.
