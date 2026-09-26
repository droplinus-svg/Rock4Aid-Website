-- 14: Vorstand auf "Über uns" als Fließtext statt als Liste
-- Voraussetzung: 13 ist gelaufen. Kann mehrfach ausgeführt werden.
begin;

update public.ueber_uns_abschnitte
   set text = $t$<p>Am Anfang stand eine Absage. Anfang 2025 plante Thomas Pilz, damals Organisator von Rock@Church in Ladenburg, ein Benefizkonzert und fragte dafür unsere Coverband Indeed an. Kurz darauf musste er absagen, weil die Umsetzung zu aufwendig wurde.</p>
<p>Wir fanden die Idee zu gut, um sie aufzugeben. Im Februar 2025 haben wir beschlossen, das Festival selbst auf die Beine zu stellen, und im Mai 2025 fand es statt. Wir sind die Sache ein bisschen naiv, aber mit riesiger Motivation angegangen. Von Genehmigungen und Versicherungen über Bands und Technik bis zum Helferteam war es deutlich mehr Arbeit als gedacht.</p>
<p>Wir haben es gerockt. Die Premiere hat uns, den Helfern, den Bands und den Gästen riesigen Spaß gemacht. Damit war klar, dass wir weitermachen und das Konzept noch größer aufziehen. Wir haben deshalb den Verein Rock4Aid e.V. gegründet. So arbeiten wir als gemeinnützige Organisation und können Spendenquittungen ausstellen. Mit Rock@Church in Ladenburg, wo alles begann, arbeiten wir heute eng zusammen.</p>
<p>Im Vorstand sind wir vier Freunde aus Heddesheim, Ladenburg und Viernheim. Fast alles entscheiden und stemmen wir gemeinsam, beim Festival hat aber jeder seinen festen Platz. <strong>Linus Drop</strong> lebt in Heddesheim und ist Unternehmer im Gesundheitswesen. Bei Rock4Aid verantwortet er die Technik und ist außerdem unser Mädchen für alles. Mit ihm spielt <strong>Tobias „Fender“ Richter</strong> seit vielen Jahren in der Coverband Indeed. Fender ist Marketingfachmann aus Viernheim und kümmert sich um die Bands und das Marketing des Festivals. <strong>Marcus Gärtner</strong> ist Bauingenieur aus Ladenburg und kennt Linus noch aus der Schulzeit. Er managt den Eingang und die Security. <strong>Steffen Block</strong> aus Heddesheim ist gelernter Bäcker und arbeitet als Fuhrparkdisponent bei Edeka Südwest. Beim Festival sorgt er an der Getränkeausgabe dafür, dass alle gut versorgt sind.</p>
<p>Getragen wird Rock4Aid von vielen. Jedes Jahr helfen uns über 30 Freiwillige. Sie stehen am Eingang, geben Getränke aus und packen überall mit an, wo es gerade brennt. Die wichtigsten Helfer sind aber die Bands. Sie alle spielen ohne Gage und schenken uns ihre Musik für die gute Sache.</p>$t$,
       bild_nach_absatz = 3   -- Gründerfoto direkt vor "Im Vorstand sind wir vier Freunde ..."
 where titel like 'Vier Freunde%';

commit;

select titel, bild_nach_absatz, position('<ul>' in text) = 0 as ohne_liste
  from public.ueber_uns_abschnitte where titel like 'Vier Freunde%';
