# État des améliorations IMF — 21 septembre 2026

## Fonctionnalités livrées dans la version locale

- Recherche en français, arabe et anglais : ville, résidence, référence, budget, surface, chambres, disponibilité et tri. Les résultats sont chargés par groupes de 12 et les filtres sont conservés dans l'URL. Les prix et surfaces inconnus sont exclus quand un filtre correspondant est appliqué.
- Carte par résidence synchronisée avec les filtres. Les emplacements de La Gloire et Diar Al Yassamine utilisent désormais les liens Google Maps fournis par le propriétaire : coordonnées 36.863450, 10.264675 pour Tunis et fiche « QQ8V+2PG Diar al yassamine, Sidi Mansour » pour Diar. Les autres résidences conservent leur recherche par adresse. Les deux pages locales répondent HTTP 200 et servent les nouveaux liens ; le rendu externe des tuiles reste à vérifier sur le déploiement public.
- Favoris conservés sur l'appareil et comparaison de trois appartements maximum, avec prix, surfaces, extérieurs, disponibilité et avancement connu.
- Demande de visite sur place ou en visioconférence, date et heure de Tunis, consentement et logement prérempli. Le serveur vérifie la disponibilité et crée les éléments de suivi commercial. Le rendez-vous reste à confirmer par l'équipe.
- Trois guides originaux en FR/AR/EN : comparaison des plans, préparation d'une visite et achat depuis l'étranger. Canonical, hreflang, Article, FAQ, fil d'Ariane, sitemap et liens de découverte ajoutés. Les sélections et variantes de recherche sont non indexables.
- Tâche hebdomadaire `guides-immobiliers-imf` activée avec l'accord de l'utilisateur : mardi à 10 h, heure de Tunis. Préparation, vérification des sources, traductions et tests ; publication uniquement par le workflow autorisé.

## Performance

- Les maquettes et panoramas utilisent un chargement différé déclenché par le visiteur. Les fichiers 3D ne sont plus nécessaires au premier affichage des fiches.
- Images principales responsives et prioritaires ; suppression du masquage initial des contenus visibles par l'animation d'apparition.
- Lecture PostgreSQL publique distincte des comptes, messages, documents et données CRM ; cache court avec invalidation lors des écritures.
- 14 dérivés de panoramas existants : 25 410 832 octets de masters vers 2 154 318 octets de fichiers WebP, soit environ 91,5 % de réduction cumulée. Masters conservés, projection et proportions conservées.
- Un manifeste des fichiers publics permet leur détection sur Vercel sans dépendre de leur présence dans le système de fichiers de la fonction serveur.

## Vérifications effectuées

- Compilation de production propre réussie dans `.next-property-verified`, avec validation TypeScript.
- Suite `npm test` réussie : recherche, demande de visite, gestion commerciale, PWA, stockage et PostgreSQL. Les demandes de visite ont été testées sur une base de test isolée, y compris les refus de lots réservés, vendus ou absents.
- 77 URL de projets, plans et appartements de l'export fourni : toutes répondent HTTP 200 sans erreur serveur. Médiane locale 0,072 s ; 95e percentile 0,124 s pour la réponse HTML complète. Ce ne sont PAS des mesures LCP, ni des mesures de Vercel/Neon.
- Navigateur : filtres combinés, limite de trois comparaisons, conservation des favoris après rechargement, comparaison, logement prérempli et option visioconférence vérifiés.
- Contrôle à 390 px et 768 px : pas de débordement horizontal de page sur les écrans contrôlés. Le tableau de comparaison possède son propre défilement horizontal. Guide arabe vérifié en RTL.
- Canonical du domaine `imf-immobiliere.tn`, noindex des pages concernées, réponses des guides et présence dans le sitemap vérifiés sur le serveur local.

## Restant à finaliser

1. Publication : ces changements sont locaux. Aucun push GitHub ou déploiement Vercel n'a été effectué pendant cette étape.
2. Mesures réelles : refaire PageSpeed mobile et bureau après déploiement. Les temps locaux ne prouvent pas que les 56 alertes de lenteur ont disparu.
3. Panoramas : seuls B02 à La Gloire et sept appartements de Diar disposent actuellement d'au moins un panorama. L'audit relève 599 chemins de pièces manquants à La Gloire et 147 à Diar ; les listes de pièces doivent être validées contre les plans avant production. Il ne s'agit pas d'un devis de 746 scènes validées.
4. L'essai D52 est conservé hors du site dans `artifacts/visual-review-2026-09-20/`. Il a été refusé pour incohérences d'ouvertures et de projection sphérique. Aucune photo B02 n'a été dupliquée pour prétendre représenter un autre appartement.
5. La géométrie des maquettes existantes n'a pas été modifiée. L'exactitude complète des dimensions et des scènes intérieures ne peut pas être certifiée avec ces vérifications ; le modèle Diar contient notamment des hauteurs estimées.

Les détails chiffrés figurent dans `property-performance-check.json`, `media-optimization.json` et `apartment-media-audit.json` dans ce dossier. L'indexation, les positions Google et les citations par les assistants IA restent décidées par les plateformes.
