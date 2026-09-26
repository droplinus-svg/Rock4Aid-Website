-- 17: Titelbild für "Mitglied werden" (feierndes Publikum vor der Bühne)
-- Das Bild liegt bereits auf der Website unter /assets. Kann mehrfach ausgeführt werden.
update public.mitglied set hero_bild = '/assets/dawedda-b.jpg';

select hero_titel, hero_bild from public.mitglied;
