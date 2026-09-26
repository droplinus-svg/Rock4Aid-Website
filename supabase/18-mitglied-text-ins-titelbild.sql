-- 18: Der erste Abschnitt von "Mitglied werden" wandert mit auf das Titelbild
-- Überschrift und Text werden an den Einleitungstext angehängt, der Abschnitt entfällt.
-- Kann mehrfach ausgeführt werden.
begin;

update public.mitglied m
   set intro_text = coalesce(m.intro_text, '') || E'\n<h3>' || a.titel || E'</h3>\n' || a.text
  from public.mitglied_abschnitte a
 where a.titel like 'Euer Beitrag sorgt dafür%';

delete from public.mitglied_abschnitte where titel like 'Euer Beitrag sorgt dafür%';

commit;

select (select count(*) from public.mitglied_abschnitte) as abschnitte_im_gelben_bereich,
       position('<h3>' in intro_text) > 0 as text_auf_titelbild
  from public.mitglied;
