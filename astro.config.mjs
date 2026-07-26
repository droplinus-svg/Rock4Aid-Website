import { defineConfig } from 'astro/config';

// Statische Website (SSG). Daten werden BEIM BUILD per REST-fetch aus Supabase
// geladen (siehe src/lib/content.js) – niemals supabase-js in Node.
export default defineConfig({
  output: 'static',
  // 'directory' erzeugt /line-up/index.html → passt zu Netlifys Ordner-URLs.
  // Zusammen mit absoluten internen Links (mit führendem /) funktioniert die
  // Navigation von jeder Unterseite aus.
  build: { format: 'directory' },
  // site: 'https://DEINE-DOMAIN.de',  // später eintragen (für Sitemap/SEO)
});
