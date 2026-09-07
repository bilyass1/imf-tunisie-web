# Rendu et sources — 7 septembre 2026

## Contrôle AutoCAD

Source fournie : `Messidi EXE   Arch-12-05-2026.dwg -beton  06-05-26 -.dwg`.

- Taille : 17 224 344 octets.
- SHA-256 : `f7a3afae61b06f138d419f5f3c99c551cb5aabf53265a8fa253cba3c3a993393`.
- Lecture locale avec [LibreDWG](https://github.com/LibreDWG/libredwg/releases/tag/0.14.8594), export GeoJSON réussi.
- Dessins repérés : plans des étages 1 à 5, façades extérieures et sur patio, coupes A-A et B-B.
- Chaîne de cotes verticale de la façade principale, à x ≈ −82 547,515 unités :
  `47F4CFE` = 290 cm ; `47F4CF5` = 35 cm ; `47F4D12` = 290 cm ; `47F4D09` = 35 cm.
- Les positions des textes 290 sont espacées de 325 unités en y (−106737,722 ; −106412,722 ; −106087,722).
- Le pas d'étage de La Gloire est corrigé de **3,10 m à 3,25 m** et la dalle à **0,35 m**.
  La correction s'applique aussi aux maquettes issues d'une base CRM existante, sans modifier les données commerciales.

Les emprises de vente restent la source des contours des appartements. Les façades,
baies, balcons, végétaux et volumes voisins constituent une interprétation illustrative
des perspectives de référence, pas une conversion BIM exhaustive du DWG.

## Matériaux et rendu

- Ciel atmosphérique et environnement de réflexion synchronisés avec les ambiances jour/soir.
- Enduit avec relief fin, vitrage verni, encadrements, meneaux, appuis, lattes individuelles,
  garde-corps et liserés lumineux.
- Palmiers à folioles courbes ; correction des plantations masquées par leurs bacs et de l'orientation d'une voie.
- Géométrie fixe fusionnée par matériau et étage ; ombres recalculées lors des changements.
- Rendu à la demande et suspension hors écran ; densité de pixels plafonnée selon la surface du canvas.
- Zoom, vues façade/aérienne, coupe, rotation optionnelle, clavier, pincement tactile et plein écran.
- Nettoyage des géométries, textures, matériaux, observateurs et événements lors du démontage.

Les statistiques de triangles et d'appels de dessin consignées dans le document historique
précèdent cette révision et ne sont pas des mesures de cette version.

## Photos B02

Les PNG fournis sont copiés à l'identique et leur identité binaire a été vérifiée.

| Fichier fourni | Fichier du site | Résolution |
|---|---|---|
| `sallon b02.png` | `salon.source.png` | 1774 × 887 |
| `cuisine b02.png` | `cuisine.source.png` | 1774 × 887 |
| `suite parentale b02.png` | `chambre-1.source.png` | 2170 × 725 |
| `chambre 01 b02.png` | `chambre-2.source.png` | 1774 × 887 |
| `chambre 02 b02.png` | `chambre-3.source.png` | 1774 × 887 |
| `salle de bain.png` | `sdb.source.png` | 1774 × 887 |

Destination : `public/360/la-gloire/B02/`. Les anciens JPEG sont conservés.
La salle d'eau conserve son fichier existant ; le jardin reste signalé indisponible.

La suite parentale a un ratio proche de 3:1. Le viewer traite cette source comme une
panoramique recadrée verticalement et limite l'inclinaison pour ne pas étirer ses pixels
sur une sphère complète. Cette adaptation suppose la même échelle angulaire horizontale
et verticale qu'une projection équirectangulaire recadrée ; les fichiers ne contiennent
pas de calibration de caméra permettant de certifier la projection.

La visionneuse conserve les couleurs originales, affiche la résolution réelle, offre des
aperçus par pièce et gère les erreurs, les changements rapides de pièce et le plein écran.
Elle préfère les `.source.png` puis charge, si présents, les `.8k.jpg` ou `.4k.jpg` du même
nom en remplacement progressif. Les originaux restent de résolution modeste : des rendus
sphériques natifs 4096 × 2048 ou 8192 × 4096 permettront un gain de détail supplémentaire.

## Vérification locale

Le cache Next existant dans OneDrive bloquait le démarrage. `IMF_BUILD_DIR` permet de
choisir un cache isolé pour les compilations et aperçus sans supprimer l'ancien cache.
Utiliser la même valeur pour `build` et `start` ; sans variable, `.next` reste le défaut.

Le projet conserve son serveur Next.js et son stockage JSON. Il ne possède pas de sortie
Cloudflare Workers ni de configuration Sites ; aucune migration d'hébergement n'est
effectuée dans cette révision visuelle.
