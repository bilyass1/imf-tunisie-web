# Maquette 3D — comment elle est construite

Révision du rendu, contrôle du DWG et correction du pas d'étage à 3,25 m : voir
[RENDU-ET-SOURCES.md](RENDU-ET-SOURCES.md). Les sections historiques ci-dessous
documentent l'origine de la maquette.

La maquette n'est pas un modèle dessiné à la main : elle est **générée à partir des plans
de vente PDF d'IMF**. Ce document explique la méthode, pour que le résultat soit vérifiable
et que la maquette puisse être régénérée si les plans évoluent.

---

## 1. La source : le « plan de repérage » de chaque fiche de vente

Chaque fiche de vente PDF (`LOT___VENTE 13.02.26/BLOCA/A11.pdf`, etc.) contient, en bas
à droite, un **plan de repérage** : le plan complet de l'étage, avec l'appartement concerné
**teinté en or**. Cette tache dorée est l'emprise exacte du lot, à l'échelle du plan d'architecte.

C'est cette zone qui a été vectorisée.

## 2. La chaîne de traitement

1. **Rendu** de la page 1 de chaque PDF à 150 dpi.
2. **Découpe** du panneau « plan de repérage ».
3. **Seuillage colorimétrique** de la teinte or, puis fermeture morphologique pour absorber
   le lettrage blanc de l'étiquette (« A 1-1 ») posée par-dessus.
4. **Plus grande composante connexe** retenue — écarte la petite flèche de repérage.
5. **Extraction du contour** et simplification Douglas-Peucker (tolérance 1,2 % du périmètre) :
   on obtient un polygone de 4 à 15 sommets.
6. **Recalage** : un alignement ECC sur le masque des murs porteurs a confirmé que tous les
   plans de repérage partagent le même repère pixel (transformation ≈ identité). Aucune
   correction n'était donc nécessaire entre blocs ni entre niveaux.
7. **Mise à l'échelle** : l'échelle a été calée par moindres carrés sur les surfaces hors
   œuvre publiées des étages courants → **8,449 px/m à 150 dpi**.
8. **Centrage** : origine au barycentre du bâtiment. Repère `x → est`, `y → sud`,
   identique à l'orientation de la planche d'étage.

Le résultat est écrit dans `src/lib/la-gloire-footprints.ts`.

## 3. Contrôle de justesse

Le rapport surface mesurée / surface publiée est constant d'un lot à l'autre — c'est ce qui
valide la vectorisation :

| Lot | Emprise mesurée | Surface vendable publiée | Rapport |
|---|---|---|---|
| A 1-1 | 3 456 px² | 56,78 m² | 60,9 |
| D 1-5 | 6 516 px² | 107,27 m² | 60,7 |

Soit 0,2 % d'écart entre deux lots de tailles très différentes.

Sur l'ensemble des étages courants, l'échelle ajustée donne **71,4 px²/m²** rapportée à la
surface hors œuvre — la valeur attendue, l'emprise dessinée correspondant au hors œuvre et
non au vendable.

## 4. Affectation aux 102 lots

49 emprises distinctes ont été relevées, puis affectées aux 102 lots :

- **Étages 2, 3 et 4** : plans identiques à l'étage 1 → l'emprise de l'étage 1 est réutilisée
  (pour le bloc B, dont le 1ᵉʳ étage compte 3 appartements et les étages 2 à 4 en comptent 4,
  ce sont les emprises de l'étage 2 qui servent de référence).
- **Rez-de-chaussée** et **5ᵉ étage** : emprises propres (jardins privatifs et terrasses
  découvertes modifient le contour).

Couverture : **102 / 102 lots**.

## 5. Ce que la maquette affiche

- Un volume extrudé par appartement, à sa position et à sa hauteur réelles
  (hauteur d'étage corrigée à 3,25 m après lecture du DWG, voir ci-dessous).
- Les quatre blocs A, B, C et D dans leur implantation réelle autour de la **cour intérieure**,
  détectée automatiquement comme la plus grande zone libre à l'intérieur de l'enveloppe bâtie
  (≈ 553 m²).
- Couleur selon le statut commercial — mise à jour depuis le CRM.
- Survol : référence et surface. Clic : ouverture de la fiche.
- **Coupe par étage** : les boutons R à 5 masquent les niveaux supérieurs pour voir un plan
  de niveau en volume.

## 6. Régénérer après une modification des plans

Les scripts de relevé sont hors dépôt (ils ne servent qu'une fois). Si IMF diffuse une
nouvelle version des fiches de vente, il suffit de nous transmettre le dossier
`LOT___VENTE` mis à jour : la chaîne ci-dessus reproduit `la-gloire-footprints.ts` en
quelques minutes.

## 7. Limites assumées

- L'emprise correspond au **contour extérieur du lot**, murs compris. Les cloisons
  intérieures ne sont pas modélisées : c'est une maquette d'implantation, pas un modèle BIM.
- Les circulations communes (cages d'escalier, ascenseurs, halls) ne sont pas teintées sur
  les plans de repérage et n'apparaissent donc pas comme volumes.
- Le sous-sol de stationnement n'est pas modélisé.
- Diar Al Yassamine n'a pas encore d'emprises relevées : sa maquette utilise le mode de
  repli (volumes en barre). Fournir les fiches de vente PDF des blocs A5/A6 permettrait
  d'appliquer la même méthode.

## Contrôle sur le DWG d'exécution (septembre 2026)

Le fichier `Messidi EXE Arch-12-05-2026.dwg -beton 06-05-26 -.dwg` (17 Mo, format AutoCAD 2004)
a été converti en géométrie exploitable (LibreDWG → GeoJSON) puis mesuré :

| Grandeur | Relevé DWG | Maquette (emprises PDF) | Écart |
|---|---|---|---|
| Largeur hors tout du bâtiment | 56,25 m (balcons compris) | 52,79 m (nu des façades) | cohérent |
| Profondeur hors tout | 56,75 m | 55,98 m | 1,4 % |
| Cour intérieure | 19,3 × 16,5 m | vide correspondant dans les emprises | superposition exacte |

La cour intérieure a été relevée sur le DWG (unités centimètres) puis reportée dans
`LA_GLOIRE_SITE.courtyard` : `x ∈ [-27,4 ; -3,6]`, `y ∈ [-8,1 ; 8,4]`.
Elle tombe exactement dans le vide laissé par les 102 emprises vectorisées sur les fiches
de vente — les deux sources indépendantes se recoupent.

Les élévations du DWG confirment le R+5, la corniche débordante et le rythme des travées.
Le traitement de façade de la maquette (bandeaux d'enduit blanc, baies anthracite,
panneaux à lattes bois verticaux, nez de balcon, garde-corps verre, corniche sombre) est
calé sur les perspectives **Consilio Studio Designs** du dossier `3D_10_18.08.26`.

## Rendu et fluidité (septembre 2026)

**Fluidité.** La maquette dessinait chaque baie, chaque latte de bois et chaque nez de
balcon comme un objet distinct, et chacun des 102 logements comme un objet à deux
matériaux : plus de 2 000 appels de dessin par image, doublés par la passe d'ombres.
Trois corrections :

- tout ce qui est immobile est **fusionné par matériau** (façades, dalles, palmiers,
  massifs, contexte urbain) ;
- les 102 logements sont fusionnés **par niveau** ; le logement survolé ou cliqué est
  retrouvé à partir de l'index de la face touchée, et sa couleur de disponibilité est
  stockée **par sommet** — passer du mode Réaliste au mode Commercial ne change donc
  qu'un matériau ;
- la boucle d'animation ne réapplique plus l'état des 102 logements à chaque image : elle
  ne le fait que lorsque le mode ou la coupe par étage change. La carte d'ombres suit la
  même règle.

Mesure : **525 → 129 appels de dessin** par image après fusion des logements
(l'état initial dépassait le millier), pour 69 600 triangles.

Ces mesures précèdent la mise à jour du 7 septembre ci-dessous ; elles ne décrivent
pas les performances mesurées de la version actuelle.

**Rendu.** Le ciel est pré-filtré une fois et sert de source de reflets aux vitrages et aux
garde-corps. La lumière reprend celle de la perspective Consilio : soleil bas de fin de
journée, ombres portées longues, enduit blanc, menuiseries sombres à reflet chaud. Un
contexte urbain — volumes bas, arbres, passage piéton — a été ajouté autour de la parcelle
pour donner l'échelle, le tout fusionné en quatre objets.
