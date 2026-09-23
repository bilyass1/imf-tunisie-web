# Corrections des notes manuscrites — 22 septembre 2026

Sources : les deux photos WhatsApp fournies, complétées par les réponses du propriétaire dans la conversation. Les passages barrés ne sont pas considérés comme des consignes actives.

## Intégré localement

- Domaine confirmé : `imf-immobilere.tn` (orthographe exacte), adresse `contact@imf-immobilere.tn`. Canonical, hreflang, sitemap, robots et données structurées dépendent de SITE.url ; llms.txt et exemple de configuration actualisés.
- Service technique : +216 58 420 088.
- Deux bureaux visibles : Sfax et Immeuble El Kods, Cité Ennasr, Tunis. L’étage et le numéro restent à préciser.
- Livraison La Gloire : prévue en 2028, confirmation explicite du propriétaire. Date affichée également sur la carte du projet de l’accueil.
- Plans de La Gloire : conservation des documents et des liens ; suppression de la date du 13 février 2026 dans le titre descriptif FR/EN/AR. Les dessins sources restent intacts.
- Diar Al Yassamine : 177 appartements, 2 commerces, 9 blocs (A1, A2, A3, A4, A5.a, A5.b, A6.a, A6.b, A7), surfaces 56,40 à 104,97 m², 63 appartements vendus et 114 en construction. Ces chiffres de programme ne remplacent pas les statuts individuels du catalogue partiel.
- Galerie Diar : filtres Toutes les photos / Perspectives 3D / Chantier et réalisations / Intérieurs. Les photos existantes ne sont pas présentées comme celles d’un appartement témoin sans identification.
- Les logos du Groupe étaient déjà intégrés. Les deux liens Maps fournis précédemment sont déjà pris en compte par project-maps.ts, ainsi que l’adresse Route de l’Habana.

## Points restant à traiter ou confirmer

- Composition de chaque appartement : les listes actuelles ont été générées par typologie et ne constituent pas un relevé exhaustif des plans. Premier contrôle visuel des planches B02 et D52 : B02 indique suite parents, chambres 1 et 2, deux SDE et WC ; D52 présente deux chambres, cuisine, SDE et WC. Ces plans ne justifient pas d’appliquer systématiquement une suite avec salle de bain à tous les S+2. Une vérification appartement par appartement reste nécessaire avant de modifier les listes et d’associer chaque panorama à une pièce précise.
- Noms des blocs positionnés sur le plan général : confirmer leur implantation sur un plan de masse annoté ; ne pas deviner les emplacements à partir d’une perspective.
- La note sur une vue/perspective IA reste imprécise quant au bloc et au point de vue. Les perspectives existantes ont été conservées.
- Identifier les photos de l’appartement témoin souhaitées ; les images actuellement disponibles sont regroupées sous Intérieurs.
- FOPROLOS et Masken Awal : section de financement déjà présente. Ne pas transformer la mention en garantie d’éligibilité pour tous les logements. Les pages BH Bank n’ont pas pu être relues lors de ce contrôle (réponse 502) ; aucun nouveau taux ni condition n’a été ajouté.
- Le total global « 300+ logements construits » d’IMF reste une estimation à confirmer, distincte du total du programme Diar (qui inclut des logements en construction).
- Pas de publication GitHub/Vercel ni de modification DNS dans cette étape. Vérifier le rattachement du domaine et la boîte mail sur l’hébergement.

## Contrôles

Compilation de production réussie (153 pages), TypeScript validé. Navigateur : chiffres Diar, filtre galerie (4 photos chantier/réalisations), téléphone cliquable, e-mail, deux bureaux, livraison 2028 sur l’accueil et nouveau canonical contrôlés. Contrôle isolé : la transformation de présentation ne modifie pas les lots, leurs statuts ni leurs prix ; 63 + 114 = 177, neuf blocs distincts, transformation idempotente.
