-- 21: Anliegen des Kontaktformulars im Redaktionssystem pflegen
--     und E-Mail-Links auf "Anfahrt & Kontakt" auf das Kontaktformular umstellen.
-- Kann mehrfach ausgeführt werden.
begin;

create table if not exists public.kontakt_anliegen (
  id               bigserial primary key,
  bezeichnung      text not null,
  kuerzel          text not null unique,
  hinweis          text,
  zeige_musiklink  boolean not null default false,
  reihenfolge      integer not null default 1,
  sichtbar         boolean not null default true
);
comment on column public.kontakt_anliegen.kuerzel is 'Wird in Links genutzt, z. B. /kontakt/?anliegen=band';

alter table public.kontakt_anliegen enable row level security;
drop policy if exists "alle lesen" on public.kontakt_anliegen;
drop policy if exists "redaktion schreibt" on public.kontakt_anliegen;
create policy "alle lesen" on public.kontakt_anliegen for select to anon, authenticated using (true);
create policy "redaktion schreibt" on public.kontakt_anliegen for all to authenticated using (true) with check (true);
grant select on public.kontakt_anliegen to anon;
grant select, insert, update, delete on public.kontakt_anliegen to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into public.kontakt_anliegen (bezeichnung, kuerzel, zeige_musiklink, reihenfolge) values
  ('Allgemeine Frage',            'allgemein', false, 1),
  ('Fördermitglied werden',       'mitglied',  false, 2),
  ('Als Band auftreten',          'band',      true,  3),
  ('Sponsor werden',              'sponsor',   false, 4),
  ('Spende oder Spendenquittung', 'spende',    false, 5),
  ('Beim Festival mithelfen',     'helfer',    false, 6),
  ('Presseanfrage',               'presse',    false, 7),
  ('Sonstiges',                   'sonstiges', false, 8)
on conflict (kuerzel) do nothing;

-- E-Mail-Links im Veranstalter-Text werden zu Links auf das Kontaktformular
update public.anfahrt
   set veranstalter_text = regexp_replace(veranstalter_text,
         '<a[^>]*href="mailto:[^"]*"[^>]*>[^<]*</a>',
         '<a href="/kontakt/">Zum Kontaktformular</a>', 'g')
 where veranstalter_text ~ 'href="mailto:';

commit;

select reihenfolge, bezeichnung, kuerzel, zeige_musiklink from public.kontakt_anliegen order by reihenfolge;
