# PostgreSQL — préparation, sans bascule

Le pilote `pg`, le schéma versionné et les outils d'import sont installés. Le site continue à utiliser `data/db.json`. Aucune base distante n'a été contactée et aucun compte n'a été transféré.

## Configuration ultérieure

Renseigner `DATABASE_URL` dans `.env.local`, jamais dans Git ou une variable NEXT_PUBLIC. Les connexions distantes vérifient les certificats TLS. Pour une autorité privée, définir `PG_SSL_CA_FILE`. Les paramètres SSL dans l'URL sont refusés afin d'éviter qu'ils désactivent cette vérification.

1. Sauvegarder ensemble `data/db.json` et `data/uploads` ; suspendre les écritures pendant l'import final.
2. `npm run db:validate` : vérifier les données locales sans réseau.
3. `npm run db:check` : vérifier la connexion configurée.
4. `npm run db:migrate` : créer le schéma dans la base choisie.
5. `npm run db:import -- --confirm` : importer vers une base vide, dans une transaction. Une erreur annule l'import ; une base remplie n'est jamais écrasée.

Les résidences, lots, utilisateurs, messages et documents ont des tables séparées, avec contraintes de rôles/statuts, e-mails uniques et index de conversations. Les autres collections CRM sont conservées en JSONB sans perte de champs, dans une table par collection logique. Les mots de passe restent hachés. Les fichiers ne sont pas transférés : leurs métadonnées et liens sont importés uniquement.

## Avant activation

La bascule exige encore de remplacer les accès synchrones de `src/lib/db.ts` par des requêtes asynchrones et des transactions PostgreSQL dans les pages, actions et sessions, de migrer les fichiers privés vers un stockage partagé et de tester les droits/concurrence sur une vraie base. Ajouter DATABASE_URL seul ne bascule pas l'application. Utiliser un compte de migration distinct du compte applicatif, avec permissions minimales. Les limites anti-abus en mémoire doivent également passer à un stockage partagé avant plusieurs instances.

Cette préparation évite une migration non testée sur les dossiers actuels. Les scripts SQL n'ont pas été exécutés sur un serveur PostgreSQL dans cette étape.
