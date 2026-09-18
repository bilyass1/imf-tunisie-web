# Espace commercial

Connexion avec un compte administrateur existant, puis **Gestion commerciale** (`/fr/admin/gestion`).

- Comptes clients : créer un compte et l’associer à un appartement. Le mot de passe initial est haché ; communiquer les identifiants par votre canal habituel.
- Ouvrir / modifier le dossier : corriger le nom, l’e-mail de connexion, le téléphone et le bien associé. Les mots de passe existants restent inchangés. Les messages envoyés par le commercial peuvent être corrigés ; les réponses du client restent en lecture seule.
- Documents du client : consulter ou supprimer un document du dossier, puis le restaurer depuis la corbeille si nécessaire. Les fichiers déposés dans l’espace commercial deviennent inaccessibles au client dès leur retrait, même via leur ancien lien. Les anciens liens vers des fichiers publics ou externes restent contrôlés par leur hébergement d’origine.
- Résidences et appartements : sélectionner un bien, modifier son avancement entre 0 et 100 %, et son statut disponible, réservé ou vendu.
- Contrats et photos : publier un PDF dans les documents privés d’un client, une photo de chantier dans son espace, ou une photo de galerie sur le site public. JPEG, PNG et WebP sont optimisés automatiquement. Limite : 8 Mo par fichier.
- Messages clients : publier un message privé. Aucun e-mail n’est envoyé : aucun service d’envoi n’est configuré.
- Messagerie clients (`/fr/admin/messages`) : consulter toutes les conversations, sélectionner le client et répondre dans des bulles de discussion. Le client retrouve les réponses dans son espace Messages. Les conversations visibles s’actualisent toutes les huit secondes et au retour sur la fenêtre ; aucun accusé de lecture n’est simulé.
- Entreprise : modifier les coordonnées et la présentation affichées dans le pied de page et la page contact.

Les contrats sont accessibles uniquement au destinataire et aux commerciaux. Les photos de chantier d’un appartement sont privées pour son client ; celles d’une résidence sont partagées entre les clients de cette résidence. Les galeries sont publiques.

## Stockage et hébergement

En local, les données sont conservées dans `data/db.json` et les fichiers dans `data/uploads`, hors du dossier public et exclus de Git. Sauvegarder ces deux emplacements ensemble. Un seul processus applicatif doit écrire dans cette base locale.

Pour un hébergement sans disque persistant, notamment Vercel, il faut connecter une base de données durable et un stockage de fichiers privé avant utilisation commerciale. Les nouvelles opérations refusent explicitement les écritures sur cet hébergement pour éviter une fausse confirmation suivie d’une perte de données. Configurer également un secret de session fort et des identifiants non démonstratifs avant ouverture aux clients.

Vérification isolée : `node scripts/test-commercial.cjs`. Elle ne modifie aucun dossier client réel.
