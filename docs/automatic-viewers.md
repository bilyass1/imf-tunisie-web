# Démarrage automatique des vues — 22 septembre 2026

Les pages projets et appartements montent leurs maquettes et panoramas sans clic à 200 px du viewport. IntersectionObserver conserve les modules dynamiques hors du premier affichage. L’initialisation attend une période libre du navigateur (500 ms maximum), et cette attente est annulée si la section sort de la zone. Les vues montées restent présentes pour conserver leur caméra et éviter de recharger les modèles lors d’un retour.

Les emplacements réservent une hauteur mobile et bureau pour limiter les déplacements de contenu. Les moteurs existants ignorent les rendus hors écran et dans un onglet masqué. Diar ne redessine désormais la scène que si la caméra, le niveau, la taille ou la rotation le nécessitent. Les erreurs WebGL et boutons de nouvelle tentative existants restent disponibles.

Vérifications locales : aucun canvas sur le premier affichage de la page La Gloire ni de la fiche B02 ; modèles La Gloire et Diar puis panorama B02 affichés automatiquement à l’approche de leur section. TypeScript et compilation de production validés (153 pages générées).

Le contrôle de Diar a aussi révélé une incompatibilité préexistante entre les géométries indexées des boîtes et celles des extrusions. Elles utilisent désormais un format commun avant regroupement, avec conservation des éléments individuels si un regroupement échoue. Les éléments de construction sont visibles après correction, sans nouvelle erreur de regroupement lors du contrôle navigateur.

Le chargement différé correspond au mécanisme documenté par Next.js : https://nextjs.org/docs/app/guides/lazy-loading. Les textes, plans, liens et métadonnées restent rendus indépendamment de WebGL. Ces contrôles ne sont pas une mesure PageSpeed du site public et ne garantissent pas de position dans les résultats de recherche. Refaire les mesures LCP, INP et CLS sur le déploiement, mobile et bureau.
