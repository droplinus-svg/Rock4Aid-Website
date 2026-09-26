-- 15: E-Mail-Adresse direkt hinter den Satz setzen, ohne Zeilenumbruch
-- Kann mehrfach ausgeführt werden.
begin;

update public.ueber_uns_abschnitte
   set text = replace(text, '<br><a href="mailto:', ' <a href="mailto:')
 where text like '%<br><a href="mailto:%';

update public.mitglied_abschnitte
   set text = replace(text, '<br><a href="mailto:', ' <a href="mailto:')
 where text like '%<br><a href="mailto:%';

update public.mitglied
   set formular_nachtext = replace(formular_nachtext, '<br><a href="mailto:', ' <a href="mailto:')
 where formular_nachtext like '%<br><a href="mailto:%';

commit;

select 'ueber_uns_abschnitte' as tabelle, count(*) filter (where text like '%<br><a href="mailto:%') as noch_mit_umbruch from public.ueber_uns_abschnitte
union all select 'mitglied_abschnitte', count(*) filter (where text like '%<br><a href="mailto:%') from public.mitglied_abschnitte
union all select 'mitglied', count(*) filter (where formular_nachtext like '%<br><a href="mailto:%') from public.mitglied;
