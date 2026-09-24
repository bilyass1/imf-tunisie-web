# PostgreSQL sur Vercel

DATABASE_URL active le stockage PostgreSQL pour les pages, comptes, messages, CRM et paramètres. Sans cette variable, le mode local JSON reste disponible. Une panne PostgreSQL ne déclenche jamais un retour aux données de démonstration.

## Mise en service

1. Configurer DATABASE_URL et AUTH_SECRET (32 caractères aléatoires minimum) dans les variables secrètes Vercel.
2. Sauvegarder data/db.json et data/uploads, suspendre les écritures pendant le transfert.
3. Exécuter `npm run db:validate`, puis `npm run db:check`.
4. Exécuter `npm run db:import -- --confirm` vers une base vide. Les trois migrations et les fichiers sont importés dans une transaction. Une base remplie n’est jamais écrasée. Sur une base déjà remplie, exécuter uniquement `npm run db:migrate` pour appliquer la nouvelle table des limites de requêtes.
5. Déployer et vérifier les parcours commercial/client.

Les connexions distantes vérifient les certificats TLS. Les URL Neon avec sslmode=require sont acceptées sans désactiver la vérification. PG_SSL_CA_FILE permet une autorité privée. Ne jamais placer une URL de connexion dans Git ou dans une variable NEXT_PUBLIC.

## Garanties et limites

Les écritures sont transactionnelles et ne changent que les enregistrements modifiés. Une révision verrouillée en base rejette les modifications issues d’une lecture périmée ; l’utilisateur peut réessayer, sans écrasement silencieux. Les identifiants et valeurs SQL sont paramétrés. E-mails et appartements attribués sont uniques.

Les fichiers publiés sont stockés en bytea avec leurs métadonnées dans la même transaction. Les contrats restent derrière la vérification de session et du propriétaire ; leur retrait du dossier révoque l’accès. Contrats et photos de chantier : 3 Mo maximum à l’envoi. Galerie et visite 360° : 8 Mo maximum à l’envoi, conversion en WebP, puis 3 Mo maximum stockés. Les panoramas doivent déjà être équirectangulaires 2:1 et mesurer au moins 1 600 × 800 pixels ; une photo ordinaire n’est pas convertie en véritable scène 360°. Pour une grande photothèque, migrer ensuite vers un stockage objet privé.

Les sessions et connexions utilisent maintenant une lecture SQL ciblée ; l'espace client lit son seul dossier, les images publiques lisent uniquement leurs métadonnées et le limiteur de connexion/envoi est partagé en PostgreSQL. Les autres collections CRM sont encore rechargées pour certaines opérations et devront être paginées avant une forte montée en charge. Sans PostgreSQL, le limiteur reste en mémoire pour le développement local.

`npm test` inclut le moteur PostgreSQL isolé PGlite : persistance, unicité, conflits, annulation transactionnelle et médias. Le test de la connexion distante reste distinct.
