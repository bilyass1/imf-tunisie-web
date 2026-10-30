# Search launch — imf-immobiliere.tn

Le domaine officiel est https://imf-immobiliere.tn ; le contact public configuré est contact@imf-immobiliere.tn. The code uses this exact domain spelling as its canonical origin. Configure the domain in Vercel and DNS, enable HTTPS, and redirect www to this origin. Redirect any owned former site domain permanently to the matching new URL. Mailbox hosting and delivery are separate from the public contact address and have not been tested in this change.

After deployment, check /robots.txt, /sitemap.xml and /llms.txt without authentication. Public pages permit crawling; account/admin pages carry noindex. Robots rules do not replace authentication.

Verify domain ownership in Google Search Console and Bing Webmaster Tools, then submit https://imf-immobiliere.tn/sitemap.xml. Verification requires the owner's account and DNS access. No verification token is invented by this code.

Use Search Console URL Inspection for the home page and the two active projects. Check the structured data and canonical URLs on deployed HTML. FAQ markup matches the visible answers; it does not promise a Google FAQ rich result. llms.txt is an optional content guide, not an indexing guarantee.

Public routes include French, Arabic and English alternatives. No country restriction is applied: Tunisian residents and Tunisian buyers abroad can discover the same pages. Keep availability and prices current. Record Search Console/Bing indexing reports after launch; analytics only measures visits, not indexing.

External search and AI services decide whether and when to index or cite the pages. A working deployment and crawl access are prerequisites; ranking cannot be guaranteed.

## Accès réel des robots et hébergement

Audit du dépôt : aucun `vercel.json`, aucune règle WAF ni filtre de User-Agent dans le middleware. La CSP à nonce et les protections des fichiers CAD/PDF sont conservées. `PUBLIC_FILE` laisse passer `/robots.txt`, `/llms.txt`, `/llms-full.txt` et `/sitemap.xml` sans redirection de langue.

Le test HTTP de la production existante avec `GPTBot/1.1` sur `/fr` a renvoyé 200 avec du HTML, quatre scripts JSON-LD et les alternatives `fr`, `ar`, `en`, `x-default`. Cela ne prouve pas le passage de tous les robots depuis leurs réseaux réels. Le refus précédemment signalé n'a pas été reproduit et sa cause n'est pas établie. Le compte Vercel connecté ne trouve pas ce projet et ne dispose d'aucune équipe accessible : la configuration du tableau de bord n'a donc pas pu être inspectée.

Si un refus persiste après déploiement :

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

Les tests parsant le JSON-LD serveur vérifient Organization/RealEstateAgent, ApartmentComplex, Apartment, BreadcrumbList et les offres. `Apartment` et les résidences commercialisées avec offre portent aussi le type `Product`, qui fournit le domaine schema.org de la propriété `offers`. Les quantités de logements utilisent `QuantitativeValue`. Aucun prix, avis, GPS, horaire, date de création ou slogan n'est inventé.

La compatibilité de structure ne garantit pas un résultat enrichi Google : `Apartment`/`ApartmentComplex` n'ont pas de résultat enrichi immobilier dédié. Après déploiement, soumettre les URL au https://validator.schema.org/ et au https://search.google.com/test/rich-results . Le contrôle interactif de ces services n'a pas été exécuté dans ce conteneur ; les tests locaux ne sont pas présentés comme une certification par ces services.

## Markdown négocié

Les pages publiques d'accueil, projets, résidences, appartements, guides, contact et pages locales peuvent répondre à `Accept: text/markdown`. Une liste blanche partagée protège à la fois le rewrite et le gestionnaire `/api/markdown` : aucune route admin, client ou d'authentification n'est acceptée. Le contenu provient de `getProjects()`, des dictionnaires et des guides ; aucun HTML n'est scrapé. Les requêtes RSC et les préférences HTML restent en HTML. Les deux représentations annoncent `Vary: Accept`, la CSP et les liens de découverte sont conservés. Les URL avec paramètres gardent `noindex, follow` dans la représentation Markdown.

Le contrôle final a aussi confirmé les six pages locales et les routes Markdown en français, arabe et anglais. Pour extraire les attributs hreflang avec curl, utiliser `grep -io 'hreflang="[a-z-]*"'` : React écrit `hrefLang` dans le HTML, ce qui est valide car les noms d'attributs HTML sont insensibles à la casse.

L'envoi d'un échantillon JSON-LD au validateur externe a été rejeté par le contrôle automatique : un contenu dérivé du dépôt pourrait inclure des détails commerciaux non publics. Aucun contournement n'a été tenté. La validation externe par envoi de données reste à autoriser ; les contrôles de structure et le parsing HTTP locaux sont réussis.

## Actions du propriétaire après fusion et déploiement

- Configurer le domaine principal sans www, les redirections 308 des domaines possédés et la boîte mail. Soumettre le sitemap à Google Search Console (propriété Domaine, DNS) puis demander l'indexation des trois accueils et projets.
- Importer la propriété dans Bing Webmaster Tools ; examiner la configuration IndexNow dans ce compte. Aucun jeton fictif n'est publié.
- Valider les fiches Google Business Profile de Sfax et Tunis Ennasr avec des coordonnées cohérentes, photos et avis authentiques.
- Vérifier le WAF et les accès réels comme décrit plus haut. Le compte Vercel connecté ici ne permet pas leur inspection.
- Fournir les informations de `CONTENU-A-VALIDER.md`, compléter les vraies pages sociales et les liens externes ; contrôler les citations et l'indexation dans 4 à 8 semaines.
