# Guides immobiliers IMF — calendrier de publication

Cadence autorisée : chaque mardi à 10 h, heure de Tunis, un guide utile avec versions FR, AR et EN. L'automatisation `guides-immobiliers-imf` est active après accord explicite de l'utilisateur le 21 septembre 2026. Elle prépare et teste le guide puis publie uniquement selon le workflow de déploiement autorisé ; toute impossibilité de publication est signalée.

## Guides ajoutés au projet

- Comparer les plans et surfaces d'appartements : définitions du catalogue, circulation, extérieurs et limites des illustrations.
- Préparer une visite : checklist, questions à poser, visite à distance, créneau demandé à confirmer.
- Acheter depuis l'étranger : organisation, vérification des documents et préparation du dossier bancaire ; références CPF et UBCI vérifiées le 20 septembre 2026.

## Prochaines éditions proposées

| Date | Sujet | Vérifications avant publication |
| --- | --- | --- |
| 22 septembre 2026 | Prix au mètre carré : comparer sans mélanger les surfaces | Exemples numériques fictifs explicitement identifiés ; aucune moyenne de marché inventée |
| 29 septembre 2026 | FOPROLOS : préparer les questions pour la banque | Conditions actuelles BH Bank, pièces et agrément exact du programme ; ne pas déduire l'éligibilité du seul prix |
| 6 octobre 2026 | Achat à Sfax : choisir un quartier selon ses trajets | Distances vérifiées, services réels, aucune promesse de rendement |
| 13 octobre 2026 | Acheter à El Aouina : checklist de visite du quartier | Cartes et itinéraires vérifiés, information séparée du discours commercial |
| 20 octobre 2026 | Comprendre le suivi d'avancement d'un appartement | Définition des étapes IMF validée avec l'entreprise ; pas de date de livraison supposée |
| 27 octobre 2026 | Préparer la réception de son appartement | Sources officielles et relecture juridique pour toute affirmation sur garanties et recours |

## Processus

1. Choisir une vraie question d'acheteur ; vérifier qu'elle n'est pas déjà traitée.
2. Consulter les sources officielles pour toute information financière, juridique ou administrative ; conserver les liens et la date.
3. Rédiger des réponses concrètes, des exemples et une checklist en trois langues. Aucun contenu artificiellement rallongé ni mots-clés répétés.
4. Ajouter le guide à `src/lib/property-guides.ts`. Les pages, données Article/FAQ et URL du sitemap sont dérivées de ce catalogue. Ajouter si nécessaire un lien descriptif à `public/llms.txt`.
5. Vérifier liens, traduction, métadonnées, données structurées, tests et compilation.
6. Publier uniquement la version revue via le workflow de déploiement autorisé. Une modification locale n'est pas une publication sur Vercel.
7. Après publication : contrôler les URL publiques et soumettre le sitemap dans les comptes propriétaires Search Console/Bing si disponibles. L'indexation et les citations IA restent décidées par les plateformes.

## Sources officielles déjà consultées

- https://www.cpf.gov.tn/CPFWebSite/Arabe/ServiceEnLigne.php
- https://www.ubci.tn/particuliers/tunisiens-residents-a-letranger/acheter-un-logement-en-tunisie/credit-immobilier/
- https://www.bhbank.tn/le-credit-foprolos
