# Interfaces commercial et client — vérification responsive

Les espaces utilisent un menu repliable sous 1280 px et une navigation latérale sur grand écran. Les formulaires disposent de champs de 16 px sur téléphone pour éviter le zoom automatique de Safari, de boutons tactiles de 44 px minimum et de marges adaptées. Les tableaux larges et le pipeline se parcourent horizontalement dans leur propre conteneur.

La messagerie affiche une liste de clients de hauteur limitée sur téléphone et deux colonnes à partir de 768 px. Les bulles acceptent les textes longs sans élargir la page. Aucun message ni dossier client n’a été modifié pendant ces vérifications.

Vérification dans le navigateur, avec les comptes de démonstration :

- Six pages client à 320, 768 et 1024 px.
- Neuf pages commerciales à 320, 768, 1024 et 1440 px, dont la fiche contact, les lots et le pipeline.
- Les six onglets de gestion à 320 px et l’ouverture du menu client.
- Gestion en arabe à 320 px ; navigation latérale sur ordinateur.
- Inspection visuelle de la messagerie mobile et iPad portrait, et de la gestion mobile.

La compilation de production et le contrôle TypeScript sont utilisés pour valider le code. Les dimensions sont simulées dans le navigateur de bureau : le clavier virtuel, l’installation PWA et Safari sur appareil physique ne sont pas couverts.
