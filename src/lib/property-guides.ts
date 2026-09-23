import type { Localized } from './types';
const L = (fr:string,en:string,ar:string):Localized=>({fr,en,ar});
export interface PropertyGuide {
  slug:string; published:string; updated:string; title:Localized; summary:Localized;
  sections:{title:Localized; body:Localized; source?:string}[];
  questions:{question:Localized;answer:Localized}[];
  sources:{title:string;url:string}[];
}
export const propertyGuides:PropertyGuide[] = [
{
  "slug": "prix-metre-carre-comparer-surfaces-tunisie",
  "published": "2026-09-22",
  "updated": "2026-09-22",
  "title": {
    "fr": "Prix au mètre carré en Tunisie : comparer sans mélanger les surfaces",
    "en": "Price per square metre in Tunisia: compare like-for-like areas",
    "ar": "سعر المتر المربع في تونس: قارن دون خلط المساحات"
  },
  "summary": {
    "fr": "Divisez un prix clairement défini par une surface documentée de même nature pour chaque logement. Voici une méthode de comparaison avec des calculs fictifs, sans moyenne de marché ni estimation d’un appartement réel.",
    "en": "Divide a clearly defined price by a documented, equivalent area for each home. This guide uses fictional calculations, not market averages or valuations of actual apartments.",
    "ar": "اقسم ثمناً محدداً بوضوح على مساحة موثقة من النوع نفسه لكل مسكن. يقدم هذا الدليل طريقة للمقارنة بأمثلة حسابية افتراضية، وليس متوسطات للسوق أو تقييماً لشقة حقيقية."
  },
  "sections": [
    {
      "title": {
        "fr": "Fixer le périmètre avant de calculer",
        "en": "Define what you are comparing",
        "ar": "حدد نطاق المقارنة قبل الحساب"
      },
      "body": {
        "fr": "Le calcul est simple : prix retenu en dinars ÷ surface retenue en m². Sa pertinence dépend des données. Notez la référence du lot, la date du prix, les éléments inclus et la définition de la surface. Dans le comparateur IMF, il s’agit de la surface vendable renseignée ; jardin et terrasse sont affichés séparément lorsqu’ils sont connus. Demandez le détail du calcul de cette surface, notamment le traitement des parties communes. Ne comparez pas automatiquement une surface vendable avec une surface intérieure. Si le prix ou la surface n’est pas documenté, laissez le ratio en attente.",
        "en": "The calculation is simple: the selected price in dinars divided by the selected area in m². Its usefulness depends on the inputs. Record the apartment reference, quotation date, included items and area definition. The IMF comparison shows the recorded saleable area; known garden and terrace areas appear separately. Ask how that area was calculated, including the treatment of common parts. Do not automatically compare saleable area with internal area. If the price or area is undocumented, leave the ratio unresolved.",
        "ar": "الحساب بسيط: الثمن المعتمد بالدينار ÷ المساحة المعتمدة بالمتر المربع. لكن فائدة النتيجة تتوقف على المعطيات. سجل مرجع الشقة وتاريخ العرض والعناصر المشمولة وتعريف المساحة. يعرض مقارن IMF مساحة البيع المدونة، مع فصل الحديقة والشرفة عند توفر بياناتهما. اطلب تفاصيل حساب المساحة، بما في ذلك الأجزاء المشتركة. لا تقارن تلقائياً مساحة البيع بالمساحة الداخلية. إذا لم يكن الثمن أو المساحة موثقاً، اترك النسبة دون حساب."
      }
    },
    {
      "title": {
        "fr": "Exemple fictif : deux ratios, deux budgets",
        "en": "Fictional example: two ratios, two budgets",
        "ar": "مثال افتراضي: نسبتان وميزانيتان"
      },
      "body": {
        "fr": "Exemple entièrement fictif, sans lien avec les prix IMF ou le marché tunisien : l’appartement A coûte 240 000 TND pour 100 m² de surface vendable, soit 2 400 TND/m². L’appartement B coûte 252 000 TND pour 105 m², soit également 2 400 TND/m², à périmètre identique. Leur ratio est égal, mais B demande 12 000 TND supplémentaires pour le prix présenté. Si la même offre A est divisée par 80 m² de surface intérieure, le résultat devient 3 000 TND/m². Le logement et son prix n’ont pas changé : seul le dénominateur a changé. Ces chiffres ne sont ni une moyenne locale, ni une offre commerciale.",
        "en": "Entirely fictional example, unrelated to IMF prices or the Tunisian market: apartment A costs 240,000 TND for 100 m² of saleable area, or 2,400 TND/m². Apartment B costs 252,000 TND for 105 m², also 2,400 TND/m², on the same basis. Their ratios match, but B requires an extra 12,000 TND for the quoted price. Dividing A’s same price by 80 m² of internal area instead gives 3,000 TND/m². Neither the home nor its price changed: only the denominator did. These figures are neither local averages nor commercial offers.",
        "ar": "مثال افتراضي بالكامل، لا يرتبط بأسعار IMF أو السوق التونسية: ثمن الشقة أ هو 240000 دينار لمساحة بيع قدرها 100 م²، أي 2400 دينار/م². وثمن الشقة ب هو 252000 دينار لمساحة 105 م²، أي أيضاً 2400 دينار/م²، وفق النطاق نفسه. النسبتان متساويتان، لكن الثمن المعروض للشقة ب يتطلب 12000 دينار إضافية. إذا قسمنا ثمن الشقة أ نفسه على مساحة داخلية قدرها 80 م²، تصبح النتيجة 3000 دينار/م². لم تتغير الشقة ولا ثمنها؛ تغير المقام فقط. هذه الأرقام ليست متوسطات محلية ولا عروضاً تجارية."
      }
    },
    {
      "title": {
        "fr": "Isoler parking, terrasse et autres éléments",
        "en": "Separate parking, terraces and other items",
        "ar": "افصل الموقف والشرفة والعناصر الأخرى"
      },
      "body": {
        "fr": "Demandez une ventilation écrite des éléments de l’offre. Autre exemple fictif : un ensemble annoncé à 260 000 TND comprend un appartement de 100 m² et un parking chiffré séparément à 20 000 TND. Si le vendeur confirme cette ventilation, le prix attribué à l’appartement est 240 000 TND, soit 2 400 TND/m² ; l’ensemble représente 2 600 TND par m² d’appartement. Les deux calculs décrivent des périmètres différents. Sans ventilation confirmée, ne déduisez pas un montant supposé pour le parking. N’ajoutez pas non plus jardin et terrasse au dénominateur sans convention explicitée : gardez leurs surfaces et leur traitement dans le prix sur des lignes séparées.",
        "en": "Ask for a written breakdown of the offer. Another fictional example: a 260,000 TND package includes a 100 m² apartment and parking separately priced at 20,000 TND. If the seller confirms that breakdown, the apartment portion is 240,000 TND, or 2,400 TND/m²; the package represents 2,600 TND per square metre of apartment area. These calculations cover different items. Without a confirmed breakdown, do not subtract an assumed parking value. Do not add garden and terrace areas to the denominator without an explicit convention either: keep their areas and treatment in the price on separate lines.",
        "ar": "اطلب تفصيلاً مكتوباً لعناصر العرض. مثال افتراضي آخر: عرض بقيمة 260000 دينار يشمل شقة بمساحة 100 م² وموقفاً محدد الثمن بشكل منفصل بقيمة 20000 دينار. إذا أكد البائع هذا التفصيل، تكون حصة الشقة 240000 دينار، أي 2400 دينار/م²، بينما يمثل العرض الكامل 2600 دينار لكل متر مربع من مساحة الشقة. الحسابان يغطيان عناصر مختلفة. دون تفصيل مؤكد، لا تخصم قيمة مفترضة للموقف. ولا تضف الحديقة والشرفة إلى المقام دون طريقة حساب واضحة؛ سجل مساحاتهما ومعالجتهما في الثمن على أسطر منفصلة."
      }
    },
    {
      "title": {
        "fr": "Distinguer indice de marché et prix d’un logement",
        "en": "Distinguish a market index from a home’s price",
        "ar": "ميز بين مؤشر السوق وثمن المسكن"
      },
      "source": "https://www.ins.tn/methode/fiche-technique-de-lindice-des-prix-de-limmobilier-ipim-0",
      "body": {
        "fr": "La fiche méthodologique de l’INS décrit l’IPIM comme un indice trimestriel de l’évolution des prix de transactions immobilières, calculé à partir de données administratives. Source consultée le 22 septembre 2026. Un indice d’évolution n’est pas un devis au mètre carré pour votre appartement : c’est une distinction de lecture, pas une estimation IMF. Ce guide ne présente aucun niveau de prix actuel par quartier.",
        "en": "The INS methodology describes IPIM as a quarterly index tracking property transaction prices using administrative data. Source checked on 22 September 2026. A price-change index is not a per-square-metre quotation for your apartment: this is an interpretive distinction, not an IMF valuation. This guide provides no current neighbourhood price levels.",
        "ar": "تصف المنهجية الرسمية للمعهد الوطني للإحصاء مؤشر أسعار العقارات بأنه مؤشر فصلي لتطور أسعار المعاملات العقارية يعتمد على بيانات إدارية. تمت مراجعة المصدر في 22 سبتمبر 2026. مؤشر التطور ليس عرض سعر للمتر المربع لشقتك؛ هذا توضيح لطريقة القراءة وليس تقييماً من IMF. لا يقدم هذا الدليل أسعاراً حالية حسب الأحياء."
      }
    },
    {
      "title": {
        "fr": "Conserver une fiche de comparaison exploitable",
        "en": "Keep a comparison you can act on",
        "ar": "احتفظ ببطاقة مقارنة واضحة"
      },
      "body": {
        "fr": "Pour chaque bien, conservez le prix daté, la surface utilisée et sa définition, le calcul du ratio, les annexes incluses et les points à confirmer. Comparez ensuite l’étage, l’orientation documentée, les prestations, l’état d’avancement et la localisation réelle. Le ratio le plus bas ne suffit pas à choisir. Gardez aussi le prix total et les autres dépenses identifiées sur devis dans votre tableau de budget, sans les confondre avec le prix du seul appartement. Utilisez les favoris et la comparaison IMF pour préparer vos questions, puis faites confirmer les montants et les surfaces avant de décider.",
        "en": "For each property, keep the dated price, chosen area and definition, ratio calculation, included annexes and unresolved questions. Then compare floor, documented orientation, specifications, construction progress and actual location. The lowest ratio alone is not enough to choose. Keep the total price and any other separately quoted expenses in your budget table without confusing them with the apartment-only price. Use IMF favourites and comparison to prepare questions, then have amounts and areas confirmed before deciding.",
        "ar": "احتفظ لكل عقار بالثمن المؤرخ والمساحة المعتمدة وتعريفها وحساب النسبة والملحقات المشمولة والنقاط التي تحتاج إلى تأكيد. ثم قارن الطابق والتوجيه الموثق والتجهيزات وتقدم الأشغال والموقع الفعلي. لا تكفي أدنى نسبة وحدها للاختيار. سجل أيضاً الثمن الإجمالي والمصاريف الأخرى المحددة بعروض مكتوبة في جدول الميزانية، دون خلطها بثمن الشقة وحدها. استعمل المفضلة والمقارنة في IMF لإعداد أسئلتك، ثم اطلب تأكيد المبالغ والمساحات قبل القرار."
      }
    }
  ],
  "questions": [
    {
      "question": {
        "fr": "Quelle formule utiliser pour le prix au mètre carré ?",
        "en": "How do I calculate price per square metre?",
        "ar": "كيف أحسب سعر المتر المربع؟"
      },
      "answer": {
        "fr": "Divisez le prix retenu par la surface documentée, en précisant ce que chacun comprend. Utilisez la même définition pour tous les biens comparés.",
        "en": "Divide the selected price by the documented area, stating what each includes. Use the same definition for every property compared.",
        "ar": "اقسم الثمن المعتمد على المساحة الموثقة، مع توضيح ما يشمله كل منهما. استخدم التعريف نفسه لكل العقارات المقارنة."
      }
    },
    {
      "question": {
        "fr": "Les montants de ce guide sont-ils les prix des appartements IMF ?",
        "en": "Are the amounts in this guide IMF apartment prices?",
        "ar": "هل مبالغ هذا الدليل هي أسعار شقق IMF؟"
      },
      "answer": {
        "fr": "Non. Tous les montants des exemples sont fictifs et servent uniquement à expliquer le calcul. Consultez la fiche du logement et demandez un prix daté au service commercial.",
        "en": "No. All example amounts are fictional and only explain the calculation. Consult the listing and request a dated quotation from the sales team.",
        "ar": "لا. كل مبالغ الأمثلة افتراضية لتوضيح الحساب فقط. راجع بطاقة المسكن واطلب عرضاً مؤرخاً من الفريق التجاري."
      }
    },
    {
      "question": {
        "fr": "Puis-je additionner jardin, terrasse et surface vendable ?",
        "en": "Can I add garden, terrace and saleable areas together?",
        "ar": "هل يمكن جمع مساحة الحديقة والشرفة ومساحة البيع؟"
      },
      "answer": {
        "fr": "Pas automatiquement pour comparer les prix. Demandez la définition et la méthode utilisées, puis gardez les extérieurs séparés tant que le périmètre n’est pas confirmé.",
        "en": "Not automatically for a price comparison. Ask for the definitions and calculation method, and keep outdoor areas separate until the basis is confirmed.",
        "ar": "ليس تلقائياً عند مقارنة الأسعار. اطلب التعريفات وطريقة الحساب، وافصل المساحات الخارجية إلى أن يتم تأكيد نطاق المقارنة."
      }
    }
  ],
  "sources": [
    {
      "title": "INS — Fiche technique IPIM (consultée le 22 septembre 2026)",
      "url": "https://www.ins.tn/methode/fiche-technique-de-lindice-des-prix-de-limmobilier-ipim-0"
    },
    {
      "title": "IMF — Comparer les plans et les surfaces",
      "url": "/fr/guides/comparer-plans-surfaces-appartements-tunisie"
    }
  ]
},
  {
    slug:'comparer-plans-surfaces-appartements-tunisie',published:'2026-09-20',updated:'2026-09-20',
    title:L('Comment comparer les plans et surfaces de deux appartements en Tunisie ?','How to compare apartment plans and areas in Tunisia','كيف تقارن مخططات ومساحات شقتين في تونس؟'),
    summary:L('Commencez par comparer la même définition de surface, puis vérifiez la circulation, les ouvertures et les espaces extérieurs sur le plan de chaque lot. Le nombre de mètres carrés ne suffit pas à décrire le confort quotidien.','Compare like-for-like area definitions, then check circulation, openings and outdoor spaces on each apartment plan. Square metres alone do not describe everyday comfort.','ابدأ بمقارنة نفس تعريف المساحة، ثم تحقق من الحركة داخل الشقة والفتحات والمساحات الخارجية في مخطط كل شقة. عدد الأمتار المربعة وحده لا يصف الراحة اليومية.'),
    sections:[
      {title:L('Comparer des surfaces comparables','Compare equivalent areas','قارن مساحات من نفس النوع'),body:L('Les fiches IMF distinguent la surface hors œuvre, la surface vendable et, lorsqu’ils sont renseignés, le jardin et la terrasse. Demandez la méthode de calcul et le détail des parties communes incluses avant de comparer deux prix au mètre carré. Une terrasse ne devient pas une pièce habitable : vérifiez comment elle figure dans le prix et les documents. Le comparateur du site affiche la surface vendable et conserve les extérieurs dans des lignes distinctes.','IMF listings distinguish gross area, saleable area and, when recorded, garden and terrace areas. Ask how each area is calculated and which common areas are included before comparing price per square metre. A terrace is not an indoor room: check its treatment in the price and documents. The website comparison uses saleable area and lists outdoor areas separately.','تميز بطاقات IMF بين المساحة خارج الجدران والمساحة القابلة للبيع ومساحة الحديقة والشرفة عند توفرها. اطلب طريقة الحساب ونصيب الأجزاء المشتركة قبل مقارنة سعر المتر المربع. الشرفة ليست غرفة داخلية؛ تحقق من احتسابها في الثمن والوثائق. تعرض المقارنة مساحة البيع وتفصل المساحات الخارجية في أسطر مستقلة.')},
      {title:L('Lire la distribution avant de choisir le mobilier','Read the layout before choosing furniture','اقرأ التوزيع قبل اختيار الأثاث'),body:L('Repérez l’entrée, le séjour, la cuisine, les chambres et les salles d’eau. Suivez le trajet entre ces pièces : un couloir long, une porte qui gêne un placard ou une table qui bloque un passage peuvent changer votre usage. Pour chaque meuble important, reportez ses dimensions sur un plan coté. S+2 désigne dans notre catalogue un séjour et deux chambres ; cela ne précise ni le nombre de salles d’eau ni la présence d’une suite. Vérifiez ces éléments sur la fiche et le plan.','Locate the entrance, living room, kitchen, bedrooms and bathrooms. Trace the routes between them: a long corridor, a door obstructing a cupboard or a table blocking a passage can affect everyday use. Check important furniture against a dimensioned plan. S+2 in our catalogue means a living room and two bedrooms; it does not specify the number of bathrooms or the presence of a suite. Check those details in the listing and plan.','حدد المدخل وغرفة الجلوس والمطبخ وغرف النوم والحمامات. تتبع الحركة بينها: ممر طويل أو باب يعيق خزانة أو طاولة تعطل المرور قد يغير الاستعمال. تحقق من أبعاد الأثاث على مخطط مقاس. تعني S+2 في كتالوجنا غرفة جلوس وغرفتي نوم، ولا تحدد عدد الحمامات أو وجود جناح. راجع البطاقة والمخطط لهذه التفاصيل.')},
      {title:L('Vérifier les ouvertures et les extérieurs','Check openings and outdoor spaces','تحقق من الفتحات والمساحات الخارجية'),body:L('Utilisez la flèche du nord et les fenêtres du plan pour préparer vos questions sur la lumière, le vis-à-vis et l’aération. Lors d’une visite, observez aussi les bâtiments voisins et le bruit. Une zone dessinée à proximité du lot n’est pas nécessairement accessible ou privative. Par exemple, le plan D52 de La Gloire comporte une zone marquée « terrasse inaccessible » : ne la confondez pas avec un espace utilisable. Faites confirmer les droits d’usage dans les documents de vente.','Use the north arrow and windows to prepare questions about daylight, overlooking and ventilation. During a visit, also observe neighbouring buildings and noise. An area drawn beside an apartment is not necessarily accessible or private. For example, the La Gloire D52 plan labels an area as an inaccessible terrace: do not treat it as usable space. Confirm usage rights in the sale documents.','استعمل سهم الشمال والنوافذ لإعداد أسئلة حول الضوء والتهوئة والإطلالة على الجيران. لاحظ المباني المحيطة والضجيج أثناء الزيارة. ليست كل مساحة مرسومة قرب الشقة متاحة أو خاصة. مثلاً يذكر مخطط D52 في لاغلوار منطقة شرفة غير متاحة؛ لا تعتبرها مساحة للاستعمال. تأكد من حقوق الاستعمال في وثائق البيع.')},
      {title:L('Utiliser les vues 3D comme aide à la lecture','Use 3D views to help understand the plan','استعمل المشاهد ثلاثية الأبعاد لفهم المخطط'),body:L('Une image d’ambiance vous aide à imaginer les finitions et le mobilier. Un panorama vous permet de regarder autour d’un point de vue. Aucun des deux ne remplace les cotes du plan ou les caractéristiques contractuelles. Pour comparer efficacement, enregistrez trois appartements, ouvrez leurs plans, puis notez une question précise pour chaque différence avant de demander une visite.','Interior illustrations help you imagine finishes and furniture. A panorama lets you look around from one viewpoint. Neither replaces the dimensioned plan or contractual specifications. Save three apartments, open their plans and note one specific question for each difference before requesting a visit.','تساعد صور الأجواء على تصور التشطيبات والأثاث، وتمكنك البانوراما من النظر حول نقطة محددة. لا يعوض أي منهما أبعاد المخطط أو المواصفات التعاقدية. احفظ ثلاث شقق وافتح مخططاتها ودون سؤالاً محدداً لكل اختلاف قبل طلب الزيارة.')},
    ],
    questions:[{question:L('Quelle surface utilise le comparateur IMF ?','Which area does the IMF comparison use?','أي مساحة تعتمدها مقارنة IMF؟'),answer:L('La surface vendable renseignée dans la fiche. Les surfaces de jardin et de terrasse sont affichées séparément lorsqu’elles sont connues.','The saleable area recorded in the listing. Known garden and terrace areas are shown separately.','مساحة البيع المدونة في البطاقة. وتُعرض مساحة الحديقة والشرفة بشكل منفصل عند توفرها.')},{question:L('Une image 3D garantit-elle les dimensions ?','Does a 3D image guarantee dimensions?','هل تضمن الصورة ثلاثية الأبعاد المقاسات؟'),answer:L('Non. Pour vérifier les dimensions et les prestations, consultez le plan coté et les documents contractuels correspondant au lot.','No. Check dimensions and specifications against the dimensioned plan and the contract documents for the apartment.','لا. للتحقق من المقاسات والمواصفات راجع المخطط المقاس والوثائق التعاقدية الخاصة بالشقة.')}],
    sources:[{title:'IMF — Plans de vente Résidence La Gloire',url:'/fr/projets/residence-la-gloire#plans'}],
  },
  {
    slug:'preparer-visite-appartement-neuf',published:'2026-09-20',updated:'2026-09-20',
    title:L('Visiter un appartement neuf : la checklist pratique','Visiting a new apartment: a practical checklist','زيارة شقة جديدة: قائمة عملية للتحقق'),
    summary:L('Préparez le plan, les dimensions de vos meubles et une liste de questions. Pendant la visite, vérifiez les pièces, les accès et les prestations ; après, demandez une réponse écrite sur les points qui restent ouverts.','Prepare the plan, your furniture dimensions and a list of questions. Check rooms, access and specifications during the visit, then ask for written answers on outstanding points.','جهز المخطط وأبعاد الأثاث وقائمة الأسئلة. تحقق أثناء الزيارة من الغرف والمداخل والتجهيزات ثم اطلب إجابات مكتوبة عن النقاط غير المحسومة.'),
    sections:[
      {title:L('Avant le rendez-vous','Before the appointment','قبل الموعد'),body:L('Confirmez la résidence, le bloc, l’étage et la référence du lot. Précisez si vous souhaitez visiter un logement terminé, un appartement témoin ou un chantier. En cas de chantier, demandez les conditions d’accès et suivez les consignes de l’accompagnateur. Téléchargez ou ouvrez le plan, notez les dimensions du lit, du canapé et de la table que vous voulez conserver. Vérifiez également le temps de trajet aux heures où vous vous déplacerez réellement.','Confirm the residence, block, floor and apartment reference. Specify whether you want to see a completed home, show apartment or construction site. For a site visit, ask about access requirements and follow your host’s instructions. Open the plan and note the dimensions of furniture you want to keep. Also check travel times at the hours you actually commute.','أكد الإقامة والكتلة والطابق ومرجع الشقة. حدد هل تريد زيارة مسكن مكتمل أو شقة نموذجية أو ورشة. عند زيارة الورشة اسأل عن شروط الدخول واتبع تعليمات المرافق. افتح المخطط ودون أبعاد الأثاث الذي تريد الاحتفاظ به وتحقق من وقت التنقل في أوقات استعمالك الفعلية.')},
      {title:L('Dans le logement','Inside the apartment','داخل الشقة'),body:L('Observez la lumière, les vues depuis les fenêtres et la circulation entre les pièces. Vérifiez les emplacements prévus pour les appareils de cuisine, les prises et les rangements. Demandez quelles finitions sont comprises et lesquelles relèvent de la décoration de présentation. Si le logement est terminé et que l’accompagnateur l’autorise, vérifiez l’ouverture des portes et fenêtres. Consignez les points à vérifier dans une liste avec photos autorisées. Une visite commerciale ne remplace pas un contrôle technique professionnel.','Observe daylight, window views and circulation. Check planned positions for kitchen appliances, sockets and storage. Ask which finishes are included and which belong only to the display furniture. In a completed apartment, check doors and windows with your host’s permission. Record outstanding questions with permitted photos. A sales visit does not replace a professional technical inspection.','لاحظ الضوء والمنظر من النوافذ والحركة بين الغرف. تحقق من مواقع أجهزة المطبخ والمقابس والتخزين. اسأل عن التشطيبات المشمولة وما يخص ديكور العرض فقط. في المسكن المكتمل وبعد إذن المرافق تحقق من فتح الأبواب والنوافذ. دون الملاحظات مع صور مسموح بها. الزيارة التجارية لا تعوض فحصاً فنياً مختصاً.')},
      {title:L('Dans la résidence','Around the residence','داخل الإقامة'),body:L('Parcourez l’entrée, l’escalier, l’ascenseur lorsqu’il est en service et le chemin vers le stationnement. Faites préciser si une place de parking ou un cellier est inclus, vendu séparément ou absent de l’offre. Demandez quelles parties sont communes, comment leur entretien est prévu et quels documents décrivent les charges. Pour un programme en cours, demandez un point daté sur les travaux et la livraison, plutôt que de déduire un délai d’une photographie.','Walk through the entrance, stairs, operating lift and route to parking. Clarify whether a parking space or storage unit is included, sold separately or not offered. Ask which areas are shared and how maintenance and charges are documented. For a development under construction, request a dated update on progress and delivery instead of inferring a completion date from a photograph.','مر بالمدخل والسلالم والمصعد إذا كان يعمل والطريق نحو الموقف. تحقق إن كان موقف السيارة أو المخزن مشمولاً أو يباع منفصلاً أو غير متوفر. اسأل عن الأجزاء المشتركة والصيانة والوثائق التي تحدد المصاريف. للمشروع الجاري اطلب بياناً مؤرخاً حول تقدم الأشغال والتسليم بدل استنتاج الموعد من صورة.')},
      {title:L('Après la visite','After the visit','بعد الزيارة'),body:L('Comparez vos notes avec celles d’un second appartement à surface et budget proches. Demandez une fiche récapitulative du prix, des prestations, des annexes et des modalités proposées. Dans IMF, « demander une visite » transmet vos coordonnées et votre créneau préféré au service commercial : le rendez-vous devient confirmé uniquement après le retour de l’équipe. Une demande de visite ne réserve pas l’appartement.','Compare your notes with another apartment of similar area and budget. Request a written summary of price, specifications, annexes and proposed terms. On IMF, a visit request sends your details and preferred time to the sales team; the appointment is confirmed only after they respond. A visit request does not reserve an apartment.','قارن ملاحظاتك بشقة ثانية ذات مساحة وميزانية قريبتين. اطلب ملخصاً مكتوباً للسعر والمواصفات والملحقات والشروط المقترحة. يرسل طلب الزيارة عبر IMF بياناتك والموعد المرغوب للفريق التجاري ولا يتأكد الموعد إلا بعد رده. طلب الزيارة لا يحجز الشقة.')},
    ],
    questions:[{question:L('Puis-je demander une visite depuis l’étranger ?','Can I request a visit from abroad?','هل يمكن طلب زيارة من الخارج؟'),answer:L('Oui. Choisissez « Visioconférence » et indiquez un créneau à l’heure de Tunis. L’équipe confirmera la possibilité et le rendez-vous.','Yes. Choose “Video call” and a preferred time in Tunis time. The team will confirm feasibility and the appointment.','نعم. اختر مكالمة فيديو وحدد الوقت بتوقيت تونس. يؤكد الفريق إمكانية الزيارة والموعد.')},{question:L('Le créneau choisi est-il garanti ?','Is my chosen time guaranteed?','هل الوقت المختار مضمون؟'),answer:L('Non. Il s’agit d’une préférence transmise à l’équipe commerciale, qui vous contactera pour confirmer ou proposer une autre heure.','No. Your preference is sent to the sales team, who will contact you to confirm or suggest another time.','لا. يُرسل الوقت المرغوب للفريق التجاري الذي سيتصل بك لتأكيده أو اقتراح وقت آخر.')}],sources:[],
  },
  {
    slug:'acheter-en-tunisie-depuis-etranger',published:'2026-09-20',updated:'2026-09-20',
    title:L('Tunisiens à l’étranger : préparer son achat immobilier en Tunisie','Tunisians abroad: preparing a property purchase in Tunisia','التونسيون بالخارج: التحضير لشراء عقار في تونس'),
    summary:L('Organisez votre sélection à distance, réunissez les documents du bien et demandez une étude bancaire personnalisée avant de fixer votre budget final. Chaque acquisition doit être vérifiée selon la situation du bien et de l’acheteur.','Build your shortlist remotely, gather property documents and request an individual bank assessment before setting your final budget. Each purchase needs checks specific to the property and buyer.','أعد اختياراتك عن بعد واجمع وثائق العقار واطلب دراسة بنكية شخصية قبل تحديد الميزانية النهائية. يتطلب كل شراء التحقق حسب وضعية العقار والمشتري.'),
    sections:[
      {title:L('Construire un dossier de comparaison à distance','Build a remote shortlist','كوّن ملف مقارنة عن بعد'),body:L('Conservez pour chaque appartement sa référence, son plan, sa surface vendable, le prix communiqué et la date de l’information. Comparez aussi l’étage, les extérieurs, l’accès et la disponibilité. Les visites virtuelles servent à préparer des questions ; demandez une visioconférence pour voir les éléments qui vous intéressent et, si possible, une visite sur place avant de vous engager. Les rendus illustratifs représentent un aménagement possible, pas un état des lieux du chantier.','Save each apartment’s reference, plan, saleable area, quoted price and the date of that information. Also compare floor, outdoor areas, access and availability. Use virtual tours to prepare questions, then request a video call and, where possible, an on-site visit before committing. Illustrative renders show possible furnishing, not the current construction condition.','احتفظ بمرجع كل شقة ومخططها ومساحة البيع والثمن المعلن وتاريخ المعلومة. قارن الطابق والمساحات الخارجية والمداخل والتوفر. استعمل الزيارة الافتراضية لإعداد أسئلة واطلب مكالمة فيديو وزيارة ميدانية إن أمكن قبل الالتزام. الصور التوضيحية تعرض تأثيثاً ممكناً وليست توثيقاً للحالة الحالية للورشة.')},
      {title:L('Vérifier les documents du bien','Check the property documents','تحقق من وثائق العقار'),source:'https://www.cpf.gov.tn/CPFWebSite/Arabe/ServiceEnLigne.php',body:L('L’Office national de la propriété foncière propose des services en ligne, notamment la consultation de titres fonciers et des demandes de certificats. Demandez les références exactes du bien et faites examiner sa situation et les documents de vente par un professionnel compétent en Tunisie. La disponibilité d’un document en ligne ne dispense pas de vérifier sa date, son contenu et sa correspondance avec le lot proposé.','Tunisia’s land registry offers online services including land-title consultation and certificate requests. Obtain the exact property references and have a qualified professional in Tunisia review its status and sale documents. An online document still needs checks for date, content and correspondence with the proposed property.','يوفر الديوان الوطني للملكية العقارية خدمات إلكترونية منها الاطلاع على الرسوم العقارية وطلب الشهائد. اطلب المراجع الدقيقة للعقار واعرض وضعيته ووثائق البيع على مختص مؤهل في تونس. توفر وثيقة إلكترونية لا يغني عن التحقق من تاريخها ومضمونها ومطابقتها للعقار المقترح.')},
      {title:L('Faire étudier le financement avant de s’engager','Have financing assessed before committing','اطلب دراسة التمويل قبل الالتزام'),source:'https://www.ubci.tn/particuliers/tunisiens-residents-a-letranger/acheter-un-logement-en-tunisie/credit-immobilier/',body:L('Des banques proposent des offres immobilières destinées aux Tunisiens résidant à l’étranger ; UBCI présente notamment CREDISSIMMO pour des projets de logement en Tunisie. Demandez à votre banque les justificatifs correspondant à votre pays de résidence et à vos revenus, puis une proposition écrite indiquant apport, durée, coût, assurances et conditions. Les résultats d’un simulateur ne constituent pas un accord de crédit. Faites aussi préciser les modalités de transfert et de justification des fonds adaptées à votre situation.','Banks offer home-financing products for Tunisians abroad; UBCI lists CREDISSIMMO for housing projects in Tunisia. Ask your bank for the documents applicable to your residence and income, then a written proposal covering deposit, term, cost, insurance and conditions. A calculator result is not a loan approval. Also clarify transfer and source-of-funds documentation applicable to your situation.','تقدم بنوك تمويلات سكنية للتونسيين بالخارج؛ يعرض UBCI منتج CREDISSIMMO لمشاريع السكن في تونس. اطلب من بنكك الوثائق المناسبة لبلد إقامتك ودخلك وعرضاً مكتوباً يبين التمويل الذاتي والمدة والكلفة والتأمين والشروط. نتيجة المحاكي ليست موافقة على القرض. استوضح كذلك إجراءات تحويل الأموال وإثبات مصدرها حسب وضعيتك.')},
      {title:L('Planifier les étapes et garder une trace','Plan the steps and keep records','نظم المراحل واحتفظ بالوثائق'),body:L('Prévoyez qui participera aux visites, qui vérifiera les documents et quels rendez-vous nécessiteront votre présence. Si une représentation est envisagée, faites confirmer la forme et la portée du mandat par le professionnel chargé de l’opération. Conservez les échanges, offres et versions des documents. Dans l’espace client IMF, les documents et messages mis à votre disposition permettent de suivre votre dossier ; ils ne remplacent pas les formalités requises pour conclure la vente.','Decide who will attend visits, review documents and which appointments require your presence. If using a representative, have the professional handling the transaction confirm the required authority and its scope. Keep correspondence, offers and document versions. The IMF client portal helps you follow your file through shared documents and messages; it does not replace the formalities required to complete a sale.','حدد من سيحضر الزيارات ومن سيراجع الوثائق وأي المواعيد تتطلب حضورك. عند التفكير في التمثيل، اطلب من المختص المكلف بالعملية تأكيد شكل الوكالة ونطاقها. احتفظ بالمراسلات والعروض ونسخ الوثائق. يساعدك فضاء عميل IMF على متابعة ملفك بالوثائق والرسائل ولا يعوض الإجراءات اللازمة لإتمام البيع.')},
    ],
    questions:[{question:L('Une simulation donne-t-elle un accord de financement ?','Does a calculator provide financing approval?','هل تمنح المحاكاة موافقة على التمويل؟'),answer:L('Non. Seule l’étude de votre dossier par la banque peut aboutir à une offre de financement selon ses conditions.','No. A bank must assess your application before making a financing offer under its conditions.','لا. تتطلب الموافقة دراسة البنك لملفك وتقديم عرض حسب شروطه.')},{question:L('Où consulter les services du registre foncier tunisien ?','Where can I find Tunisian land-registry services?','أين أجد خدمات السجل العقاري التونسي؟'),answer:L('Sur le site officiel de l’Office national de la propriété foncière, cpf.gov.tn. Les services et délais dépendent du document demandé.','On the official land-registry website, cpf.gov.tn. Services and processing times depend on the document requested.','على الموقع الرسمي للديوان الوطني للملكية العقارية cpf.gov.tn. تختلف الخدمات والآجال حسب الوثيقة المطلوبة.')}],
    sources:[{title:'Office national de la propriété foncière — Services en ligne',url:'https://www.cpf.gov.tn/CPFWebSite/Arabe/ServiceEnLigne.php'},{title:'UBCI — Crédit immobilier pour les Tunisiens résidents à l’étranger',url:'https://www.ubci.tn/particuliers/tunisiens-residents-a-letranger/acheter-un-logement-en-tunisie/credit-immobilier/'}],
  },
];
