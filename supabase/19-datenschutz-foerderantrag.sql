-- 19: Datenschutzerklärung um das Antragsformular für die Fördermitgliedschaft ergänzen
-- Fügt einen Abschnitt vor "Deine Rechte" ein und korrigiert den Satz, dass keine
-- Besucherdaten verarbeitet werden. Kann mehrfach ausgeführt werden.
-- Hinweis: Entwurf, bitte vor dem Einschalten des Formulars prüfen (kein Rechtsrat).
begin;

update public.rechtstexte
   set datenschutz_html = replace(
         datenschutz_html,
         'Für normale Besucher der Website werden dabei keine personenbezogenen Daten verarbeitet.',
         'Für normale Besucher der Website werden dabei keine personenbezogenen Daten verarbeitet. Eine Ausnahme ist das Antragsformular für die Fördermitgliedschaft, das im folgenden Abschnitt beschrieben ist.')
 where datenschutz_html not like '%Antrag auf Fördermitgliedschaft%';

update public.rechtstexte
   set datenschutz_html = replace(
         datenschutz_html,
         '<h2>Deine Rechte</h2>',
         $t$<h2>Antrag auf Fördermitgliedschaft</h2><p class="rt">Wenn du über unsere Website eine Fördermitgliedschaft beantragst, verarbeiten wir die Angaben aus dem Formular. Dazu gehören Vor- und Nachname, Anschrift, E-Mail-Adresse, auf Wunsch deine Telefonnummer, die Höhe deines jährlichen Förderbeitrags sowie Kontoinhaber, IBAN und BIC. Außerdem speichern wir den Zeitpunkt des Antrags und den Wortlaut des SEPA-Lastschriftmandats, das du erteilt hast.</p><p class="rt">Wir nutzen diese Daten, um deinen Antrag zu bearbeiten, deine Mitgliedschaft zu verwalten und den Förderbeitrag per Lastschrift einzuziehen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung der Mitgliedschaft). Die Daten werden in der EU gespeichert (Supabase, Frankfurt). Zugriff hat nur der Vorstand. Für den Einzug geben wir Name, IBAN, Betrag und Mandatsreferenz an unsere Bank weiter.</p><p class="rt">Wird ein Antrag nicht angenommen, löschen wir die Daten spätestens sechs Monate danach. Nach dem Ende einer Mitgliedschaft löschen wir die Daten, sobald sie nicht mehr gebraucht werden. Angaben, die wir für die Buchhaltung aufbewahren müssen, heben wir bis zum Ende der gesetzlichen Aufbewahrungsfrist auf.</p><h2>Deine Rechte</h2>$t$)
 where datenschutz_html not like '%Antrag auf Fördermitgliedschaft%';

commit;

select position('Antrag auf Fördermitgliedschaft' in datenschutz_html) > 0 as abschnitt_vorhanden,
       position('<h2>Deine Rechte</h2>' in datenschutz_html) > 0 as anker_gefunden
  from public.rechtstexte;
