-- =============================================================================
-- 11-texte-ueber-uns-mitglied.sql  (Supabase-Projekt der WEBSITE)
--
-- Voraussetzung: 10-ueber-uns-mitglied-helfer.sql wurde ausgefuehrt.
--   1. Neue Tabelle mitglied_abschnitte (Textabschnitte der Seite
--      "Mitglied werden", analog zu ueber_uns_abschnitte)
--   2. Befuellt "Über uns" und "Mitglied werden" mit den finalen Texten.
--      ACHTUNG: Ersetzt alle bisherigen Abschnitte dieser beiden Seiten.
-- Bilder werden danach im Redaktionssystem hochgeladen.
-- Laeuft als EINE Transaktion.
-- =============================================================================

begin;

create table if not exists public.mitglied_abschnitte (
  id          bigserial primary key,
  titel       text,
  text        text,
  bild        text,
  bild_rechts boolean not null default false,
  reihenfolge integer not null default 1,
  sichtbar    boolean not null default true
);
alter table public.mitglied_abschnitte enable row level security;
drop policy if exists "alle lesen" on public.mitglied_abschnitte;
drop policy if exists "redaktion schreibt" on public.mitglied_abschnitte;
create policy "alle lesen" on public.mitglied_abschnitte for select to anon, authenticated using (true);
create policy "redaktion schreibt" on public.mitglied_abschnitte for all to authenticated using (true) with check (true);
grant select on public.mitglied_abschnitte to anon;
grant select, insert, update, delete on public.mitglied_abschnitte to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Über uns
-- ---------------------------------------------------------------------------
update public.ueber_uns set
  hero_titel = 'Mit Rock4Aid wird aus Musik echte Hilfe',
  hero_bild  = '/assets/ueber-uns/buehne.jpg',
  intro_text = $t$<p>Rock4Aid ist ein Benefizfestival aus Heddesheim und ein Fest für alle. Einmal im Jahr verwandeln wir das Gelände rund um die Freizeithalle in einen Treffpunkt für Musikfans aus der ganzen Region. Bei schönem Wetter feiern wir komplett open air.</p>$t$,
  updated_at = now();

delete from public.ueber_uns_abschnitte;
insert into public.ueber_uns_abschnitte (titel, text, reihenfolge, bild_rechts) values
(null, $t$<p>Mit den Spenden aus dem Festival helfen wir Menschen, deren Existenz bedroht ist, durch Hunger, Dürre und fehlendes Wasser. In einer lauten Welt mit ständig neuen Krisen geraten gerade diese Menschen schnell aus dem Blick. Genau deshalb machen wir Musik für sie. Rock4Aid lenkt die Aufmerksamkeit auf Menschen, die unsere Hilfe dringend brauchen.</p>
<p>Auf zwei Bühnen spielen Rockbands in ihrer ganzen Bandbreite, von soft bis hart und vom Cover bis zur Eigenkomposition. An unserer zweiten Bühne, der Campfire-Stage, brennt ein Lagerfeuer und sorgt für eine ganz eigene Atmosphäre.</p>
<p>Über den Tag hinweg ändert sich die Stimmung auf dem Gelände.</p>
<ul>
<li><strong>Tagsüber geht es entspannt zu.</strong> Es läuft lockere Musik, und junge Nachwuchsbands stehen auf derselben Bühne, auf der abends die Haupt-Acts rocken. Auf dem Gelände ist viel Platz zum Chillen und Zuhören. Familien mit Kindern fühlen sich hier genauso wohl wie alle, die einfach einen schönen Nachmittag mit Musik verbringen wollen.</li>
<li><strong>Abends wird Rock4Aid zum richtigen Rockfestival.</strong> Die Musik wird lauter und knackiger, vor der Hauptbühne ist Tanzen und Mitmachen angesagt, und am Lagerfeuer und an der Bar wird gefeiert. Jetzt kommen alle auf ihre Kosten, die mit Freunden mitsingen, abrocken und bis zum letzten Song dabei sein wollen.</li>
</ul>
<p>Für das leibliche Wohl ist den ganzen Tag gesorgt. Es gibt Kaffee, Kuchen und Streetfood. Unsere Bar ist die längste Theke von Heddesheim.</p>
<p>Rock4Aid ist offen für alle, deshalb ist der Eintritt frei. Jeder soll dabei sein können, ganz unabhängig vom Geldbeutel. Wir bitten um Spenden, und jeder entscheidet nach seinen Möglichkeiten, wie viel er geben kann und will. Der gesamte Erlös fließt in konkrete Hilfsprojekte für Menschen in existenzieller Not.</p>$t$, 1, false),

('Vier Freunde haben in drei Monaten aus einer Idee ein Festival gemacht', $t$<p>Am Anfang stand eine Absage. Anfang 2025 plante Thomas Pilz, damals Organisator von Rock@Church in Ladenburg, ein Benefizkonzert und fragte dafür unsere Coverband Indeed an. Kurz darauf musste er absagen, weil die Umsetzung zu aufwendig wurde.</p>
<p>Wir fanden die Idee zu gut, um sie aufzugeben. Im Februar 2025 haben wir beschlossen, das Festival selbst auf die Beine zu stellen, und im Mai 2025 fand es statt. Wir sind die Sache ein bisschen naiv, aber mit riesiger Motivation angegangen. Von Genehmigungen und Versicherungen über Bands und Technik bis zum Helferteam war es deutlich mehr Arbeit als gedacht.</p>
<p>Wir haben es gerockt. Die Premiere hat uns, den Helfern, den Bands und den Gästen riesigen Spaß gemacht. Damit war klar, dass wir weitermachen und das Konzept noch größer aufziehen. Wir haben deshalb den Verein Rock4Aid e.V. gegründet. So arbeiten wir als gemeinnützige Organisation und können Spendenquittungen ausstellen. Mit Rock@Church in Ladenburg, wo alles begann, arbeiten wir heute eng zusammen.</p>
<p>Im Vorstand sind wir vier Freunde aus Heddesheim, Ladenburg und Viernheim. Fast alles entscheiden und stemmen wir gemeinsam, beim Festival hat aber jeder seinen festen Platz.</p>
<ul>
<li><strong>Linus Drop</strong> lebt in Heddesheim und ist Unternehmer im Gesundheitswesen. Bei Rock4Aid verantwortet er die Technik und ist außerdem unser Mädchen für alles.</li>
<li><strong>Tobias „Fender“ Richter</strong> spielt mit Linus seit vielen Jahren in der Coverband Indeed. Fender ist Marketingfachmann aus Viernheim und kümmert sich um die Bands und das Marketing des Festivals.</li>
<li><strong>Marcus Gärtner</strong> ist Bauingenieur aus Ladenburg und kennt Linus noch aus der Schulzeit. Er managt den Eingang und die Security.</li>
<li><strong>Steffen Block</strong> aus Heddesheim ist gelernter Bäcker und arbeitet als Fuhrparkdisponent bei Edeka Südwest. Beim Festival sorgt er an der Getränkeausgabe dafür, dass alle gut versorgt sind.</li>
</ul>
<p>Getragen wird Rock4Aid von vielen. Jedes Jahr helfen uns über 30 Freiwillige. Sie stehen am Eingang, geben Getränke aus und packen überall mit an, wo es gerade brennt. Die wichtigsten Helfer sind aber die Bands. Sie alle spielen ohne Gage und schenken uns ihre Musik für die gute Sache.</p>$t$, 2, true),

('Wir unterstützen Projekte, die wir persönlich kennen und denen wir vertrauen', $t$<p>Wir suchen gezielt Hilfsprojekte für Menschen, die um ihre Existenz kämpfen und dabei kaum Beachtung finden. Den Kontakt zu solchen Projekten finden wir über Menschen, denen wir vertrauen. So wissen wir, dass die Hilfe dort ankommt, wo sie gebraucht wird.</p>
<p>Unsere Spenden gingen bisher zum Beispiel in die humanitäre Hilfe im Sudan und in einen solarbetriebenen Wasserturm in Garango in Burkina Faso, den wir gemeinsam mit dem Garangoverein Ladenburg umsetzen. Was aus den einzelnen Projekten geworden ist, lest ihr in unseren Jahresrückblicken.</p>$t$, 3, false),

('Bands schenken uns ihre Musik und spielen vor einem begeisterten Publikum', $t$<p>Die Bands sind das Herz von Rock4Aid. Sie alle spielen ohne Gage, und ihr Auftritt wirkt gleich doppelt. Sie spielen einen richtigen Festival-Gig und reißen das Publikum mit. Gleichzeitig wird aus ihrer Musik spürbare Hilfe für Menschen, die sie dringend brauchen. Je mehr Gäste eine Band vor die Bühne holt, desto mehr kommt am Ende beim Hilfsprojekt an.</p>
<p>Uns ist wichtig, dass sich Rock4Aid für die Bands wie ein echtes Festival anfühlt. Dafür sorgen wir mit drei Dingen.</p>
<ul>
<li>Die Bands spielen vor einem vollen Haus mit einem Publikum, das ganz bewusst wegen der Live-Musik kommt.</li>
<li>Eine erstklassige PA (Beschallungsanlage) wird von einem sehr erfahrenen Tontechniker gefahren. So klingt jede Band so gut, wie sie ist.</li>
<li>Eine starke Lightshow macht jeden Auftritt zum Erlebnis.</li>
</ul>
<p>Um Technik, Betreuung vor Ort und Verpflegung der Bands kümmern wir uns komplett. Die Musiker können sich ganz auf ihren Auftritt konzentrieren.</p>
<p>Neben der Hauptbühne gibt es die Campfire-Stage. Dort spielen die Bands direkt am Lagerfeuer, ganz nah am Publikum. Bei schönem Wetter findet alles unter freiem Himmel statt, und die Freizeithalle gibt uns bei jedem Wetter Sicherheit.</p>
<p>Rock4Aid ist ein Festival aus der Region für die Region. Bei uns stehen junge Talente neben erfahrenen Musikern und Profis, die sonst von der Musik leben. Der Nachwuchs spielt tagsüber auf der großen Hauptbühne, auf der am Abend die Haupt-Acts rocken. Er bekommt dieselbe PA, dieselbe Lightshow und denselben Tontechniker. So stand zum Beispiel schon das Bandprojekt der Musikschule Ladenburg bei uns auf der großen Bühne.</p>
<p>Rock4Aid gibt es auch über das eigene Festival hinaus. Beim Seewandel in Heddesheim betreiben wir eine eigene Rock4Aid-Bühne. Auch dort spielen Bands für die gute Sache und machen Rock4Aid in der Region bekannt.</p>
<p>Ihr spielt Rock, ob eigene Songs oder Cover, und wollt mit eurer Musik etwas bewegen? Dann meldet euch bei uns.<br><a href="mailto:rock4aid2025@gmail.com">rock4aid2025@gmail.com</a></p>$t$, 4, false),

('Mit Sponsoren wirkt jede Spende noch stärker', $t$<p>Damit die Spenden unserer Gäste vollständig bei den Hilfsprojekten ankommen, brauchen wir Partner an unserer Seite. Sponsoren übernehmen die Kosten für Bühne, Technik und Organisation. Jeder Euro, den sie beitragen, macht das Festival möglich und entlastet zugleich die Spendenkasse. Ihr Engagement wirkt also doppelt.</p>
<p>Dafür bieten wir Sichtbarkeit bei einem bunt gemischten Publikum aus der gesamten Rhein-Neckar-Region. Zu uns kommen Familien mit Kindern genauso wie langjährige Rockfans und Gäste von weiter her. Über Rock4Aid berichten die Zeitungen der Region, und die Gemeinde Heddesheim unterstützt das Festival.</p>
<p>Wie sichtbar ein Sponsor sein möchte, entscheidet er selbst. Wir bieten dafür mehrere Pakete an.</p>
<ul>
<li>Der <strong>Presenting Partner</strong> ist exklusiver Hauptpartner des Festivals. Er ist unter anderem auf Plakaten, am Eingang, an der Hauptbühne und in unseren Pressemitteilungen präsent und wird auf der Bühne begrüßt.</li>
<li><strong>Stage Partner</strong> sind mit Bannern an der Hauptbühne und auf dem Gelände vertreten, stehen auf den Plakaten und werden vor einem Auftritt angesagt.</li>
<li>Der <strong>Campfire Stage Partner</strong> übernimmt exklusiv die Patenschaft für unsere Lagerfeuer-Bühne.</li>
<li><strong>Support Partner</strong> unterstützen das Festival und erscheinen auf unserer Website, der Sponsorenwand und in den sozialen Medien.</li>
</ul>
<p>Unternehmen und Privatpersonen können Rock4Aid auch mit einer Spende unterstützen. Als gemeinnütziger Verein stellen wir dafür eine Zuwendungsbestätigung aus. Wofür die Spendengelder verwendet werden, machen wir transparent und öffentlich.</p>
<p>Ihr wollt Rock4Aid als Sponsor oder mit einer Spende unterstützen? Dann sprecht uns an, wir finden gemeinsam die passende Form.<br><a href="mailto:rock4aid2025@gmail.com">rock4aid2025@gmail.com</a></p>$t$, 5, true),

('Die nächste Ausgabe ist in Planung, und wir freuen uns auf euch', $t$<p>Rock4Aid ist gekommen, um zu bleiben. Wir arbeiten schon an der nächsten Ausgabe und haben viele neue Ideen im Gepäck.</p>
<p>Ihr wollt spielen, sponsern oder mithelfen? Dann schreibt uns.<br><a href="mailto:rock4aid2025@gmail.com">rock4aid2025@gmail.com</a></p>$t$, 6, false);

-- ---------------------------------------------------------------------------
-- Mitglied werden
-- ---------------------------------------------------------------------------
update public.mitglied set
  hero_titel = 'Werdet Mitglied und unterstützt Rock4Aid dauerhaft',
  intro_text = $t$<p>Hinter Rock4Aid stehen viele Menschen, die unsere Idee teilen. Als Fördermitglied gehört ihr fest dazu. Ihr tretet unserem Verein Rock4Aid e.V. bei und unterstützt uns jedes Jahr mit einem Förderbeitrag, dessen Höhe ihr selbst festlegt. So helft ihr Jahr für Jahr Menschen in existenzieller Not.</p>$t$,
  leistungen_titel = null,
  leistungen_text = null,
  danke_text = $t$<p>Vielen Dank, dass ihr Rock4Aid als Fördermitglied unterstützen wollt! Wir haben euren Antrag erhalten, melden uns in Kürze bei euch und heißen euch dann im Verein willkommen.</p>$t$,
  updated_at = now();

delete from public.mitglied_abschnitte;
insert into public.mitglied_abschnitte (titel, text, reihenfolge) values
('Euer Beitrag sorgt dafür, dass mehr Geld bei den Hilfsprojekten ankommt', $t$<p>Ein Festival kostet Geld, lange bevor der erste Gast kommt. Bühne, Genehmigungen, Versicherungen und Werbung müssen wir schon Monate vorher planen und bezahlen. Mit den Förderbeiträgen können wir diese Kosten verlässlich decken.</p>
<p>Das hat eine direkte Wirkung. Je mehr Kosten unsere Fördermitglieder tragen, desto mehr von den Spenden unserer Gäste fließt in die Hilfsprojekte für Menschen in existenzieller Not. Außerdem gibt uns ein fester Kreis von Förderern Planungssicherheit. So können wir das Festival Jahr für Jahr weiterentwickeln und noch mehr Menschen erreichen.</p>$t$, 1),

('Eure Mitgliedschaft ist eine finanzielle Unterstützung, alles Weitere ist freiwillig', $t$<p>Die Höhe eures Förderbeitrags legt ihr selbst fest, ganz nach euren Möglichkeiten. Jeder Beitrag hilft und macht einen Unterschied. Mehr braucht es für eine Mitgliedschaft nicht.</p>
<p>Beim Festival seid ihr natürlich wie alle anderen herzlich eingeladen, mitzufeiern und die Musik zu genießen. Wer darüber hinaus Lust hat, einmal im Helferteam dabei zu sein, kann sich jederzeit bei uns melden.</p>$t$, 2),

('So werdet ihr Fördermitglied', $t$<p>Der Beitritt ist ganz einfach. Füllt den Antrag unten auf dieser Seite aus oder schreibt uns eine E-Mail. Wir melden uns dann bei euch und heißen euch im Verein willkommen.</p>
<p>Ihr wollt Fördermitglied werden oder habt noch Fragen? Dann schreibt uns.<br><a href="mailto:rock4aid2025@gmail.com">rock4aid2025@gmail.com</a></p>$t$, 3);

-- Gründerfoto zum Abschnitt über die vier Gründer
update public.ueber_uns_abschnitte
   set bild = '/assets/ueber-uns/gruender.jpg'
 where titel like 'Vier Freunde%';

commit;

select 'ueber_uns_abschnitte' as tabelle, count(*) from public.ueber_uns_abschnitte
union all select 'mitglied_abschnitte', count(*) from public.mitglied_abschnitte;
