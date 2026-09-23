# Sélection des appartements Diar Al Yassamine — 22 septembre 2026

Le clic sur une surface d’appartement visible dans la maquette ouvre sa fiche dans la langue courante. Les correspondances A5.a sont tracées sur les limites colorées des plans A5a-0 et A5a-1. Elles ne modifient pas la géométrie.

- 20 appartements A5.a, quatre par niveau du RDC au quatrième.
- Raycasting sur la géométrie affichée : seuls les niveaux visibles participent ; les toitures masquent les appartements dessous.
- Escaliers, ascenseur et cours exclus. Aucune redirection vers un appartement voisin lorsqu’une fiche manque.
- Glissement au-delà de 6 pixels, annulation de pointeur et geste à plusieurs doigts ne déclenchent pas de navigation.
- Curseur et référence au survol ; liens utilisables au clavier sous la maquette, filtrés par étage. Pas de préchargement de toutes les fiches.
- A5.b et A6 restent sans lien, leurs appartements n’étant pas renseignés dans le catalogue. Les A1/A2/A3 sont accessibles ailleurs, mais ne figurent pas dans cette maquette.

Validation : contrôle TypeScript réussi ; `node scripts/test-yassamine-picking.cjs` valide les 20 correspondances, les espaces communs, l’absence de fiche et les routes FR/AR/EN. Test ajouté à `npm test`.

Navigateur local : clic direct dans le modèle vers A502 (A5-0.2) puis A521 (A5-2.1) confirmé par l’URL et le titre de fiche ; glissement depuis une zone cliquable sans navigation ; clic A5.b sans redirection. Aucun déploiement effectué.
