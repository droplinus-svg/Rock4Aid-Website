-- 20: Kontaktformular
-- 1. E-Mail-Adressen in den Texten werden zu Links auf das Kontaktformular,
--    jeweils mit dem passenden Anliegen vorausgewählt.
-- 2. Die Datenschutzerklärung erhält einen Abschnitt zum Kontaktformular.
-- Kann mehrfach ausgeführt werden.
begin;

update public.ueber_uns_abschnitte
   set text = regexp_replace(text,
         '(<br>|\s)?<a href="mailto:rock4aid2025@gmail\.com">rock4aid2025@gmail\.com</a>',
         ' <a href="/kontakt/?anliegen=' ||
           case when titel like 'Bands%' then 'band'
                when titel like 'Mit Sponsoren%' then 'sponsor'
                else 'allgemein' end
           || '">Zum Kontaktformular</a>', 'g')
 where text like '%mailto:rock4aid2025@gmail.com%';

update public.mitglied_abschnitte
   set text = regexp_replace(text,
         '(<br>|\s)?<a href="mailto:rock4aid2025@gmail\.com">rock4aid2025@gmail\.com</a>',
         ' <a href="/kontakt/?anliegen=mitglied">Zum Kontaktformular</a>', 'g')
 where text like '%mailto:rock4aid2025@gmail.com%';

update public.mitglied
   set formular_nachtext = regexp_replace(formular_nachtext,
         '(<br>|\s)?<a href="mailto:rock4aid2025@gmail\.com">rock4aid2025@gmail\.com</a>',
         ' <a href="/kontakt/?anliegen=mitglied">Zum Kontaktformular</a>', 'g')
 where formular_nachtext like '%mailto:rock4aid2025@gmail.com%';

update public.rechtstexte
   set datenschutz_html = replace(
         datenschutz_html,
         '<h2>Deine Rechte</h2>',
         $t$<h2>Kontaktformular</h2><p class="rt">Wenn du uns über das Kontaktformular schreibst, verarbeiten wir deinen Namen, deine E-Mail-Adresse, auf Wunsch deine Telefonnummer, dein Anliegen und deine Nachricht. Wir nutzen diese Angaben nur, um deine Anfrage zu beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, wenn es um eine Mitgliedschaft, einen Auftritt oder ein Sponsoring geht, und sonst Art. 6 Abs. 1 lit. f DSGVO (unser berechtigtes Interesse, Anfragen zu beantworten).</p><p class="rt">Das Formular wird über unseren Hoster Netlify verarbeitet und dort gespeichert. Die Nachricht wird anschließend an unser E-Mail-Postfach bei Google (Gmail) weitergeleitet. Dabei können Daten in die USA übermittelt werden. Für Netlify gilt der oben genannte Auftragsverarbeitungsvertrag mit EU-Standardvertragsklauseln. Wir löschen deine Anfrage, sobald sie erledigt ist und keine Aufbewahrungspflicht besteht.</p><h2>Deine Rechte</h2>$t$)
 where datenschutz_html not like '%<h2>Kontaktformular</h2>%';

commit;

select 'ueber_uns_abschnitte' as tabelle, count(*) filter (where text like '%/kontakt/?anliegen=%') as mit_formularlink from public.ueber_uns_abschnitte
union all select 'mitglied_abschnitte', count(*) filter (where text like '%/kontakt/?anliegen=%') from public.mitglied_abschnitte
union all select 'mitglied', count(*) filter (where formular_nachtext like '%/kontakt/?anliegen=%') from public.mitglied
union all select 'datenschutz', count(*) filter (where datenschutz_html like '%<h2>Kontaktformular</h2>%') from public.rechtstexte;
