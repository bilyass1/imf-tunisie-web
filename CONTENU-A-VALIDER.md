# Contenu à faire valider par IMF avant mise en ligne

Ce document liste, honnêtement, ce qui a été **extrait de vos documents** et ce qui a été
**rédigé ou estimé** et doit donc être confirmé par IMF.

---

## ✅ Données réelles, extraites de vos fichiers

Aucune vérification nécessaire — sauf erreur de lecture ponctuelle.

| Donnée | Source |
|---|---|
| Les 102 appartements de la Résidence La Gloire : code, bloc, étage, typologie (S+1/S+2/S+3), surface hors œuvre, surface vendable, surface jardin, surface terrasse | `LOT___VENTE 13.02.26` — les 102 fiches PDF des blocs A, B, C, D |
| Nom du programme, sous-titre « Ensemble Résidentiel en R+5 de Haut Standing », adresse « Cité Les Palmeraies – Aouina – Tunis » | Pages de garde des dossiers de vente |
| Architecte : Cabinet Slim Feki — Architecture & Déco | Cartouche des plans |
| Diar Al Yassamine : typologies du bloc A5.a (20 appartements), adresse « Route de l'Habana Km 4, Sfax », éligibilité FOPROLOS | Dossiers `VENTE__PARCELLE A5` et `FOPROLOS VENTE` |
| Logo, dégradé or, dénomination arabe عقارية مسعدي اخوان | `IDENTITE VISUEL STE IMF` |
| Coordonnées commerciales : Route Teniour Km 1, Immeuble Zéphyr Appt. 3.2 – 3027 Sfax · +216 26 711 008 · +216 54 880 083 · info@imf-tunisie.com.tn · www.imf-tunisie.com.tn | Pages de garde 2026 |
| Siège du papier en-tête : Route de Gabès Km 5.5 – 3083 Sfax · Tél. +216 74 454 592 · Fax +216 74 454 365 | `papier entete imf.pdf` |
| MF 1213581Z/P/M/000 · RC B25161862011 | `papier entete imf.pdf` |
| Service technique : +216 98 420 088 | Cartouche des plans Yassamine |
| Les 101 visuels du site | Vos 6 dossiers projets (3D, photos réelles) |

---

## ⚠️ À confirmer — années de livraison

Elles ont été **déduites des dates des fichiers photo**, faute d'information écrite.
Ce sont les seuls chiffres du site qui reposent sur une estimation.

| Projet | Année affichée | Base de l'estimation |
|---|---|---|
| Diar Al Andalous I | **2016** | Photos de façade et de chantier datées 2015-2016 |
| Complexe Marassim | **2017** | 3D extérieures 2015 et 2017 |
| Diar Al Andalous II | **2018** | 3D 2015, photos réelles 2017-2018 |
| Résidence Zéphyr | **2021** | Reportage photo daté décembre 2021 |
| Diar Al Yassamine | **2025** (en cours) | 3D 2022, photos de chantier 2025 |
| Résidence La Gloire | **2026** (en cours), livraison **2027** | Dossiers de vente du 13/02/2026 |

→ *Corriger dans `src/lib/seed.ts`, champ `year` et `deliveryLabel` de chaque projet.*

## ⚠️ À confirmer — chiffres de l'entreprise

Affichés sur l'accueil et la page « Le groupe » (`src/lib/site.ts`, objet `figures`) :

- **15+ années d'expérience** — à ajuster selon la date de création réelle d'IMF
- **6 programmes réalisés** — calculé sur les 6 dossiers fournis ; si IMF a d'autres réalisations, les ajouter
- **300+ logements construits** — estimation ; à remplacer par le chiffre réel
- **2 villes** — Sfax et Tunis

## ⚠️ À confirmer — avancement de chantier La Gloire

Les pourcentages affichés (gros œuvre 100 %, façades 70 %, second œuvre 40 %, aménagements extérieurs 15 %)
sont des **valeurs d'exemple**. À mettre à jour avec l'avancement réel dans `src/lib/seed.ts` → `progress`.

## ⚠️ À confirmer — statuts de disponibilité

**Tous les 102 appartements sont actuellement marqués « disponible »**, car aucune information de vente
n'était présente dans les dossiers. IMF doit saisir les vrais statuts depuis le back-office
(*Administration → Lots & disponibilité*), un menu déroulant par appartement.

Pour une présentation client avant cette saisie, le bouton **« Appliquer un jeu de statuts de
démonstration »** du back-office colore le plan de façon réaliste, et un second bouton remet tout à zéro.

## ⚠️ À confirmer — prix

Aucun prix n'était disponible dans les dossiers. Le site affiche **« Prix sur demande »**.
Les prix se saisissent appartement par appartement dans le back-office.
Le simulateur de crédit part d'une valeur par défaut de 260 000 TND, librement modifiable par le visiteur.

---

## ✏️ Rédigé par nos soins — à relire

Textes marketing écrits à partir de ce que montrent vos visuels et vos documents.
Rien n'y est inventé sur le plan factuel, mais le ton et les formulations doivent vous convenir.

- Slogan « L'immobilier qui traverse le temps » et baseline « Construire ce qui dure »
- Description et points forts de chacun des 6 projets
- Page « Le groupe » : histoire, engagements, métiers
- Les 4 arguments « Pourquoi IMF » de la page d'accueil
- Les 3 actualités de démonstration (`src/lib/seed.ts` → `NEWS`)
- Les traductions anglaise et arabe de l'ensemble (`src/i18n/dictionaries/`)

## 🧩 Nouveaux modules — ce qu'il reste à fournir

| Module | État | Ce qu'il manque |
|---|---|---|
| **Maquette 3D interactive** | ✅ opérationnelle | Rien. Chaque appartement est extrudé depuis son **emprise réelle**, vectorisée sur le plan de repérage de sa fiche de vente PDF — implantation des quatre blocs, cour intérieure et décrochés de façade conformes au plan d'architecte. Méthode et contrôle de justesse : voir `MAQUETTE-3D-METHODE.md`. |
| **Plan de vente dans la fiche** | ⚙️ prêt, sans fichiers | Copier les 102 PDF de `LOT___VENTE 13.02.26` dans `public/plans/la-gloire/` en les renommant `A11.pdf`, `B02.pdf`… puis lancer `npm run plans`. Idem pour Yassamine dans `public/plans/diar-al-yassamine/`. |
| **Visite 360°** | 🟡 activée sur le B02 | 7 panoramiques équirectangulaires livrés pour le **B02** (séjour, cuisine, suite parentale, chambres 2 et 3, salle de bain, salle d'eau) et installés dans `public/360/la-gloire/B02/`. Manque pour ce lot : `jardin.jpg`. Les 101 autres appartements affichent « Visite 360° bientôt disponible » tant que leurs panoramiques ne sont pas fournis — voir `VISITES-360-CAHIER-DES-CHARGES.md`. |
| **Maquette Diar Al Yassamine** | ⚙️ mode de repli | Ses fiches de vente A5/A6 n'ont pas de plan de repérage teinté : les volumes sont donc générés en barres, pas d'après le plan. Fournir des planches équivalentes permettrait d'appliquer la même méthode que pour La Gloire. |
| **CRM** | ✅ opérationnel | Contient un jeu de **contacts fictifs** pour la démonstration (Anis Trabelsi, Sonia Ben Amor…). Le bouton « Vider les données de démonstration » du tableau de bord les efface avant la mise en service réelle. |

### Fiches appartement

Une page dédiée est générée pour chacun des **102 lots de La Gloire** et des **20 lots du bloc A5.a
de Diar Al Yassamine**, à l'adresse `/fr/projets/<projet>/appartements/<REF>`.
Le contenu (surfaces, typologie, étage, composition des pièces) vient des données réelles.
La composition des pièces est **déduite de la typologie** (un S+2 → séjour, cuisine, 2 chambres,
salle de bain, salle d'eau, balcon) : à corriger dans `src/lib/seed.ts` → `buildRooms` si un plan
particulier diffère.

## 🔗 À compléter

- **Réseaux sociaux** : les liens Facebook / Instagram / LinkedIn du pied de page pointent vers les pages d'accueil des plateformes → renseigner les vraies URL dans `src/lib/site.ts`
- **Plans PDF** : copier les fiches de vente dans `public/plans/la-gloire/` (`A11.pdf`, `B23.pdf`…) pour activer le bouton « Télécharger le plan »
- **Vidéos** : les vidéos Zéphyr et Diar Al Yassamine (200 Mo à 490 Mo) n'ont pas été intégrées ; à héberger sur YouTube ou Vimeo puis à embarquer
- **Blocs A5.b, A6.a, A6.b de Diar Al Yassamine** : les surfaces ne figurent pas en texte dans les PDF (plans vectoriels sans tableau exploitable). Seul le bloc A5.a est publié. Les autres sont à saisir depuis le back-office ou à nous transmettre sous forme de tableau.

## 📸 Panoramiques 360° reçus — B02

| Pièce | Fichier | Format |
|---|---|---|
| Séjour + salle à manger | `salon.jpg` | 1774 × 887 (2:1) |
| Cuisine | `cuisine.jpg` | 1774 × 887 (2:1) |
| Suite parentale | `chambre-1.jpg` | 2170 × 1085 (2:1, complété — voir ci-dessous) |
| Chambre 2 (bleue, « chambre 01 ») | `chambre-2.jpg` | 1774 × 887 (2:1) |
| Chambre 3 (vert d'eau) | `chambre-3.jpg` | 1774 × 887 (2:1) |
| Salle de bain | `sdb.jpg` | 1774 × 887 (2:1) |
| Salle d'eau | `sde.jpg` | 1774 × 887 (2:1) |

Deux points à faire remonter au bureau d'études :

1. Le panoramique de la **suite parentale** est arrivé en 2170 × 725, soit un rapport 3:1 au lieu du 2:1
   qu'exige la projection équirectangulaire : le haut et le bas de la sphère manquaient. Les bandes
   manquantes ont été reconstituées par extension des bords, ce qui suffit à l'affichage mais ne
   remplace pas un export correct. Redemander ce rendu en 2:1.
2. La définition livrée (1774 px de large) reste basse pour du 360° : à l'écran, l'image est agrandie
   d'environ 3× dans le viewer. Le cahier des charges demande 8192 × 4096. Les fichiers actuels
   conviennent pour une démonstration, pas pour la mise en ligne définitive.

## ⚡ Optimisations de temps de réponse (sept. 2026)

| Ce qui ralentissait | Correction |
|---|---|
| Chaque fiche appartement lançait des requêtes `HEAD` depuis le navigateur pour vérifier la présence du plan et de chaque panoramique. Un 404 déclenchait en développement la compilation de `/_not-found` — plus de 2 s mesurées. | La présence des fichiers est désormais résolue **côté serveur** (`src/lib/assets.ts`, résultat mémorisé). Plus aucune requête `HEAD` : mesuré 0 au lieu de 4 par page. |
| La maquette 3D et la visite 360° démarraient WebGL dès le chargement de la page, même sans descendre jusqu'à elles. | Montage différé à l'approche du viewport (`LazyMount`) et chargement dynamique de la maquette (`next/dynamic`, sans rendu serveur) : three.js sort du bundle initial. |
| Avertissement « Cross origin request detected » à chaque accès depuis un autre poste. | `allowedDevOrigins` renseigné dans `next.config.mjs`. |
| Images ré-optimisées à chaque visite. | `minimumCacheTTL` d'un an + compression activée. |

Mesures après correction sur la fiche B02 (build de production) : premier affichage **0,86 s**,
DOM prêt **0,76 s**, 0 requête `HEAD`.

⚠️ Rappel : le site tourne encore en mode développement (`npm run dev`), qui recompile chaque page
au premier accès — c'est ce qu'on voit dans les journaux (`Compiling /[locale]/projets…`). Pour juger
de la vitesse réelle, lancer `npm run build` puis `npm start`.
