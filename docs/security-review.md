# Revue sécurité — 18 septembre 2026

`npm audit` exécuté sous PowerShell : zéro vulnérabilité connue au moment du contrôle, y compris après installation de pg. Cela ne garantit pas l'absence de failles applicatives.

Ajouts : limites bornées en mémoire pour connexion par compte et globale, contacts, messages et opérations commerciales ; tailles des champs publics contrôlées ; locale de déconnexion validée ; JWT limité à HS256 ; CSP partielle (objets, base, formulaires et intégration) et désactivation caméra/micro/géolocalisation.

Limites : les limites anti-abus sont par processus et sont réinitialisées au redémarrage ; elles doivent devenir distribuées avant plusieurs serveurs. La CSP ne restreint pas encore les scripts. Les identifiants de démonstration existants doivent être remplacés avant publication. Aucun mot de passe réel n'a été changé pendant cet audit. Une revue complète de tous les champs CRM, une analyse antivirus des fichiers PDF et un test d'intrusion externe restent à faire. Le projet n'est pas certifié « totalement sécurisé ».

PostgreSQL est préparé, pas activé : voir `postgresql.md`. Aucun transfert externe de données n'a été effectué.
