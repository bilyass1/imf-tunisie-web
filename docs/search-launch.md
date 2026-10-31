# Search launch — imf-immobiliere.tn

Le domaine officiel est https://imf-immobiliere.tn ; le contact public configuré est contact@imf-immobiliere.tn. The code uses this exact domain spelling as its canonical origin. Configurer le domaine et les DNS sur l’hébergeur qui sert effectivement la production, activer HTTPS et rediriger www vers cette origine. La procédure VPS/OVH identifiée est décrite ci-dessous. Redirect any owned former site domain permanently to the matching new URL. Mailbox hosting and delivery are separate from the public contact address and have not been tested in this change.

After deployment, check /robots.txt, /sitemap.xml and /llms.txt without authentication. Public pages permit crawling; account/admin pages carry noindex. Robots rules do not replace authentication.

Verify domain ownership in Google Search Console and Bing Webmaster Tools, then submit https://imf-immobiliere.tn/sitemap.xml. Verification requires the owner's account and DNS access. No verification token is invented by this code.

Use Search Console URL Inspection for the home page and the two active projects. Check the structured data and canonical URLs on deployed HTML. FAQ markup matches the visible answers; it does not promise a Google FAQ rich result. llms.txt is an optional content guide, not an indexing guarantee.

Public routes include French, Arabic and English alternatives. No country restriction is applied: Tunisian residents and Tunisian buyers abroad can discover the same pages. Keep availability and prices current. Record Search Console/Bing indexing reports after launch; analytics only measures visits, not indexing.

External search and AI services decide whether and when to index or cite the pages. A working deployment and crawl access are prerequisites; ranking cannot be guaranteed.

## Accès réel des robots et hébergement

Audit du dépôt : aucun `vercel.json`, aucune règle WAF ni filtre de User-Agent dans le middleware. La CSP à nonce et les protections des fichiers CAD/PDF sont conservées. `PUBLIC_FILE` laisse passer `/robots.txt`, `/llms.txt`, `/llms-full.txt` et `/sitemap.xml` sans redirection de langue.

Le test HTTP de la production existante avec `GPTBot/1.1` sur `/fr` a renvoyé 200 avec du HTML, quatre scripts JSON-LD et les alternatives `fr`, `ar`, `en`, `x-default`. Cela ne prouve pas le passage de tous les robots depuis leurs réseaux réels. Le refus précédemment signalé n'a pas été reproduit et sa cause n'est pas établie. Le compte Vercel connecté ne trouve pas ce projet et ne dispose d'aucune équipe accessible : la configuration du tableau de bord n'a donc pas pu être inspectée.

Si un refus persiste après déploiement, identifier d’abord l’hébergement réellement servi. Pour le VPS/OVH documenté, examiner les accès et erreurs Nginx, le service `imf-validation` et les protections éventuellement placées en amont. Les étapes Vercel ci-dessous ne concernent qu’un déploiement effectivement servi par Vercel, par exemple une prévisualisation :

1. Ouvrir le projet IMF dans Vercel, **Security → Firewall → Traffic**, filtrer l'URL, l'heure du refus et le robot ; relever la règle/action responsable et l'identifiant de requête. Un User-Agent envoyé avec curl n'authentifie pas le robot.
2. Dans **Security → Firewall → Rules → Bot Management → AI Bots**, ouvrir les réglages et choisir **Log** pour **AI crawlers** et **AI assistants**, puis **Review Changes → Publish**. Cela permet le passage tout en conservant la journalisation. Ne pas laisser ces catégories en **Deny** si l'objectif est leur accès public.
3. Examiner les règles personnalisées **Deny/Challenge** et les restrictions géographiques : elles ne doivent pas bloquer les robots vérifiés sur les pages publiques. Autoriser Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, Perplexity-User, ClaudeBot, Claude-SearchBot, Claude-User, Google-Extended et Applebot-Extended. Privilégier les signaux de bots vérifiés aux exceptions fondées uniquement sur un User-Agent falsifiable ; garder `/api/`, l'authentification et les espaces privés protégés.
4. Vérifier **Attack Challenge Mode**, **Bot Protection** et **Settings → Deployment Protection** : les visiteurs publics ne doivent pas recevoir de challenge ou de connexion sur le domaine de production. Examiner une éventuelle protection Cloudflare en amont. Corriger uniquement la règle identifiée ; ne pas désactiver la protection DDoS globale.
5. Refaire les tests de `scripts/verify-search-http.cjs` sur le domaine public et vérifier un passage réel dans les journaux. `robots.txt` ne peut pas annuler un blocage au niveau du réseau ou du WAF.

Références Vercel : https://vercel.com/docs/bot-management et https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets ; réglages distincts crawlers/assistants : https://vercel.com/changelog/block-ai-crawlers-and-assistants-independently-with-managed-rules .

## Décision : aucune fausse API pour les agents

Ne pas publier `/.well-known/poppy.json`, `/.well-known/openid-configuration`, `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`, `/auth.md`, `/.well-known/api-catalog`, `/.well-known/ai-catalog.json`, `/.well-known/agent-skills/index.json`, ni DNS-AID. IMF n'expose aucune API publique pour les agents et l'espace client est privé. Ces métadonnées décriraient des services inexistants, augmenteraient la surface exposée et n'apporteraient pas de bénéfice démontré au référencement.

## Vérifications de production locale

`npm run lint`, `npm run typecheck` et `npm test` vérifient les schémas, les règles des robots et les pages locales. Après `npm run build` et `npm start`, exécuter :

```sh
node scripts/verify-search-http.cjs http://localhost:3000
node scripts/test-jsonld.cjs http://localhost:3000
```

Les contrôles HTTP ont confirmé : bots GPTBot/ClaudeBot/PerplexityBot en 200, JSON-LD et quatre hreflang dans le HTML brut FR/AR/EN, canonical officiel, Link de découverte, caches des textes IA, sitemap de 660 URL, 404 projet absent/CAD/PDF interdit et noindex des espaces privés. Les 660 URL incluent les lots vendus ; le total évoluera avec les projets et articles.

Environnement de validation : le conteneur ne fournit pas `/proc` et refuse certaines inspections système. Un preload local au processus de test remplace uniquement les lectures de mémoire/interfaces indisponibles ; il ne fait pas partie du dépôt ou du code déployé. La compilation de production a réussi dans ces conditions. Aucun secret ou accès à la base de production n'a été utilisé ; les données commerciales en production doivent être contrôlées après déploiement.

### Performance et images

Les vues 3D gardent leurs imports `dynamic(..., {ssr:false})` et leur montage à la visibilité ou au clic, avec une image statique et un espace réservé. Les images des cartes, du footer/logo et des sections sous le hero ne sont plus préchargées en priorité. Les textes alternatifs publics sont renseignés dans la langue affichée, avec `sizes` adaptés.

Lighthouse mobile a été tenté sur `/fr`, mais Chrome ne démarre pas dans cet environnement (échec du port de débogage, puis signal `Trace/breakpoint trap` même sans sandbox). **Aucune valeur LCP/CLS ni réussite des objectifs n'est affirmée.** La fiche projet n'a pas pu être mesurée pour la même raison. À refaire sur une machine disposant de Chrome :

```sh
npx lighthouse http://localhost:3000/fr --only-categories=performance --output=html --output-path=./lighthouse-home.html
npx lighthouse http://localhost:3000/fr/projets/residence-la-gloire --only-categories=performance --output=html --output-path=./lighthouse-project.html
```

Objectifs : LCP < 2,5 s, CLS < 0,1. Contrôler aussi le réseau avant/après défilement : aucun GLB, Draco ou module Three.js ne doit être chargé avant l'approche ou l'ouverture de la vue interactive. Confirmer sur le domaine de production avec ses images et sa base réelles.

### Validation des données structurées

Les tests parsant le JSON-LD serveur vérifient Organization/RealEstateAgent, ApartmentComplex, Apartment, BreadcrumbList et les offres. Seuls les appartements disponibles avec un prix documenté portent aussi `Product`. Les lots vendus restent `Apartment` avec `SoldOut`. Une résidence ne porte `Product` que si son `AggregateOffer` contient une fourchette issue de prix documentés. Les quantités de logements utilisent `QuantitativeValue`. Aucun prix, avis, GPS, horaire, date de création ou slogan n'est inventé.

La compatibilité de structure ne garantit pas un résultat enrichi Google : `Apartment`/`ApartmentComplex` n'ont pas de résultat enrichi immobilier dédié. Après déploiement, soumettre les URL au https://validator.schema.org/ et au https://search.google.com/test/rich-results . Le contrôle interactif de ces services n'a pas été exécuté dans ce conteneur ; les tests locaux ne sont pas présentés comme une certification par ces services.

## Markdown négocié

Les pages publiques d'accueil, projets, résidences, appartements, guides, contact et pages locales peuvent répondre à `Accept: text/markdown`. Une liste blanche partagée protège à la fois le rewrite et le gestionnaire `/api/markdown` : aucune route admin, client ou d'authentification n'est acceptée. Le contenu provient de `getProjects()`, des dictionnaires et des guides ; aucun HTML n'est scrapé. Les requêtes RSC et les préférences HTML restent en HTML. La réponse Markdown annonce explicitement `Vary: Accept` ; Next.js peut remplacer cet en-tête sur le HTML, qui ne fait donc pas l’objet d’une garantie équivalente. La CSP et les liens de découverte sont conservés. Les URL avec paramètres gardent `noindex, follow` dans la représentation Markdown.

Le contrôle final a aussi confirmé les six pages locales et les routes Markdown en français, arabe et anglais. Pour extraire les attributs hreflang avec curl, utiliser `grep -io 'hreflang="[a-z-]*"'` : React écrit `hrefLang` dans le HTML, ce qui est valide car les noms d'attributs HTML sont insensibles à la casse.

L'envoi d'un échantillon JSON-LD au validateur externe a été rejeté par le contrôle automatique : un contenu dérivé du dépôt pourrait inclure des détails commerciaux non publics. Aucun contournement n'a été tenté. La validation externe par envoi de données reste à autoriser ; les contrôles de structure et le parsing HTTP locaux sont réussis.

## Actions du propriétaire après fusion et déploiement

- Configurer le domaine principal sans www, les redirections 308 des domaines possédés et la boîte mail. Soumettre le sitemap à Google Search Console (propriété Domaine, DNS) puis demander l'indexation des trois accueils et projets.
- Importer la propriété dans Bing Webmaster Tools ; examiner la configuration IndexNow dans ce compte. Aucun jeton fictif n'est publié.
- Valider les fiches Google Business Profile de Sfax et Tunis Ennasr avec des coordonnées cohérentes, photos et avis authentiques.
- Vérifier le WAF et les accès réels comme décrit plus haut. Le compte Vercel connecté ici ne permet pas leur inspection.
- Fournir les informations de `CONTENU-A-VALIDER.md`, compléter les vraies pages sociales et les liens externes ; contrôler les citations et l'indexation dans 4 à 8 semaines.


## Méthode de déploiement identifiée avant fusion

Le dépôt documente une procédure **VPS/OVH avec Next.js derrière Nginx et systemd**. Il ne faut pas déduire l’hébergement de production des seules prévisualisations Vercel. Preuves consultées :

- `README.md`, section déploiement : serveur Node/VPS avec `npm run build` puis `npm start` derrière Nginx.
- Branche `deploy/pr4-ovh`, révision `67a6a0574b1d4ef0f89e8cecdb9aa804873bd022`, fichier `deploy/deploy-pr4-ovh.sh` : application `/srv/imf/app`, service `imf-validation`, configuration Nginx `imf-tn`, builds séparés, sauvegarde/restauration, Next lié à `127.0.0.1:3001`, bascule du proxy et contrôles HTTPS du domaine officiel.
- Dans cette branche, `deploy/prepare-pr4.py` applique une intégration ciblée en préservant les changements locaux ; sa liste de fichiers ne couvre pas à elle seule toute cette PR SEO (notamment le verrou de dépendances et la documentation).
- Branche `deploy/vps-resolution-20261028`, révision `3c8eb156af13caec09d2f866c1e8f07320274cbf`, fichier `scripts/resolve-vps-merge.cjs` : réparation ponctuelle d’une intégration PR4 dans le checkout VPS avec sauvegarde et vérifications des conflits.

Aucun accès au VPS ni aucune commande de déploiement n’a été exécuté pendant cette revue. L’opérateur doit confirmer la révision active et intégrer les corrections approuvées en préservant les changements spécifiques du serveur. Ne pas lancer les scripts PR4 tels quels pour cette PR : ils sont ciblés sur une ancienne intégration, des listes de fichiers et des contrôles de ressources/préchargement spécifiques. Adapter et revoir la procédure, inclure `package.json` **et** `package-lock.json`, faire les sauvegardes, reconstruire et tester avant la bascule. Aucun merge automatique vers `main` n’est effectué.

## Checklist post-déploiement sur le domaine officiel

À exécuter **après** le déploiement de la révision approuvée. Ces commandes ne constituent pas une preuve que cette version est déjà en production.

```sh
B=https://imf-immobiliere.tn
for p in /fr /ar /en /fr/contact /fr/projets /fr/guides /fr/appartements-sfax /ar/appartements-tunis /en/appartements-sfax /fr/projets/residence-la-gloire; do
  printf '%s ' "$p"
  curl -s -o /dev/null -w '%{http_code} %{content_type}\n' -H 'Accept: text/markdown' "$B$p"
done
# Attendu : 200 et text/markdown sur chaque URL.
curl -s -o /dev/null -w '%{http_code}\n' -H 'x-markdown-path: /fr/admin' "$B/api/markdown"
# Attendu : 404.
curl -s -o /dev/null -w '%{content_type}\n' "$B/fr"
# Attendu : text/html.
curl -s "$B/robots.txt" | grep -c 'Content-Signal'
# Attendu : 2, une directive dans chaque groupe.
curl -s -D- -o /dev/null -H 'Accept: text/markdown' "$B/fr" | grep -i '^vary'
# Attendu : le jeton Accept exact (Accept-Encoding seul ne suffit pas).
node scripts/verify-search-http.cjs "$B"
node scripts/test-jsonld.cjs "$B"
curl -s -o /dev/null -w '%{http_code}\n' -A 'GPTBot/1.1' "$B/fr"
# Attendu : 200 ; sinon examiner le firewall/anti-bot de l’hébergement réellement servi.
curl -sI https://www.imf-immobiliere.tn
# Attendu : 301/308 et Location vers https://imf-immobiliere.tn (sans www).
curl -sI http://imf-immobiliere.tn/fr
# Attendu : redirection vers https://imf-immobiliere.tn/fr.
```

Vérifier aussi les canonicals, les quatre hreflang dans le HTML brut, les protections CAD/PDF et le noindex des espaces privés. Pour compter les produits, parser les scripts JSON-LD : chaque **appartement** Product doit avoir `offers.price` et TND. Un simple grep global peut compter également la résidence Product avec son `AggregateOffer` ; celle-ci possède `lowPrice`/`highPrice`, sans prix fictif pour l’ensemble du bâtiment. La structure `AggregateOffer` est documentée par Google : https://developers.google.com/search/docs/appearance/structured-data/product-snippet .

Rejouer Lighthouse mobile sur `/fr` et une fiche projet depuis une machine avec Chrome : relever LCP, CLS et score SEO, objectifs respectifs < 2,5 s, < 0,1 et ≥ 95. Les fichiers `lh-*.json` sont des sorties de contrôle, à conserver hors commits. Soumettre ensuite le sitemap et les URL dans Search Console et Bing Webmaster Tools ; vérifier les fiches Google Business Profile de Sfax/Tunis et compléter `CONTENU-A-VALIDER.md`.
