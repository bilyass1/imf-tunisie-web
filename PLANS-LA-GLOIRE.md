# Plans et visualisations de La Gloire

## Sources

Édition des plans de vente : 13.02.2026, dossier LOT___VENTE 13.02.26.
Les 102 PDF individuels sont conservés sans modification dans public/plans/la-gloire,
avec des aperçus WebP de 3601 × 2548 pixels. Les 11 documents d'ensemble sont dans
le sous-dossier ensemble. sources.json conserve les chemins et empreintes SHA-256.

## Visualisations intérieures

Périmètre demandé : toutes les pièces de tous les appartements.
Style : luxe contemporain, pierre claire, bois foncé, touches dorées.
Les illustrations montrent l'appartement entier en coupe 3D meublée.
Elles sont réalisées avec l'outil intégré de génération d'images à partir des PDF.
Aucun modèle 3D de l'architecte n'était disponible. Ce sont des propositions
illustrées d'aménagement, pas des modèles BIM ni des visites panoramiques.
Les PDF restent accessibles à côté des illustrations.

Les images finales sont dans public/interiors/la-gloire.
Les 102 appartements sont couverts par 64 configurations distinctes ; les
38 autres références partagent une configuration vérifiée des étages répétés.
manifest.json indique la référence, le plan source, la résolution et l'empreinte.
scripts/interior-renders.json sélectionne les sorties générées.
scripts/interior-render-prompts.json conserve la direction et les consignes.
scripts/interior-final-corrections.json conserve les dernières corrections.
Les essais comportant des ouvertures ou équipements ajoutés ont fait l'objet
de corrections ciblées. Les 19 configurations répétées des étages 2, 3 et 4
sont consignées dans scripts/interior-layout-groups.json : leurs cotes, cloisons,
ouvertures, sanitaires et balcons ont été comparés avant association.
La vérification visuelle ne remplace pas une validation par l'architecte.

## Site

La page projet propose un sélecteur de bloc et d'appartement pour les intérieurs,
puis l'accès aux 102 plans et aux documents d'ensemble. Chaque fiche présente
son plan original et son intérieur illustré. La visionneuse permet le zoom,
le déplacement et le plein écran, fermé avec Échap. Commandes en FR, EN et AR.
Les six panoramas B02 existants restent accessibles dans leur visite 360°.

Les 11 plans d'ensemble disposent aussi de pages de lecture dans le site,
avec des aperçus de 6000 pixels sur le grand côté, zoom et plein écran.
Le script render-ensemble-plans.py produit ces aperçus depuis les PDF originaux.
Les liens de téléchargement utilisent l'attribut download pour éviter
d'ouvrir les PDF dans un onglet de lecture non pris en charge.

## Vérification et ouverture

Les scripts audit-la-gloire-plans.py et audit-interior-renders.py vérifient
la couverture des 102 appartements, les fichiers, résolutions et empreintes.
L'import des intérieurs refuse une couverture incomplète.
Compiler avec npm run build. Pour rouvrir le site local, utiliser
Ouvrir-le-site.cmd à la racine du projet.

Vérifications du 15 septembre 2026 : les deux audits, le contrôle TypeScript
et la compilation de production ont réussi. Le sélecteur, une fiche appartement,
le zoom, la réinitialisation et la fermeture du plein écran avec Échap ont été
vérifiés dans le navigateur local.
