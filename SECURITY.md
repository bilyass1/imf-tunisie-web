# Sécurité

Les comptes existants ne sont pas réinitialisés. Tout secret encore actif précédemment publié doit être changé par son propriétaire : supprimer sa présence dans le code courant ne le révoque pas et ne purge pas l’historique.

Ne jamais publier un rapport contenant des identifiants, hashes utilisateurs, cookies, contrats ou informations clients dans une issue publique. Pour un signalement, contacter l’exploitant via l’adresse professionnelle publiée sur le site et demander un canal privé. L’exploitant doit désigner un contact de sécurité et une astreinte dans le registre de mise en production.

Mesures applicatives : PostgreSQL obligatoire en production, migrations hors requêtes, contrôle de version de schéma, contraintes d’affectation des lots, vérification bcrypt pour les identités inconnues, limites par source de confiance, sessions administrateur courtes avec passkeys et révocation, séparation des rôles, autorisation des médias à chaque requête, parsing PDF/antivirus, CSP nonces et egress explicite, audit transactionnel append-only.

Les originaux techniques ne sont plus suivis au HEAD mais restent accessibles dans les révisions précédentes. Leur classification, leur archivage privé, la revue des secrets historiques et une éventuelle réécriture coordonnée doivent précéder la mise en production sensible. Les sauvegardes, les pare-feux, les permissions GitHub, la distribution des secrets et la connectivité antivirus se vérifient dans l’infrastructure. Aucun test local ne constitue une attestation de ces contrôles.

Voir [DEPLOYMENT.md](DEPLOYMENT.md) et [docs/AUDIT-2026-10-16.md](docs/AUDIT-2026-10-16.md) pour les limites, preuves attendues et opérations de reprise.
