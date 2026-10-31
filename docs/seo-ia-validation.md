# Corrections SEO Google et visibilité IA — rapport de validation

## Changements par étape

| Étape | Résultat |
| --- | --- |
| 1 — Domaine | Orthographe corrigée dans configuration, textes, contrôles et documentation. Test anti-régression dans `npm test`. Seule exception : ancien email dans la liste noire de `company.ts`. Le vérificateur des canonicals lit `SITE.url`. |
| 2 — Textes IA | `llms.txt` et `llms-full.txt` générés avec les projets publics et guides réels en FR/AR/EN. Lots disponibles, prix connus seulement, contacts et avertissements. Cache public 1 h ; aucune redirection de langue. |
| 3 — Robots | Route texte avec Content-Signal, moteurs de recherche et bots IA. Exclusions API/admin/client/auth répétées pour les deux groupes. Choix d'entraînement commenté. |
| 4 — Accès réel | Aucun filtre de bot ni configuration WAF dans le dépôt. GPTBot en production existante : 200. Cause du refus précédent non reproduite. Configuration Vercel inaccessible au compte connecté ; procédure détaillée dans `search-launch.md`. |
| 5 — HTML serveur | JSON-LD et alternates déjà rendus côté serveur, conservés. Vérificateur HTTP ajouté : JSON parsable, FR/AR/EN/x-default et canonical. |
| 6 — Schémas | Deux implantations, photo du siège, langues, filtrage des faux profils sociaux. Résidences, appartements, offres calculées sur les prix documentés, références entre nœuds et BreadcrumbList. SoldOut conservé pour les lots vendus ; sitemap inchangé pour leur présence. |
| 7 — En-têtes | Link vers llms.txt et sitemap sur les routes de locale, avec CSP à nonce conservée. |
| 8 — Markdown, réalisé en dernier | Négociation Accept, contenu issu des données et dictionnaires, Vary, protection des routes privées et des requêtes RSC, noindex des variantes à paramètres. |
| 9 — Pages locales | Sfax et Tunis, chacune en trois langues : projets, adresses, lots disponibles, surfaces connues, FAQ visible et JSON-LD, canonical/hreflang, liens footer/projets, sitemap et llms.txt. Titres < 60 et descriptions < 155 caractères. |
| 10 — Qualité technique | Préchargement réservé aux héros, alt publics traduits, sizes, vues 3D différées avec image statique et hauteur réservée. 404, noindex et protections CAD/PDF vérifiés. |

## Résultats exécutés

- `npm run lint` : réussi.
- `npm run typecheck` : réussi.
- `npm audit --omit=dev --audit-level=high` : réussi, aucune vulnérabilité signalée après verrouillage de la dépendance indirecte Zod à 4.6.6.
- `npm test` : réussi, 18 scripts, dont régressions commerciales, sécurité et nouveaux contrôles SEO/Markdown.
- `npm run build` : réussi avec le preload système de test décrit dans `search-launch.md` ; ce preload est extérieur au code livré.
- `node scripts/verify-search-http.cjs http://127.0.0.1:3000` : réussi sur la compilation de production finale.
- `node scripts/test-jsonld.cjs http://127.0.0.1:3000` : réussi, parsing des schémas des pages clés depuis le HTML brut.
- GPTBot/ClaudeBot sur `/fr` et PerplexityBot sur `/robots.txt` : 200 ; pas de challenge dans l'application locale.
- Deux scripts JSON-LD présents sur chaque accueil, avec les quatre hreflang attendus.
- Sitemap : 660 URL, toutes sur `SITE.url`, y compris les pages locales et lots vendus.
- Six pages locales : 200, un H1, titres/descriptions conformes, FAQ et fil d'Ariane.
- Formats texte IA et Markdown : types MIME, cache, Vary et contenus vérifiés ; chemins privés refusés.
- Projet inexistant, DWG, SKP et PDF non approuvé : 404. Espaces privés : noindex conservé. Recherche filtrée : noindex conservé.
- Recherche du mauvais domaine dans src/public/scripts : seul l'ancien email de la liste noire subsiste.

La CI existante exécutait aussi un audit de sécurité. Le verrouillage de Zod à 4.1.11 via `@vercel/functions → @vercel/oidc → @vercel/cli-config` signalait quatre alertes élevées (GHSA-mrhx-c7xc-m3w5). Un override limité à `@vercel/cli-config` utilise Zod 4.6.6, version corrigée dans la même majeure. Aucun SDK Vercel n’a été rétrogradé ; le chargement de `attachDatabasePool` et la validation de configuration restent fonctionnels. Source : https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 .

## Limites à ne pas confondre avec une réussite

- Lighthouse mobile : tentative bloquée par le démarrage de Chrome dans le conteneur. LCP/CLS **non mesurés**, objectifs non certifiés. Commandes à rejouer sur les deux URL dans `search-launch.md`.
- Validateurs Google/schema.org : contrôles locaux réussis, sans certification par ces services. L'envoi de contenu au validateur externe a été rejeté par la revue automatique en raison du risque de données commerciales non publiques ; aucun envoi de remplacement n'a été tenté.
- WAF, comptes Google/Bing, DNS, boîtes mail et base commerciale de production : non modifiés. Vérifier l'accès après déploiement et demander l'indexation.
- Les nouveaux contrôles utilisent la base locale et des fixtures isolées ; les données réelles peuvent évoluer.

## À fournir par IMF

Liens exacts Facebook/Instagram/LinkedIn, GPS et horaires des deux implantations, date de création documentée, slogan validé, totaux des autres programmes, surfaces et prix manquants. Les détails figurent dans `CONTENU-A-VALIDER.md`. Aucun avis, coordonnée, tarif ou date n'a été inventé pour remplir un champ.


## Revue avant déploiement

Les résultats ci-dessous concernent les quatre corrections de revue, exécutées sur la branche `codex/corrections-seo-ia-imf`. Ils précisent les contrôles effectifs et remplacent les anciennes garanties trop larges sur `Vary` et sur les nœuds Product. Aucun merge ni déploiement n’a été effectué.

### Les quatre corrections

1. **Chemin Markdown après rewrite** : le middleware supprime tout `x-markdown-path` entrant, puis transmet le vrai pathname uniquement pour une négociation publique autorisée. Le handler lit cet en-tête avant le paramètre de requête, et conserve la liste blanche dans tous les cas. Un test simule une URL originale sans query de rewrite, vérifie le remplacement d’un en-tête forgé et le refus de `/fr/admin`. Les contrôles HTTP ci-dessous parcourent la vraie chaîne middleware → rewrite → handler.
2. **Content-Signal** : constante partagée, émise dans les deux groupes de robots. Le test vérifie chaque groupe, les exclusions privées et la présence de tous les robots attendus.
3. **Vary exact** : le test utilise `/(?:^|,)\s*accept\s*(?:,|$)/i` et rejette explicitement `Accept-Encoding` seul. L’assertion est conservée sur Markdown, retirée sur HTML avec un commentaire sur le remplacement possible de cet en-tête par Next.js.
4. **Product conditionnel** : un appartement est `Apartment + Product` uniquement s’il est disponible et possède un prix documenté. Sans prix, réservé, non confirmé ou vendu : `Apartment` seul ; un vendu garde son offre `SoldOut`. Les tests couvrent les prix connus, absents/invalides, les ventes avec ou sans ancien prix et les graphes du HTML serveur. `ApartmentComplex` conserve sa logique : Product uniquement avec une fourchette documentée. Un `AggregateOffer` exige sa fourchette, pas un prix fictif pour toute la résidence ; les tests contrôlent séparément les appartements et cet agrégat.

### Commandes réellement exécutées

| Commande | Résultat réel |
| --- | --- |
| `git checkout codex/corrections-seo-ia-imf` et `git pull --ff-only` | Réussis ; branche à jour au départ sur `6c3804e323940e1817523470a7a63a9a2d612678`. |
| `npm ci` | Réussi, code 0 ; 430 paquets installés. |
| `npm run lint` | Réussi, code 0. |
| `npm run typecheck` | Réussi, code 0. |
| `npm test` | Réussi, code 0 ; 18 scripts, y compris les nouveaux cas de régression. |
| `npm audit --omit=dev --audit-level=high` | Réussi, code 0 ; `found 0 vulnerabilities`. |
| `npm run build` sans adaptation | Échec, code 1 : `ENOENT`, `uv_resident_set_memory` ; le conteneur ne fournit pas la lecture système RSS attendue par Next.js. Les médias ont été préparés. |
| `NODE_OPTIONS="--require=…/qa/runtime-system.cjs" NEXT_TELEMETRY_DISABLED=1 npm run build` | Réussi, code 0. Adaptation strictement locale aux lectures mémoire/interfaces indisponibles du conteneur ; ce fichier n’est pas livré ni commité. |
| `PORT=3100 npm start -- --hostname 127.0.0.1` avec la même adaptation de test | Démarrage réussi de la compilation de production, puis arrêt contrôlé à la fin. |
| `node scripts/verify-search-http.cjs http://localhost:3100` | Réussi, code 0 ; négociation, Vary exact, accès bots, six pages locales, JSON-LD/hreflang, 660 URL du sitemap, noindex et protections CAD/PDF. |
| `node scripts/test-jsonld.cjs http://localhost:3100` | Réussi, code 0 ; parsing des schémas des pages clés dans le HTML brut et contrôle des offres des Product. |
| `git diff --check` | Réussi, code 0. |

Les changements automatiques de `docs/media-optimization.json`, `docs/pdf-web-optimization.json` et `src/lib/public-assets.json` ont été restaurés avant commit. Les contrôles utilisent les données locales/fixtures ; aucun accès à la base de production.

### Contrôles curl manuels sur le serveur de production local

| URL avec `Accept: text/markdown` | Résultat |
| --- | --- |
| `/fr` | 200, `text/markdown; charset=utf-8` |
| `/ar` | 200, `text/markdown; charset=utf-8` |
| `/en` | 200, `text/markdown; charset=utf-8` |
| `/fr/contact` | 200, `text/markdown; charset=utf-8` |
| `/fr/projets` | 200, `text/markdown; charset=utf-8` |
| `/fr/guides` | 200, `text/markdown; charset=utf-8` |
| `/fr/appartements-sfax` | 200, `text/markdown; charset=utf-8` |
| `/ar/appartements-tunis` | 200, `text/markdown; charset=utf-8` |
| `/en/appartements-sfax` | 200, `text/markdown; charset=utf-8` |
| `/fr/projets/residence-la-gloire` | 200, `text/markdown; charset=utf-8` |

- `x-markdown-path: /fr/admin` envoyé à `/api/markdown` : **404**.
- `/fr` sans Accept spécifique : **text/html; charset=utf-8**.
- Nombre de `Content-Signal` dans `/robots.txt` : **2**.
- Vary de la réponse Markdown `/fr` : `rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept, Accept-Encoding` ; le jeton exact **Accept** est présent.
- Grep Product sur La Gloire : **0**. Le parsing JSON-LD trouve **102 Apartment**, **0 lot disponible à prix documenté**, **0 Apartment Product**, **0 résidence Product** dans les données locales. Le compteur ne confond pas les appartements avec un éventuel agrégat de résidence.
- Après arrêt du serveur, une nouvelle tentative HTTP confirme que le **port 3100 est fermé**.

### Lighthouse et limites restantes

Aucun exécutable Chrome/Chromium n’est installé dans le runtime (`chromium`, `chromium-browser`, `google-chrome` absents ; binaire Playwright également absent). Les deux commandes Lighthouse conditionnées à sa présence n’ont **pas été exécutées pendant cette revue** ; aucun fichier `lh-*.json` n’est commité.

| Page | LCP | CLS | Score SEO |
| --- | --- | --- | --- |
| `/fr` | Non mesuré | Non mesuré | Non mesuré |
| `/fr/projets/residence-la-gloire` | Non mesuré | Non mesuré | Non mesuré |

Objectifs à vérifier sur une machine avec Chrome : LCP < 2,5 s, CLS < 0,1, SEO ≥ 95. Le build standard doit aussi être confirmé par la CI ou sur le VPS, sans l’adaptation propre à ce conteneur. Les validateurs externes ne sont pas certifiés ici.

La procédure de déploiement identifiée dans le dépôt est **VPS/OVH, Nginx, systemd**, à partir du README et des branches `deploy/pr4-ovh` / `deploy/vps-resolution-20261028` ; la révision effectivement active sur le serveur n’a pas été inspectée. Les preuves, précautions d’intégration et la checklist curl sur `https://imf-immobiliere.tn` sont dans `docs/search-launch.md`. Ces contrôles publics restent à exécuter après déploiement de la version approuvée.

Après déploiement : soumettre le sitemap et demander l’indexation dans Search Console, vérifier Bing Webmaster Tools, Google Business Profile Sfax et Tunis, les redirections www/apex et HTTP/HTTPS, l’accès de GPTBot et les données IMF manquantes de `CONTENU-A-VALIDER.md` (réseaux sociaux, GPS, horaires, date de création, slogan, surfaces et prix).
