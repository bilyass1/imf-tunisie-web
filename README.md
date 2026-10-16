# IMF Tunisie Web

Site immobilier FR / EN / AR, disponibilités, espace client et gestion commerciale (Next.js, PostgreSQL).

## Développement

Node.js 22. `npm ci`, copier `.env.example` vers `.env.local`, puis `npm run dev`.
Le mode JSON sans PostgreSQL est réservé au développement avec des données fictives. Aucun compte n’est créé par défaut. Ne jamais supprimer une base pour mettre à jour le catalogue.

## Production

Suivre **[DEPLOYMENT.md](DEPLOYMENT.md)**, puis **[SECURITY.md](SECURITY.md)** et le registre de preuves `docs/release-evidence.example.json`.

PostgreSQL migré et `AUTH_SECRET` explicite sont obligatoires sur tous les hébergeurs. Le serveur ne crée/altère plus le schéma. Le compte runtime doit être distinct du propriétaire de migration. L’administration en production exige mot de passe et clé WebAuthn avec vérification utilisateur. Aucun compte existant ni mot de passe n’est supprimé ou remplacé par la mise à jour.

## Contrôles

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:hardening`, `npm run build`.
- `npm audit --omit=dev --audit-level=high` pour les dépendances déployées.
- `npm run test:e2e` utilise uniquement un PostgreSQL local jetable dont le nom se termine par `_test` ; refus d’une base contenant déjà des comptes.
- GitHub Actions : tests, navigateur/PostgreSQL, CodeQL, Gitleaks sur l’historique ; Dependabot hebdomadaire.
- `npm run ops:check` vérifie la configuration du runtime, le schéma, ses permissions, la présence d’une clé administrateur et ClamAV. Ce contrôle ne remplace pas un exercice de restauration ou un pentest.

## Documents et 3D

Le build produit 210 PDF de présentation web à partir des images publiques approuvées et des dimensions/checksums de `src/lib/web-document-layouts.json`. Il ne dépend plus des originaux techniques. Les images d’aperçu restent légères ; les détails sont chargés à la demande. La maquette de disponibilités légère est affichée avant le modèle architecte.

Les 361 anciens masters PDF/DWG sont retirés de la révision courante ; leur inventaire est dans `docs/source-archive-inventory.json`. Les anciennes révisions Git restent publiques tant que le propriétaire n’a pas traité leur confidentialité. Conserver les masters dans une archive privée, jamais dans `public/` ou dans Git. Le build refuse un master public non approuvé.

Les contrats/photos clients passent par une autorisation serveur à chaque lecture, y compris Range. Un stockage S3 privé optionnel est disponible ; les blobs existants restent lisibles sans migration destructive.

## Documentation

- [Architecture actuelle](ARCHITECTURE.md)
- [Déploiement et reprise](DEPLOYMENT.md)
- [Sécurité et incidents](SECURITY.md)
- [Suivi de l’audit du 16 octobre](docs/AUDIT-2026-10-16.md)
- [Correctifs du premier audit](docs/SECURITY-REMEDIATION.md) (historique)
