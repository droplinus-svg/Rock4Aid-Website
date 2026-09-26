-- 13: Neues Layout für "Über uns"
-- 1. Der Abschnitt ohne Überschrift wandert auf das Titelbild (in den Einleitungstext).
-- 2. Bilder stehen jetzt zwischen den Absätzen. bild_nach_absatz legt fest, hinter welchem Absatz.
-- Voraussetzung: 10, 11 und 12 sind gelaufen. Kann mehrfach ausgeführt werden.
begin;

alter table public.ueber_uns_abschnitte add column if not exists bild_nach_absatz int not null default 1;

update public.ueber_uns u
   set intro_text = coalesce(u.intro_text, '') || E'\n' ||
       (select string_agg(a.text, E'\n' order by a.reihenfolge)
          from public.ueber_uns_abschnitte a
         where coalesce(trim(a.titel), '') = '')
 where exists (select 1 from public.ueber_uns_abschnitte a where coalesce(trim(a.titel), '') = '');

delete from public.ueber_uns_abschnitte where coalesce(trim(titel), '') = '';

-- Gründerfoto direkt vor "Im Vorstand sind wir vier Freunde ..." (nach dem 3. Absatz)
update public.ueber_uns_abschnitte
   set bild_nach_absatz = 3
 where titel like 'Vier Freunde%';

commit;

select reihenfolge, titel, bild, bild_nach_absatz
  from public.ueber_uns_abschnitte order by reihenfolge;
