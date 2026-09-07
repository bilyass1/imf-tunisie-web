# Visites 360° — demande à transmettre au bureau d'études

À envoyer au **Cabinet Slim Feki — Architecture & Déco** (ou à tout studio 3D).
Le site est déjà équipé de la visionneuse : dès que les fichiers sont déposés au bon endroit,
la visite apparaît automatiquement sur la fiche de l'appartement. Aucun développement supplémentaire.

---

## 1. Ce qu'il faut produire

Pour chaque appartement à commercialiser en visite virtuelle, **un rendu panoramique par pièce**.

| Caractéristique | Valeur exigée |
|---|---|
| Projection | **Équirectangulaire / sphérique** (« Spherical », « Equirectangular », « VR Panorama ») |
| Champ de vision | **360° × 180°** — sphère complète, sol et plafond compris |
| Ratio | **exactement 2:1** |
| Résolution | **8192 × 4096 px** (minimum acceptable : 4096 × 2048) |
| Format de livraison | JPEG qualité 85–90 (nous convertissons en WebP) |
| Hauteur de caméra | 1,60 m du sol |
| Position caméra | au centre de la pièce, sans inclinaison (tilt et roll à 0) |
| Éclairage | jour, ciel HDRI, même réglage pour toutes les pièces d'un même appartement |

> ⚠️ Un rendu classique en 16:9 ou 21:9 **ne fonctionne pas** : collé sur une sphère,
> il déforme les plafonds et laisse une couture visible. Le format 2:1 équirectangulaire
> est obligatoire.

**Comment l'exporter :**
- *3ds Max + V-Ray* : caméra VRayCam → type **Spherical**, cocher *Override FOV* 360°, ratio 2:1
- *3ds Max + Corona* : CoraCam → Type **Spherical (VR)**, ratio 2:1
- *Blender / Cycles* : caméra **Panoramic → Equirectangular**, résolution 8192 × 4096
- *SketchUp + Enscape / Lumion* : bouton **Panorama 360°**, export « Mono panorama »
- *Twinmotion* : **Panorama** → export sphérique

## 2. Pièces attendues et nommage

Les noms de fichiers sont imposés — c'est ce qui permet au site de les retrouver seul.

```
salon.jpg
cuisine.jpg
chambre-1.jpg        ← suite parentale s'il y a plusieurs chambres
chambre-2.jpg
chambre-3.jpg
sdb.jpg              ← salle de bain
sde.jpg              ← salle d'eau (S+2 et S+3)
balcon.jpg           ← ou terrasse.jpg (5ᵉ étage) ou jardin.jpg (RDC)
```

## 3. Où déposer les fichiers

```
public/360/la-gloire/A11/salon.jpg
public/360/la-gloire/A11/cuisine.jpg
public/360/la-gloire/A11/chambre-1.jpg
...
public/360/la-gloire/B02/salon.jpg
public/360/diar-al-yassamine/A511/salon.jpg
```

Le dossier porte la **référence du lot** telle qu'elle apparaît dans le back-office
(`A11`, `B02`, `C25`, `D46`, `A511`…), sans espace ni tiret.

## 4. Stratégie recommandée : ne pas rendre les 102 appartements

Sur la Résidence La Gloire, les appartements se répètent d'un étage à l'autre : le A 1-1,
A 2-1, A 3-1, A 4-1 et A 5-1 sont **le même plan**. Il suffit donc de rendre
**un appartement type par typologie et par bloc**, puis de copier le dossier.

| Bloc | Appartements types à rendre | Couvre |
|---|---|---|
| A | A11 (S+1), A12 (S+2), A03 (S+3 jardin), A53 (S+3 terrasse) | 22 lots |
| B | B11 (S+1), B23 (S+2), B12 (S+3), B02 (S+3 jardin) | 21 lots |
| C | C11 (S+1), C12 (S+2), C02 (S+3 jardin) | 28 lots |
| D | D11 (S+1), D15 (S+2), D01 (S+2 jardin) | 31 lots |

**14 appartements types ≈ 8 pièces = environ 110 rendus panoramiques** couvrent les 102 lots.
Pour dupliquer, il suffit de copier le dossier `A11/` en `A21/`, `A31/`, `A41/`, `A51/`.

Un petit script de duplication peut être ajouté si vous le souhaitez.

## 5. Vérifier que ça marche

1. Déposer les fichiers, relancer `npm run dev`
2. Ouvrir `/fr/projets/residence-la-gloire/appartements/A11`
3. La section « Visite virtuelle 360° » doit afficher la sphère et non le message
   « Visite 360° bientôt disponible »

Si le message persiste : vérifier le nom exact du dossier (référence du lot) et du fichier,
et que l'image est bien en ratio 2:1.
