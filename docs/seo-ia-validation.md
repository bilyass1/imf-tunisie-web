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
