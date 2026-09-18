# Audit architecture — 18 septembre 2026

## État et corrections

Next.js App Router sépare les pages publiques, les espaces authentifiés, les actions serveur et la couche de données. Les vérifications commerciales se font côté serveur et les fichiers privés passent par une route contrôlée. La compilation vérifie TypeScript.

- PostCSS mis à jour via une surcharge compatible 8.5.28 ; audit npm à refaire avec chaque mise à jour.
- Suppression du secret de session par défaut commun à toutes les installations : secret aléatoire local non versionné, AUTH_SECRET requis sur Vercel. La première connexion après cette correction doit être renouvelée.
- Vérification bcrypt asynchrone à la connexion, identité et rôle relus depuis les données à chaque session.
- Suppression des écritures silencieusement volatiles et du remplacement par des données de démonstration après une erreur de lecture. Copies indépendantes pour éviter de modifier le cache avant validation d’une écriture.
- Actualisation des conversations par empreinte : une page n’est recalculée que si les données changent. Suspension dans les onglets masqués, requêtes non superposées et brouillons préservés.
- TypeScript limité aux sources et à la compilation active, au lieu de dizaines d’anciens dossiers de compilation. `npm run lint` est actuellement un contrôle TypeScript, pas un audit ESLint stylistique.
- PWA : manifeste, icônes, installation proposée, aide iOS, écran hors connexion, service worker à cache strictement limité aux icônes et à cet écran. Ni contrats, ni messages, ni pages authentifiées, ni mutations ne sont conservés dans Cache Storage. Les actions nécessitent une connexion.

## Limites à résoudre avant plusieurs serveurs

Le JSON et les fichiers locaux ne constituent pas une architecture multi-instance. Ne pas lancer plusieurs processus écrivains sur le même dossier ; ne pas utiliser les fonctions commerciales sur un disque éphémère. La PWA ne change pas cette contrainte.

Migration cible : PostgreSQL avec utilisateurs, résidences, appartements, messages, documents, médias et journal d’audit dans des tables distinctes ; transactions et contraintes uniques pour e-mail et attribution de bien ; pagination des conversations ; stockage objet privé pour les contrats, public/CDN pour les galeries ; URLs signées après contrôle d’accès. Les documents actuels et leurs droits doivent être migrés et vérifiés avant bascule.

Compléter avec une limitation distribuée des tentatives de connexion/envois, des comptes commerciaux nominatifs, la suppression des accès de démonstration, des sauvegardes chiffrées testées, une supervision des erreurs et des essais de charge. Aucun service externe ni identifiant de base de données n’est configuré dans ce travail. Ne pas annoncer le site prêt pour une charge arbitraire.

## Vérifications

`npm test` couvre les échanges client-commercial, validations et autorisations, mots de passe, documents privés, suppression/restauration et stratégie hors connexion. `npm run build` valide l’ensemble des routes. `npm audit` vérifie les dépendances. Les tests de charge et l’installation sur appareils physiques restent distincts de ces tests.

L’installation PWA exige HTTPS en production et l’accord du navigateur/utilisateur. Aucun site ne peut imposer une installation silencieuse. Les modifications restent locales, sans publication GitHub.
