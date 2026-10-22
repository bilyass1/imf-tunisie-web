# La Gloire : repérage et rendu — 22 octobre 2026

## Corrections

- Le Y des plans de vente augmente vers le sud ; le Y du fichier SketchUp augmente vers le nord. La transformation inverse cet axe, sans retourner le bâtiment. La boussole suit le même repère.
- Les grandes faces horizontales du GLB fourni sont à 3,50 / 6,75 / 10,00 / 13,25 / 16,50 / 19,75 m, avec toiture à 23,00 m. Le départ à 0,75 m décalait l’identification des étages. Une dalle exposée par la découpe appartient à l’appartement situé dessous.
- Les deux vues interrogent la première surface visible du bâtiment, plutôt que des volumes invisibles pouvant intercepter un autre appartement. Le calcul et les couleurs utilisent la même matrice inverse du modèle et les mêmes polygones.
- Le masque d’identifiants est un tableau d’entiers rasterisé sans anticrénelage. Mélanger les couleurs de deux identifiants pouvait produire l’identifiant d’un troisième appartement. Le clic utilise directement le point dans le polygone.
- La recherche spatiale BVH est chargée avec la 3D et installée uniquement sur les maillages de La Gloire. En mode découpe, elle conserve les intersections suivantes si la première est masquée. Elle ne modifie pas les prototypes globaux Three.js.
- La préparation du modèle conserve la topologie et les bordures ; la réduction `simplifySloppy` à 5 % est retirée. Les normales et l’ordre des triangles sont réconciliés au build. Le fichier architecte source reste inchangé. L’URL du dérivé est versionnée pour éviter de réutiliser l’ancienne géométrie en cache.
- Le survol est effacé quand la caméra ou l’étage change ; la rotation automatique s’arrête pendant la manipulation. La liste HTML des appartements est disponible dans les deux vues. Une perte du contexte WebGL affiche le bouton de nouvelle tentative.

## Vérification

`npm run test:gloire` couvre les 102 emprises, quatre points source distincts dans les ailes A/B/C/D, les six niveaux, les dalles découpées, la toiture, les transformations de scène, les identifiants exacts et l’exclusion du patio. Un maillage BVH à plusieurs étages vérifie que la découpe ne masque pas la surface inférieure au raycast.

Sur le GLB dérivé effectivement régénéré, 24 rayons verticaux (quatre ailes × six étages) ont retrouvé un appartement du bon bloc et du bon étage. Le point de contrôle D est adapté au plan différent du cinquième étage. Sur cet environnement Node, construction des index ≈1,6 s et p95 des 24 requêtes ≈0,9 ms ; ces chiffres ne sont pas un benchmark navigateur/mobile.

Le dérivé contient 4 252 556 triangles pour 11 157 768 octets, contre 4 314 946 triangles dans la source. La conservation des contours empêche ici d’atteindre le ratio cible de 25 %. Ce choix privilégie la géométrie : le BVH accélère le repérage, mais ne réduit pas le coût GPU. Une validation visuelle et des mesures de frame time sur appareils réels restent nécessaires. Le téléchargement Chromium de cet environnement est tronqué ; aucun test WebGL navigateur n’est revendiqué.

## Marassim

La page contient la vidéo `zQfEUoMYYYA`, une entrée de navigation « Vidéo », un lecteur responsive sans lecture automatique et un lien YouTube de secours, dans les trois langues. La CSP autorise uniquement l’origine supplémentaire `https://www.youtube-nocookie.com` pour les cadres. Les réponses HTTP de production FR/EN/AR ont été contrôlées pour le lecteur, le lien, la navigation et cet en-tête. La disponibilité de lecture reste soumise aux réglages de la vidéo YouTube.
