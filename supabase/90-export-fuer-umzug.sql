-- 90: Export für den Umzug der Website in die Festival-App
-- Im Supabase-Projekt der WEBSITE ausführen. Ändert nichts, liest nur.
-- Ergebnis danach über "Export" -> "Download CSV" speichern.
-- Eine Zeile pro Tabelle: Spaltenaufbau, Regeln und alle Daten als JSON.
-- Letzte Zeile: Liste aller Bilder im Storage.

create or replace function pg_temp.daten(t text) returns json
language plpgsql as $$
declare r json;
begin
  execute format('select coalesce(json_agg(x), ''[]''::json) from public.%I x', t) into r;
  return r;
end $$;

select c.relname as tabelle,
       (select json_agg(json_build_object(
                 'spalte', a.attname,
                 'typ', format_type(a.atttypid, a.atttypmod),
                 'pflicht', a.attnotnull,
                 'standard', pg_get_expr(d.adbin, d.adrelid)) order by a.attnum)
          from pg_attribute a
          left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
         where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped) as spalten,
       (select json_agg(json_build_object('name', k.conname, 'def', pg_get_constraintdef(k.oid)))
          from pg_constraint k where k.conrelid = c.oid) as regeln,
       pg_temp.daten(c.relname) as daten
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
union all
select '_storage', null, null,
       (select coalesce(json_agg(json_build_object('bucket', bucket_id, 'name', name,
                 'typ', metadata->>'mimetype', 'groesse', metadata->>'size')), '[]'::json)
          from storage.objects)
union all
select '_funktionen', null, null,
       (select coalesce(json_agg(json_build_object('name', p.proname, 'def', pg_get_functiondef(p.oid))), '[]'::json)
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.prokind = 'f')
order by 1;
