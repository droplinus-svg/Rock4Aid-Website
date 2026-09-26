-- =============================================================================
-- 10-ueber-uns-mitglied-helfer.sql  (Supabase-Projekt der WEBSITE)
--
-- Neue Seiten "Über uns" und "Mitglied werden" sowie der Menüpunkt "Helfer".
--   - ueber_uns                (eine Zeile: Kopfbereich der Seite)
--   - ueber_uns_abschnitte     (beliebig viele Text-/Bild-Abschnitte)
--   - mitglied                 (eine Zeile: Texte und Einstellungen)
--   - foerderantraege          (Anträge inkl. SEPA-Lastschriftmandat)
--   - einstellungen            (neue Schalter + Link zur Helferanmeldung)
--
-- Sicherheit Förderanträge:
--   Besucher der Website können einen Antrag NUR über die Funktion
--   foerderantrag_stellen() einreichen. Lesen können Anträge ausschließlich
--   angemeldete Redakteure (Login im Redaktionssystem).
--
-- Läuft als EINE Transaktion und ist wiederholbar.
-- =============================================================================

begin;

-- 1. Einstellungen erweitern
alter table public.einstellungen
  add column if not exists ueberuns_sichtbar boolean not null default true,
  add column if not exists mitglied_sichtbar boolean not null default true,
  add column if not exists helfer_sichtbar   boolean not null default true,
  add column if not exists helfer_link       text;

-- 2. Über uns
create table if not exists public.ueber_uns (
  id          bigserial primary key,
  sichtbar    boolean not null default true,
  hero_titel  text,
  hero_bild   text,
  intro_text  text,
  updated_at  timestamptz not null default now()
);
create table if not exists public.ueber_uns_abschnitte (
  id          bigserial primary key,
  titel       text,
  text        text,
  bild        text,
  bild_rechts boolean not null default false,
  reihenfolge integer not null default 1,
  sichtbar    boolean not null default true
);

insert into public.ueber_uns (hero_titel, intro_text)
select 'Über uns', '<p>Wir sind Rock4Aid e.V. aus Heddesheim. Mit unserem Benefiz-Festival sammeln wir Geld für konkrete Hilfsprojekte.</p>'
where not exists (select 1 from public.ueber_uns);

insert into public.ueber_uns_abschnitte (titel, text, reihenfolge)
select * from (values
  ('Wer wir sind', '<p>Hier stellen wir den Verein und die Menschen dahinter vor.</p>', 1),
  ('Was uns antreibt', '<p>Hier beschreiben wir, warum wir das Festival machen und wem der Erlös zugutekommt.</p>', 2),
  ('Mach mit', '<p>Hier laden wir ein, als Helfer, Fördermitglied oder Sponsor dabei zu sein.</p>', 3)
) v(titel, text, reihenfolge)
where not exists (select 1 from public.ueber_uns_abschnitte);

-- 3. Mitglied werden
create table if not exists public.mitglied (
  id               bigserial primary key,
  sichtbar         boolean not null default true,
  hero_titel       text,
  hero_bild        text,
  intro_text       text,
  leistungen_titel text,
  leistungen_text  text,
  formular_aktiv   boolean not null default true,
  mindestbetrag    numeric(10,2) not null default 12,
  vorschlagsbetraege text not null default '24, 60, 120',
  glaeubiger_id    text,
  danke_text       text,
  updated_at       timestamptz not null default now()
);

insert into public.mitglied (hero_titel, intro_text, leistungen_titel, leistungen_text, danke_text)
select 'Werde Fördermitglied',
       '<p>Mit einer Fördermitgliedschaft unterstützt du Rock4Aid dauerhaft. Du legst selbst fest, wie viel du jährlich spendest.</p>',
       'Das bekommst du als Fördermitglied',
       '<ul><li>Du erhältst jedes Jahr eine Spendenbescheinigung.</li><li>Du bekommst Neuigkeiten zum Festival und zu den Projekten als Erste.</li><li>Du hilfst uns, langfristig zu planen.</li></ul>',
       '<p>Vielen Dank! Wir haben deinen Antrag erhalten und melden uns in Kürze bei dir.</p>'
where not exists (select 1 from public.mitglied);

create table if not exists public.foerderantraege (
  id                bigserial primary key,
  created_at        timestamptz not null default now(),
  vorname           text not null,
  nachname          text not null,
  strasse           text not null,
  plz               text not null,
  ort               text not null,
  email             text not null,
  telefon           text,
  betrag_jahr       numeric(10,2) not null check (betrag_jahr > 0),
  kontoinhaber      text not null,
  iban              text not null,
  bic               text,
  mandat_zustimmung boolean not null,
  mandat_text       text not null,
  datenschutz_ok    boolean not null,
  status            text not null default 'neu' check (status in ('neu','in Bearbeitung','aktiv','abgelehnt','beendet')),
  mandatsreferenz   text,
  notiz             text
);
comment on table public.foerderantraege is 'Anträge auf Fördermitgliedschaft mit SEPA-Lastschriftmandat. Enthält Bankdaten: nur für angemeldete Redakteure lesbar.';

-- 4. Zugriffsregeln
alter table public.ueber_uns            enable row level security;
alter table public.ueber_uns_abschnitte enable row level security;
alter table public.mitglied             enable row level security;
alter table public.foerderantraege      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['ueber_uns','ueber_uns_abschnitte','mitglied'] loop
    execute format('drop policy if exists "alle lesen" on public.%I', t);
    execute format('drop policy if exists "redaktion schreibt" on public.%I', t);
    execute format('create policy "alle lesen" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "redaktion schreibt" on public.%I for all to authenticated using (true) with check (true)', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

revoke all on public.foerderantraege from anon;
grant select, insert, update, delete on public.foerderantraege to authenticated;
drop policy if exists "redaktion verwaltet antraege" on public.foerderantraege;
create policy "redaktion verwaltet antraege" on public.foerderantraege for all to authenticated using (true) with check (true);

-- 5. Antrag stellen (ohne Login, mit Prüfung)
create or replace function public.foerderantrag_stellen(
  p_vorname text, p_nachname text, p_strasse text, p_plz text, p_ort text,
  p_email text, p_telefon text, p_betrag numeric,
  p_kontoinhaber text, p_iban text, p_bic text,
  p_mandat_zustimmung boolean, p_mandat_text text, p_datenschutz_ok boolean)
 returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_iban text := upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g'));
  v_num  text;
  v_rest int := 0;
  v_min  numeric;
  i int;
begin
  select mindestbetrag into v_min from mitglied where formular_aktiv order by id limit 1;
  if v_min is null then raise exception 'Anträge sind derzeit nicht möglich'; end if;
  if coalesce(trim(p_vorname),'') = '' or coalesce(trim(p_nachname),'') = '' or coalesce(trim(p_strasse),'') = ''
     or coalesce(trim(p_plz),'') = '' or coalesce(trim(p_ort),'') = '' or coalesce(trim(p_kontoinhaber),'') = '' then
    raise exception 'Bitte alle Pflichtfelder ausfüllen';
  end if;
  if coalesce(trim(p_email),'') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-Mail-Adresse ungültig'; end if;
  if p_betrag is null or p_betrag < v_min or p_betrag > 100000 then raise exception 'Der Jahresbetrag muss mindestens % Euro betragen', v_min; end if;
  if not coalesce(p_mandat_zustimmung, false) then raise exception 'Bitte das SEPA-Lastschriftmandat bestätigen'; end if;
  if not coalesce(p_datenschutz_ok, false) then raise exception 'Bitte der Datenschutzerklärung zustimmen'; end if;
  if length(p_vorname) > 100 or length(p_nachname) > 100 or length(p_strasse) > 200 or length(p_ort) > 100
     or length(coalesce(p_mandat_text,'')) > 3000 then raise exception 'Eingabe zu lang'; end if;

  -- IBAN-Prüfziffer (ISO 13616, Modulo 97)
  if v_iban !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then raise exception 'IBAN ungültig'; end if;
  v_num := substr(v_iban, 5) || substr(v_iban, 1, 4);
  for i in 1..length(v_num) loop
    if substr(v_num, i, 1) ~ '[A-Z]' then
      v_rest := (v_rest * 100 + (ascii(substr(v_num, i, 1)) - 55)) % 97;
    else
      v_rest := (v_rest * 10 + substr(v_num, i, 1)::int) % 97;
    end if;
  end loop;
  if v_rest <> 1 then raise exception 'IBAN ungültig (Prüfziffer stimmt nicht)'; end if;

  insert into foerderantraege (vorname, nachname, strasse, plz, ort, email, telefon, betrag_jahr,
                               kontoinhaber, iban, bic, mandat_zustimmung, mandat_text, datenschutz_ok)
  values (trim(p_vorname), trim(p_nachname), trim(p_strasse), trim(p_plz), trim(p_ort), lower(trim(p_email)),
          nullif(trim(coalesce(p_telefon,'')), ''), round(p_betrag, 2),
          trim(p_kontoinhaber), v_iban, nullif(upper(trim(coalesce(p_bic,''))), ''), true, p_mandat_text, true);
  return true;
end $$;
revoke all on function public.foerderantrag_stellen(text,text,text,text,text,text,text,numeric,text,text,text,boolean,text,boolean) from public;
grant execute on function public.foerderantrag_stellen(text,text,text,text,text,text,text,numeric,text,text,text,boolean,text,boolean) to anon, authenticated;

commit;

select 'ueber_uns' as tabelle, count(*) from public.ueber_uns
union all select 'ueber_uns_abschnitte', count(*) from public.ueber_uns_abschnitte
union all select 'mitglied', count(*) from public.mitglied
union all select 'foerderantraege', count(*) from public.foerderantraege;
