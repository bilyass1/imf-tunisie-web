# IMF — Site web & espace client

Site officiel d'**IMF — Immobilière Mseddi Frères**, promoteur immobilier à Sfax et Tunis.
Application **Next.js 15** (App Router, TypeScript, Tailwind CSS), trilingue **FR / EN / AR** avec support RTL complet.

Réalisé par **SoluMove Technologies**.

---

## 1. Démarrage rapide

```bash
npm install
cp .env.example .env.local     # puis remplacer AUTH_SECRET
npm run dev                    # http://localhost:3000
```

En production :

```bash
npm run build
npm start
```

> Au premier lancement, `data/db.json` est créé automatiquement à partir des données
> de référence (`src/lib/seed.ts`). Supprimer ce fichier remet tout à zéro.

---

## 2. Ce que fait le site

### Site public

| Page | Route | Contenu |
|---|---|---|
| Accueil | `/fr` | Hero plein écran, chiffres clés, projets en cours et livrés, arguments différenciants |
| Le groupe | `/fr/groupe` | Histoire, engagements, métiers, chiffres |
| Projets | `/fr/projets` | Filtres statut / ville / typologie + recherche plein texte |
| Fiche projet | `/fr/projets/[slug]` | Galerie lightbox, fiche technique, avancement chantier, **maquette 3D**, **plan de disponibilité**, **simulateur de crédit**, carte |
| Fiche appartement | `/fr/projets/[slug]/appartements/[ref]` | **Maquette 3D** centrée sur le lot, **plan de vente** zoomable, **visite 360°**, caractéristiques, simulateur, lots similaires |
| Actualités | `/fr/actualites` | Liste + article |
| Contact | `/fr/contact` | Coordonnées + formulaire (les demandes arrivent dans le back-office) |

### Plan de disponibilité interactif

C'est le différenciateur face à la concurrence (stke-emar.com.tn et autres).

- Vue « plan » : l'immeuble est représenté étage par étage, du dernier niveau au rez-de-chaussée ; chaque appartement est une tuile cliquable colorée selon son statut.
- Vue « liste » : tableau triable avec toutes les surfaces.
- Filtres par bloc et par typologie, statistiques disponibles / réservés / vendus en direct.
- Clic sur un appartement → fiche latérale (surface vendable, surface hors œuvre, jardin, terrasse, prix) + bouton **Réserver cet appartement** qui pré-remplit le formulaire de contact.

**Les données sont réelles.** Les 102 appartements de la Résidence La Gloire (blocs A, B, C, D) ont été extraits des dossiers de vente PDF officiels d'IMF : code, bloc, étage, typologie, surface hors œuvre, surface vendable, jardin, terrasse. Voir `src/lib/lots-la-gloire.ts`.

### Maquette 3D conforme au plan d'architecte

Générée en WebGL (three.js), **sans modèle 3D externe** : chaque appartement est extrudé
depuis son **emprise réelle**, vectorisée sur le « plan de repérage » de sa fiche de vente PDF.
Le bâtiment reconstitué correspond donc au plan d'étage AutoCAD — implantation des quatre
blocs autour de la cour intérieure, décrochés de façade, jardins du RDC, terrasses du 5ᵉ.

- Rotation à la souris, zoom molette, recentrage
- **Coupe par étage** : les boutons R à 5 masquent les niveaux supérieurs
- Survol d'un appartement → sa référence et sa surface
- Clic → ouverture de sa fiche
- Sur une fiche appartement, la maquette s'ouvre cadrée sur le lot, en surbrillance dorée

Les emprises sont dans `src/lib/la-gloire-footprints.ts` (102 lots, échelle 8,449 px/m).
La méthode d'extraction, le contrôle de justesse et les limites assumées sont documentés
dans **`MAQUETTE-3D-METHODE.md`**.

Pour un programme dont les emprises ne sont pas encore relevées (Diar Al Yassamine), le
champ `massing.fallbackBars` de `src/lib/seed.ts` fait générer des volumes en barres.

### Plan de vente (PDF AutoCAD → web)

Les plans de vente sont livrés en PDF. Le script `npm run plans` les convertit en images web
affichées directement dans la fiche appartement, avec zoom, déplacement et plein écran.

```bash
# 1. copier les PDF en les nommant par référence de lot
#    public/plans/la-gloire/A11.pdf, B02.pdf, C25.pdf…
#    public/plans/diar-al-yassamine/A511.pdf…
# 2. convertir
npm run plans
```

Prérequis : **Poppler** (`pdftoppm`) ou ImageMagick.
Windows : https://github.com/oschwartz10612/poppler-windows/releases (ajouter `bin\` au PATH).
Tant qu'un plan n'est pas converti, la fiche affiche « Plan bientôt en ligne » et propose le PDF.

### Visite virtuelle 360°

Visionneuse sphérique WebGL intégrée : glisser pour regarder autour, molette pour zoomer,
plein écran, passage d'une pièce à l'autre.

Elle attend des **panoramiques équirectangulaires 2:1** dans `public/360/<projet>/<REF>/<piece>.jpg`.
Tant qu'un fichier est absent, la section affiche « Visite 360° bientôt disponible ».

👉 Le cahier des charges complet à transmettre au bureau d'études est dans
**`VISITES-360-CAHIER-DES-CHARGES.md`** (format, résolution, nommage, et la liste des
14 appartements types qui suffisent à couvrir les 102 lots).

### Simulateur de crédit

Prix, apport, taux et durée → mensualité, coût total du crédit, aperçu de l'échéancier année par année (formule d'annuité constante). Purement indicatif, avec mention légale.

### Espace client sécurisé — `/fr/espace-client`

Authentification par e-mail + mot de passe (JWT signé, cookie `httpOnly`).

- Tableau de bord : montant total, déjà réglé, reste à payer, prochaine échéance, avancement
- Mon appartement : fiche complète du lot + plan téléchargeable
- Échéancier : toutes les tranches avec statut réglée / à venir / en retard
- Documents : contrats, plans, reçus
- Chantier : avancement par lot de travaux + photos
- Messages : conversation avec le service commercial

**Compte de démonstration :** `client@demo.tn` / `demo2026`

### CRM commercial — `/fr/admin-connexion`

Le back-office est un **CRM immobilier complet**, pas un simple panneau d'administration.

| Écran | Route | Contenu |
|---|---|---|
| Tableau de bord | `/fr/admin` | Opportunités ouvertes, pipeline et pipeline pondéré, taux de conversion, ventes conclues, chiffre d'affaires, répartition par étape, tâches du jour et en retard, dernières activités |
| Pipeline | `/fr/admin/pipeline` | Vue kanban par étape (Nouveau → Contacté → Visite → Offre → Réservé → Vendu / Perdu), montant par colonne, changement d'étape en un clic |
| Contacts | `/fr/admin/contacts` | Liste avec source, ville, nombre d'opportunités, valeur cumulée · création d'un contact |
| Fiche contact | `/fr/admin/contacts/[id]` | Coordonnées, budget, étiquettes, opportunités (montant, étape, date de clôture), **journal d'activités** (appel, e-mail, visite, rendez-vous, WhatsApp, note) et création de tâche |
| Tâches | `/fr/admin/taches` | Regroupées en retard / aujourd'hui / à venir / terminées |
| Lots & disponibilité | `/fr/admin/lots` | Statut et prix de chaque appartement — répercutés instantanément sur le site public |
| Clients | `/fr/admin/clients` | Comptes de l'espace client, lot rattaché, montants réglés et restants |

**Le formulaire de contact du site alimente directement le CRM** : une demande crée (ou
retrouve) le contact, ouvre une opportunité à l'étape « Nouveau », journalise le message
comme activité et crée une tâche de rappel au commercial.

**Outils de présentation** : un jeu de contacts fictifs est fourni pour montrer le CRM en
situation, effaçable par le bouton « Vider les données de démonstration » du tableau de bord.
Côté disponibilité, le bouton « appliquer un jeu de statuts de démonstration » colore le plan
et la maquette de façon réaliste, avec remise à zéro.

**Compte administrateur :** `admin@imf-tunisie.com.tn` / `imf2026`
> ⚠️ **Changer ces deux mots de passe avant la mise en ligne** (voir §5).

---

## 3. Structure du projet

```
src/
  app/[locale]/
    (site)/          pages publiques (header + footer)
    (auth)/          connexion client et administrateur
    espace-client/   portail client (session obligatoire)
    admin/           back-office (rôle admin obligatoire)
  components/
    site/            Header, Footer, Gallery, AvailabilityPlan, Maquette3D, PlanViewer,
                     Panorama360, CreditSimulator, ContactForm…
    portal/          coquille du portail client / admin
    admin/           contrôles du back-office
  i18n/
    config.ts        langues, direction (LTR/RTL)
    dictionaries/    fr.json · en.json · ar.json  ← tous les textes du site
  lib/
    types.ts         modèle de données
    seed.ts          contenu de référence (projets, actualités, comptes)
    lots-la-gloire.ts inventaire réel des lots
    db.ts            couche de persistance
    actions.ts       Server Actions (contact, auth, back-office)
    site.ts          coordonnées et mentions légales IMF
data/db.json         base de données (générée au premier lancement)
scripts/
  generate-plans.mjs conversion des plans PDF AutoCAD en images web
public/media/        101 visuels optimisés (1600 px, qualité 80)
public/plans/        plans de vente : <projet>/<REF>.pdf et .webp
public/360/          panoramiques 360° : <projet>/<REF>/<piece>.jpg (ratio 2:1)
```

---

## 4. Modifier le contenu

- **Textes de l'interface** → `src/i18n/dictionaries/fr.json` (+ `en.json`, `ar.json`)
- **Projets, descriptions, galeries** → `src/lib/seed.ts`, puis supprimer `data/db.json` et relancer
- **Coordonnées, mentions légales, réseaux sociaux** → `src/lib/site.ts`
- **Statuts et prix des lots** → directement depuis le back-office (aucun code à toucher)
- **Ajouter une image** → la déposer dans `public/media/<projet>/` et référencer `/media/<projet>/<fichier>.jpg`

### Polices

Les polices (Cormorant Garamond, Jost, Cairo) sont chargées depuis Google Fonts via un `<link>` dans `src/app/[locale]/layout.tsx`.
Pour un hébergement 100 % autonome : déposer les `.woff2` dans `public/fonts/`, remplacer le `<link>` par des règles `@font-face` dans `globals.css`, et garder les mêmes variables `--font-display`, `--font-sans`, `--font-arabic`.

---

## 5. Avant la mise en ligne — obligatoire

1. **`AUTH_SECRET`** : générer une valeur aléatoire et la mettre dans `.env.local`
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Changer les mots de passe** des comptes `admin@imf-tunisie.com.tn` et `client@demo.tn` (ou supprimer le compte de démonstration) — modifier `src/lib/seed.ts` puis régénérer `data/db.json`, ou éditer directement les `passwordHash` avec `bcrypt.hashSync('nouveau-mot-de-passe', 10)`.
3. **Valider le contenu** avec IMF : voir `CONTENU-A-VALIDER.md`.
4. **Formulaire de contact** : les demandes sont enregistrées en base et visibles dans le back-office. Pour recevoir aussi une notification e-mail, ajouter l'envoi dans `submitLeadAction` (`src/lib/actions.ts`) avec Nodemailer ou Resend.
5. **Plans PDF** : le bouton « Télécharger le plan » pointe vers `/plans/la-gloire/<REF>.pdf`. Copier les PDF de vente dans `public/plans/la-gloire/` en les nommant `A11.pdf`, `B23.pdf`, etc.

---

## 6. Hébergement

L'application utilise un fichier JSON comme base de données. C'est volontaire : aucune installation, aucune configuration.

- **VPS / serveur Node (recommandé)** : `npm run build && npm start` derrière Nginx. Le fichier `data/db.json` doit être sur un volume persistant et inclus dans les sauvegardes.
- **Vercel / Netlify** : le système de fichiers est en lecture seule, donc les écritures (statuts de lots, demandes de contact) ne persisteraient pas. Dans ce cas, remplacer les fonctions de `src/lib/db.ts` par Prisma + PostgreSQL — le reste de l'application n'a pas besoin d'être modifié, elle ne connaît que cette interface.

---

## 7. Points techniques

- Rendu serveur (React Server Components) : le HTML est complet pour le référencement, y compris en arabe
- `Server Actions` pour les formulaires : pas d'API REST à maintenir
- Sessions JWT signées (`jose`), mots de passe hachés (`bcryptjs`)
- Images servies par `next/image` (AVIF/WebP, dimensionnement automatique)
- RTL natif : l'ensemble des marges et alignements utilisent les propriétés logiques (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`)
- Métadonnées Open Graph et `alternates.languages` pour le SEO multilingue

---

## Passage en production — stockage des données

Le site fonctionne avec un fichier `data/db.json` : c'est ce qui permet de le lancer
avec un simple `npm install && npm run dev`, sans installer de base de données.

**En hébergement serverless (Vercel, Netlify, AWS Lambda), le disque de l'application est
en lecture seule.** La couche `src/lib/db.ts` le détecte et bascule automatiquement :

| Environnement | Où sont écrites les données | Durée de vie |
|---|---|---|
| Poste local, serveur dédié, VPS, Docker avec volume | `data/db.json` | **durable** |
| Vercel / Lambda | `/tmp/imf-data/db.json` | jusqu'au prochain démarrage à froid |
| Disque totalement inaccessible | mémoire du processus | le temps de la requête |

Conséquence à connaître : **sur Vercel, tout ce qui est saisi depuis le back-office
— statuts de disponibilité, prix, contacts et affaires du CRM, messages — est perdu au
redémarrage de l'instance**, et deux visiteurs peuvent tomber sur deux instances
différentes. Le site public, lui, fonctionne parfaitement : il est entièrement alimenté
par les données du fichier `src/lib/seed.ts`, qui font partie du code.

C'est donc utilisable tel quel pour une **démonstration client**, pas pour l'exploitation
réelle du CRM.

### Pour un CRM réellement exploitable

Deux options, par ordre de simplicité :

1. **Héberger sur un serveur classique** (VPS, ou Docker avec un volume monté sur `data/`).
   Aucune modification de code : `data/db.json` redevient durable.
2. **Brancher une vraie base** (Vercel Postgres, Neon, Supabase…). Tout l'accès aux données
   passe par les fonctions exportées de `src/lib/db.ts` — c'est la seule chose à réécrire,
   le reste de l'application ne connaît que cette interface.

La fonction `isPersistent()` de `src/lib/db.ts` indique si les écritures sont durables ;
elle peut servir à afficher un bandeau d'avertissement dans le back-office.
