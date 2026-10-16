# Déploiement et reprise

## Sources de vérité

`database/001…007` et `scripts/migrations.cjs` définissent le schéma. Les migrations sont transactionnelles, versionnées et exécutées par un compte propriétaire séparé, avant les processus web. Le runtime vérifie la version 7 et refuse un schéma absent/ancien ; il n’exécute aucun DDL ni amorçage implicite. Les statuts, comptes et hashes existants sont conservés. Une donnée héritée invalide fait échouer la migration, sans correction arbitraire ni suppression.

Ne pas exécuter les migrations ou importer une sauvegarde depuis un compte client ou une requête web.

## Préparation

1. Sauvegarder PostgreSQL et les médias, chiffrer la sauvegarde hors site et tester sa restauration dans une instance isolée. Conserver une preuve datée avec durée, RPO/RTO et responsable. Ne jamais tester une restauration en écrasant la production.
2. Classifier les 361 masters dans `docs/source-archive-inventory.json`. Archiver les originaux dans un espace privé et vérifier les SHA-256 avant toute purge d’historique. La révision `8c8600e0bd73aaa9faa3bc3f9ba99f4c0f04945c` permet encore de récupérer les anciennes sources ; cette présence publique est un risque restant, pas une archive privée.
3. Lancer Gitleaks sur tout l’historique. Révoquer/faire tourner chaque secret encore actif avec le propriétaire. Les comptes et mots de passe existants ne sont pas modifiés automatiquement. Un retrait Git n’annule pas les anciennes copies.
4. Fournir `DATABASE_URL`, `AUTH_SECRET` aléatoire (32 caractères minimum), `APP_ORIGIN` HTTPS exact, `CLAMAV_HOST`, et un en-tête d’adresse vérifiée. Stocker les secrets dans le gestionnaire de l’hébergeur, jamais dans Git.
5. TLS PostgreSQL distant vérifié ; certificat privé via `PG_SSL_CA_FILE`. Compte runtime sans rôle superuser/createdb/createrole, sans propriété des tables ni droit CREATE. Adapter `database/runtime-permissions.sql`. Ne jamais donner le rôle propriétaire au runtime.

## Proxy et limitation anonyme

`TRUSTED_CLIENT_IP_HEADER` doit nommer UN en-tête écrasé par le dernier proxy de confiance : `x-real-ip`, `cf-connecting-ip`, `x-forwarded-for` ou `x-vercel-forwarded-for`. Une liste de plusieurs IP est refusée. Ne pas exposer directement l’origine derrière ce proxy. Pour Nginx, bloquer l’accès direct au processus Node et utiliser `proxy_set_header X-Real-IP $remote_addr;`. Si Nginx est lui-même derrière un CDN, configurer `set_real_ip_from` avec les seuls réseaux du fournisseur et vérifier cette chaîne avec l’exploitant.

L’application ne déduit jamais la confiance de X-Forwarded-For seul. Sans cette configuration, les formulaires anonymes de production sont refusés. Les compteurs sont par source et par paire source/identité ; le plafond de secours est 10 000/minute, au lieu des anciennes limites partagées 30/100. IPv6 est regroupé par /64. Ajouter des règles WAF par IP/sous-réseau et une épreuve antibot en cas d’abus distribué. Suivre les événements `anonymous_rate_limited` et `anonymous_identity_unavailable`, sans journaliser les identités en clair.

## Migration et amorçage

Avec le compte de migration, `npm ci`, puis `npm run db:migrate`. Ne pas utiliser le même compte dans le runtime. Réexécuter est sans effet pour les versions déjà appliquées. Une ancienne base créée par le runtime reçoit les mêmes contraintes qu’une base neuve, y compris l’unicité de toutes les affectations de lots. En cas de doublon, identifier le propriétaire réel avec le commercial, sauvegarder puis corriger explicitement avant de réessayer.

Pour importer une ancienne base JSON : `npm run db:validate`, puis `npm run db:import -- --confirm` sur une base cible vide. Le script refuse une cible occupée et valide aussi les appartements secondaires. Ne pas éditer/supprimer le fichier d’origine. Pour une installation neuve sans JSON, `npm run catalog:seed` insère uniquement le catalogue public sur une base vide. Puis `npm run admin:create`, avec `IMF_ADMIN_EMAIL` et `IMF_ADMIN_PASSWORD` fournis dans un environnement privé. Ce script refuse de remplacer un administrateur existant.

## Clés administrateur

Avant d’ouvrir le site aux clients, restreindre l’accès réseau aux opérateurs. Configurer temporairement `ADMIN_PASSKEY_ENROLLMENT_TOKEN` avec au moins 32 caractères aléatoires, communiquer ce jeton par canal privé à l’administrateur existant, puis se connecter avec son mot de passe. Ouvrir « Première inscription de la clé de sécurité », saisir le jeton et inscrire une clé/passkey vérifiée par PIN/biométrie. Le premier facteur seul ne crée pas de session administrateur en production. Retirer le jeton après inscription de tous les administrateurs. Il ne remplace jamais le mot de passe.

Durée administrateur : une heure maximum, quinze minutes sans interaction. Les rafraîchissements automatiques n’allongent pas cette durée. `/fr/admin/securite` présente les sessions et permet leur révocation avec confirmation du mot de passe. Un changement de mot de passe/rôle conserve la vérification authVersion côté serveur.

Récupération : contrôle d’identité par deux opérateurs, réseau restreint, sauvegarde préalable. Révoquer les sessions et incrémenter auth_version ; retirer les seules clés du compte identifié via un script contrôlé par le propriétaire de la base ; réactiver temporairement le jeton d’inscription et réinscrire. Ne jamais utiliser de mot de passe/PIN partagé ni désactiver MFA pour tout le site. Documenter acteur, motif et ticket ; vérifier la reconnexion et retirer le jeton.

## Médias

Les nouveaux contrats exigent une analyse ClamAV disponible, en plus du parsing borné. Si indisponible, l’import échoue et les fichiers existants restent lisibles. Vérifier connectivité privée/TLS avant ouverture.

Avec `MEDIA_S3_BUCKET`, les nouveaux médias vont dans un bucket privé chiffré ; variables optionnelles `MEDIA_S3_REGION`, `MEDIA_S3_ENDPOINT` HTTPS et `MEDIA_S3_PATH_STYLE`. Utiliser une identité workload ou les variables AWS privées. Bloquer l’accès public du bucket et restreindre le rôle au préfixe applicatif. Ne pas réutiliser le CDN public pour ce bucket. Aucun lien permanent S3 n’est exposé : l’API autorise chaque requête et propage la plage à S3.

`node scripts/media-maintenance.cjs migrate --confirm` copie et relit les médias existants pour vérifier leur SHA-256, puis ajoute les références objet ; les octets PostgreSQL d’origine restent conservés. Faire cette opération en fenêtre de maintenance sans éditions concurrentes, sauvegarde vérifiée au préalable. `node scripts/media-maintenance.cjs cleanup` rejoue les suppressions objet en attente ; planifier ce traitement côté exploitant et alerter si la file persiste. Les références supprimées deviennent immédiatement inaccessibles, même si le stockage est hors ligne. Ne pas configurer une règle de durée de vie qui effacerait des objets encore référencés.

## Publication et contrôle

`npm run build`, puis fournir au runtime les variables obligatoires et appliquer `npm run ops:check`. Faire l’inscription initiale sur accès réseau restreint avant le dernier contrôle. Remplir le registre de preuves. Vérifier les checks GitHub obligatoires avant promotion et configurer la protection de branche depuis les paramètres du dépôt (non modifiée par ces scripts).

Les présentations publiques sont générées sans les masters. `CSP_ALLOWED_ORIGINS` ajoute uniquement les origines HTTPS réellement nécessaires ; `NEXT_PUBLIC_ASSET_ORIGIN` autorise le CDN public. Ne pas ajouter un wildcard. Les pages restent dynamiques pour les nonces et la fraîcheur des ventes ; seul le signal public de révision est partageable avec un cache de cinq secondes. Ne pas mettre de cache partagé devant admin/client/API privée.

## Exploitation et retour arrière

Alerter sur erreurs 5xx, latence p95/p99, refus anonymes, échecs MFA, antivirus indisponible, file de suppression média, espace disque/DB, échec de sauvegarde et expiration TLS. Limiter et chiffrer les accès aux logs ; ne pas collecter mots de passe, cookies, messages ou contrats. Définir responsable, rétention, export et suppression des données clients selon le cadre applicable ; le code seul ne définit pas la politique légale.

En cas d’incident : restreindre l’accès, préserver les journaux, révoquer les sessions et secrets concernés, consigner les opérations, restaurer seulement après validation. Une ancienne version peut encore contenir le reset de statuts ou un schéma runtime : ne pas revenir à une version antérieure à la correction sans revue. Tester le rollback applicatif et la restauration sur staging. Les migrations de cette livraison ajoutent des contraintes/tables ; ne pas les supprimer pour contourner un défaut de données.
