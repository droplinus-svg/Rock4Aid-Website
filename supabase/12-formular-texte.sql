-- 12: Texte rund um das Antragsformular auf "Mitglied werden" und Absatz zum Seewandel
-- Voraussetzung: 10 und 11 sind gelaufen. Kann mehrfach ausgeführt werden.
begin;

alter table public.mitglied add column if not exists formular_titel    text;
alter table public.mitglied add column if not exists formular_text     text;
alter table public.mitglied add column if not exists formular_nachtext text;

update public.mitglied set
  formular_titel    = 'In wenigen Minuten seid ihr Fördermitglied',
  formular_text     = $t$<p>Tragt einfach eure Daten und die Höhe eures jährlichen Förderbeitrags ein. Außerdem erteilt ihr uns ein SEPA-Lastschriftmandat (Erlaubnis, den Beitrag von eurem Konto einzuziehen). So wird euer Beitrag einmal im Jahr bequem abgebucht, und ihr müsst euch um nichts weiter kümmern. Nach eurer Anmeldung melden wir uns bei euch und heißen euch im Verein willkommen.</p>$t$,
  formular_nachtext = $t$<p>Ihr habt vorab noch Fragen zur Mitgliedschaft? Dann schreibt uns.<br><a href="mailto:rock4aid2025@gmail.com">rock4aid2025@gmail.com</a></p>$t$,
  -- Formular bleibt aus, bis Gläubiger-ID, Satzung und Datenschutzerklärung geklärt sind.
  -- Einschalten später im Redaktionsbereich unter "Mitglied werden".
  formular_aktiv    = false;

-- Der bisherige Abschnitt "So werdet ihr Fördermitglied" wird durch den Formularbereich ersetzt
delete from public.mitglied_abschnitte where titel = 'So werdet ihr Fördermitglied';

-- Absatz zum Seewandel auf "Über uns" ersetzen
update public.ueber_uns_abschnitte
   set text = replace(text, $t$<p>Rock4Aid gibt es auch über das eigene Festival hinaus. Beim Seewandel in Heddesheim betreiben wir eine eigene Rock4Aid-Bühne. Auch dort spielen Bands für die gute Sache und machen Rock4Aid in der Region bekannt.</p>$t$, $t$<p>Rock4Aid gibt es auch über das eigene Festival hinaus. Jedes Jahr am 3. Oktober feiert Heddesheim den Seewandel, zu dem rund 3.500 Besucher kommen. Dort betreiben wir eine eigene Rock4Aid-Bühne mit Unplugged-Musik, schenken Getränke aus und sammeln Spenden. Auch dieser Erlös fließt in unsere Hilfsprojekte. Für Bands ist das eine weitere Gelegenheit, vor großem Publikum für die gute Sache zu spielen.</p>$t$)
 where text like '%Seewandel%';

commit;

select formular_titel, formular_aktiv, (select count(*) from public.mitglied_abschnitte) as abschnitte
from public.mitglied;
