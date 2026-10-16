# Historique — état du correctif du 15 octobre 2026

Pour la politique actuelle, lire [DEPLOYMENT.md](../DEPLOYMENT.md) et [le suivi du 16 octobre](AUDIT-2026-10-16.md). Les références ci-dessous aux masters suivis dans Git et à l’ancien amorçage décrivent la livraison précédente.

# Correctifs de l’audit du 15 octobre 2026

Les comptes existants, leurs identifiants, leurs hachages de mots de passe et leurs dossiers ne sont ni supprimés ni réinitialisés par cette mise à jour. Les tests utilisent uniquement des bases et comptes jetables.

| Point de l’audit | Correction |
| --- | --- |
| Comptes et identifiants démo | Aucun compte n’est créé par le catalogue initial. Les pages de connexion et les traductions ne contiennent plus d’identifiants. L’amorçage PostgreSQL n’insère que les données publiques. |
| Premier administrateur | `npm run admin:create`, avec `IMF_ADMIN_EMAIL` et `IMF_ADMIN_PASSWORD` fournis dans un environnement privé. Refus dès qu’un administrateur existe ; aucun remplacement de compte. Exécuter d’abord `npm run db:migrate` sur une nouvelle installation PostgreSQL. |
| PIN partagé | Supprimé, y compris son hash. Suppression de dossier et sortie du statut vendu : réauthentification avec le mot de passe courant de l’administrateur connecté et 5 tentatives/minute. |
| Médias privés | Session vérifiée avant les données du dossier, requêtes ciblées par utilisateur/document/propriété en PostgreSQL. Autorisation conservée pour chaque requête partielle HTTP 206. |
| Migration de disponibilités | L’ancienne migration 4 est marquée comme retirée sans modifier de lot. SQL et TypeScript acceptent les quatre statuts. Les statuts déjà écrasés par une ancienne installation doivent être vérifiés dans ses sauvegardes ; cette mise à jour ne les invente pas. |
| Séparation des rôles | Le portail client exige explicitement un rôle client ; un administrateur passe par son propre portail. |
| Conversations | Compteur indexé par client, incrémenté par trigger lors d’un ajout, d’une correction ou d’une suppression de message. Le sondage ne recharge plus tout le CRM. |
| HTTP | CSP avec nonce unique sur les pages dynamiques, scripts de rendu vérifiés en test HTTP, workers/WASM autorisés pour la 3D, HSTS en production. |
| Contrats PDF | Analyse structurelle dans un worker limité en mémoire/temps, refus des PDF chiffrés, incomplets ou actifs, contrôle antivirus ClamAV en flux avant écriture. |
| Documents publics | Liste explicite des PDF de présentation publiables. 361 originaux PDF/DWG sont conservés à l’identique dans `source-assets/`, hors du répertoire servi et hors des fonctions déployées. Les sources CAD et PDF non approuvées ne sont pas accessibles sur le site. |
| Traçabilité | Identité de l’opérateur, opération, cible, heure et valeurs modifiées ; contenu personnel et secrets masqués. Historique PostgreSQL transactionnel, protégé contre UPDATE/DELETE par trigger. Consultation via `/fr/admin/audit`. |
| Maintenance et CI | Validation PDF, réauthentification, audit, entrées commerciales, paiements et chargement 3D séparés en modules. Véritable ESLint, typecheck, tests, build et audit des dépendances de production exécutés par GitHub Actions. |

## Chargement PDF et 3D

- Les aperçus des plans font au plus 1 800 pixels ; la version détaillée est chargée au zoom ou en plein écran. Exemple RDC : environ 330 Ko au premier affichage, au lieu de 3,7 Mo.
- 210 PDF web sont produits au build à partir des présentations approuvées. Les PDF à plusieurs pages restent complets. Les 210 documents passent de 342 517 570 à 132 631 675 octets au total. Exemple RDC : environ 1,9 Mo ; les anciennes adresses de sources redirigent vers cette copie web.
- La maquette de disponibilités légère apparaît par défaut pour La Gloire. Le modèle architecte original reste disponible à la demande et n’a pas été altéré. Chargement en parallèle du moteur et du fichier, progression, délai maximal, annulation, réutilisation du téléchargement et budget de pixels adapté à l’appareil.
- `NEXT_PUBLIC_ASSET_ORIGIN` permet d’utiliser un CDN HTTPS pour les fichiers publics. Le stockage/CDN doit être configuré par l’exploitant avec les fichiers publiés et les en-têtes CORS nécessaires ; les fichiers privés restent sous `/api/media`.
- `npm run build` génère les fichiers `.web.pdf` et `.preview.webp`. `source-assets/` est une entrée de build, jamais une sortie publique. `REBUILD_PUBLIC_MEDIA=1` force la régénération des panoramas après modification d’un master.

## Configuration et limites opérationnelles

En production, **les nouveaux contrats sont refusés tant que `CLAMAV_HOST` n’est pas configuré**. Définir aussi `CLAMAV_PORT` (3310 par défaut) et `CLAMAV_TLS=1` si le service utilise TLS. Les contrats existants restent lisibles. Le test automatique utilise un scanner factice local pour vérifier acceptation, infection et indisponibilité ; il ne prétend pas analyser les documents de production.

Le retrait d’identifiants du code ne change pas les mots de passe en base, conformément à la demande. Si des mots de passe précédemment publiés sont encore utilisés, ils doivent être changés volontairement depuis la gestion des comptes. Cette mise à jour ne purge pas l’historique Git et ne rend pas privés les documents déjà publiés dans le dépôt GitHub ; leur confidentialité dans GitHub relève d’une revue des documents et des droits du dépôt.

Les tests passent sur des fixtures locales et PostgreSQL en mémoire. Ils couvrent notamment l’isolation entre clients, les rôles, la conservation des mots de passe existants, les actions sensibles, les journaux immuables, les PDF, les plages HTTP et le rendu avec CSP. Ils ne constituent pas un pentest du serveur de production ni une mesure de débit sur son réseau réel.
