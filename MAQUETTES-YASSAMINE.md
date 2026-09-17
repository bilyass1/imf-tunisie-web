# Diar El Yassamine — maquettes et appartements disponibles

## Maquettes des blocs 5 et 6

La page du projet propose une vue interactive Three.js : sélection A5/A6,
rotation, zoom, vue du dessus, plein écran et coupe par niveau.

Les dix plans PDF de vente A5.a, A5.b, A6.a et A6.b sont conservés dans
`public/models/yassamine`. Leurs empreintes SHA-256 figurent dans `model.json`.
Les polygones de murs proviennent des tracés colorés vectoriels des PDF.
Les contours sont relevés sur les planches et recalés sur les cotes visibles.
Les fichiers DWG A5/A6 n'ont pas été décodés pour cette reconstruction.

Niveaux : A5.a/A5.b et A6.a du RDC au R+4 ; A6.b du RDC au R+3.
Le retrait au R+4 d'A6.a est représenté. Les balcons sont identifiés par les
zones grises et les libellés des PDF. Les fenêtres sont placées dans les
intervalles bornés des murs extérieurs ; leurs hauteurs sont estimatives.

Cette maquette est indicative : hauteur d'étage de 3 m, épaisseur de dalle,
allèges, linteaux et acrotères sont des hypothèses de présentation, sans
validation par coupes/façades. Les cloisons non colorées ne sont pas toutes
extrudées ; les plans originaux restent consultables. Ce n'est pas un BIM
d'exécution ni un relevé géométrique complet du DWG.

Reconstruction : `scripts/build-yassamine-model.py`, avec PyMuPDF et Shapely.

## Sept appartements confirmés non vendus par le propriétaire

| Référence | Type | Hors œuvre | Plancher | Jardin | Terrasse découverte |
|---|---|---:|---:|---:|---:|
| A1-0.1 | S+3 | 85,85 | 95,86 | 104,97 | 15,89 |
| A1-0.4 | S+3 | 81,01 | 90,46 | — | 15,89 |
| A2-0.1 | S+3 | 81,49 | 91,45 | 100,12 | 15,89 |
| A2-0.2 | S+3 | 80,78 | 90,66 | 98,54 | 15,89 |
| A2-0.4 | S+3 | 80,59 | 90,44 | — | 15,89 |
| A3-0.4 | S+2 | 64,32 | 72,04 | 99,04 | — |
| A3-0.5 | S+3 | 80,83 | 90,54 | 95,60 | 15,89 |

Surfaces en m², relevées dans les tableaux des DWG individuels et vérifiées
contre le récapitulatif de `PLAN RDC.dwg`. La surface de plancher est utilisée
dans le champ commercial `sellableArea` ; aucun prix n'a été inventé.

Les sept DWG individuels et le DWG du RDC sont conservés sans modification.
La conversion locale utilise LibreDWG 0.14, depuis son
[dépôt officiel](https://github.com/LibreDWG/libredwg/releases/tag/0.14), puis
ezdxf/PyMuPDF. Les aperçus de 3637 × 2570 pixels montrent les cadres des
planches de l'espace objet ; les anciens gabarits d'autres projets présents
dans l'espace papier ne sont pas repris. `available-sources.json` conserve les
empreintes des fichiers d'origine. Les aperçus ne remplacent pas les DWG.

Import reproductible : `scripts/import-yassamine-available.py`.
`src/lib/yassamine-available.json` alimente le catalogue. La réconciliation
des anciennes bases ajoute seulement les lots absents et préserve les statuts
et données commerciales existants, y compris les réservations ultérieures.

## Vérification

`node scripts/audit-yassamine-assets.mjs` vérifie les sept références, les
empreintes des huit DWG et dix PDF, la résolution des dix aperçus, les 19
niveaux de la maquette et la préservation des données commerciales existantes.
La compilation de production et les 29 pages/fichiers contrôlés en HTTP
ont réussi. Les deux blocs, la coupe au RDC, la vue du dessus, le plein écran
et la fiche A1-0.1 ont également été contrôlés dans le navigateur.

## Visites 360° des appartements A1, A2 et A3

Les fiches A1-0.1, A1-0.4, A2-0.1, A2-0.2, A2-0.4, A3-0.4 et A3-0.5
contiennent chacune un panorama équirectangulaire 2:1 du séjour. Ces images
sont des visualisations illustratives produites depuis le plan individuel et
les photos `int-1.jpg`, `int-2.jpg` et `int-3.jpg` des finitions réalisées.
Le site les identifie explicitement comme telles. Le manifeste de provenance
se trouve dans `public/360/diar-al-yassamine/manifest.json`.
