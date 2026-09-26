-- 16: Kurztitel für die Sprungleiste auf "Über uns"
-- Kann mehrfach ausgeführt werden.
begin;

alter table public.ueber_uns            add column if not exists nav_titel text;
alter table public.ueber_uns_abschnitte add column if not exists kurztitel text;

update public.ueber_uns set nav_titel = 'Das Festival';

update public.ueber_uns_abschnitte set kurztitel = case
  when titel like 'Vier Freunde%'              then 'Von der Idee zum Festival'
  when titel like 'Wir unterstützen Projekte%' then 'Unsere Projekte'
  when titel like 'Bands schenken%'            then 'Für Bands'
  when titel like 'Mit Sponsoren%'             then 'Für Sponsoren'
  when titel like 'Die nächste Ausgabe%'       then 'Ausblick'
  else kurztitel end;

commit;

select reihenfolge, kurztitel, titel from public.ueber_uns_abschnitte order by reihenfolge;
