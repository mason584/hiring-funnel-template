# Créatives Meta — le process

Des images fixes pour les campagnes de recrutement, générées depuis un gabarit
HTML par Chrome headless (`generate.py` + `shot.js`). Rien à installer d'autre
que Python 3, Node et Chrome.

## Ce qu'on produit

- Trois formats par variante : **9:16** (1080 × 1920, Stories et Reels),
  **4:5** (1080 × 1350, fil) et **1:1** (1080 × 1080).
- **Tout le contenu tient dans le carré central de 1080 px.** Le 9:16 se
  recadre donc en 4:5 et en 1:1 sans rien perdre, et les trois formats sont
  rendus avec exactement le même cadrage. Les interfaces de Stories et de
  Reels, en haut et en bas de l'écran, ne recouvrent rien non plus.
- Une variante = une accroche. Une seule idée par visuel.

## Les règles Meta (catégorie spéciale « Emploi »)

- **Aucun chiffre de rémunération**, ni dans l'image ni dans le texte de
  l'annonce : « rémunération attractive », « sans cap ».
- **Aucun critère qui exclut** : ni âge, ni genre, ni nationalité, ni situation
  familiale, ni formulation qui y renvoie (« jeune », « dynamique », « senior »).
- **Pas de bouton dans l'image** : Meta ajoute son propre bouton d'appel à
  l'action sous le visuel.
- Ne pas dire d'où viennent les rendez-vous ni décrire les prospects : « B2B »
  suffit.
- La campagne se déclare en catégorie spéciale Emploi, objectif Prospects,
  avec une conversion personnalisée sur l'événement du poste
  (`hiring_<slug>`). Lien de destination : la fiche du poste
  (`/postes/<slug>`), pas l'accueil.

## La hiérarchie, de haut en bas

1. Le logo, centré.
2. Une mention courte en couleur d'accent (« Recrutement »).
3. **Le poste, en très grand** — c'est ce qui doit se lire en une seconde.
4. L'accroche, avec le mot fort en accent.
5. Un filet.
6. Trois bénéfices, en liste.
7. La ligne de conditions (rémunération attractive, sans cap, à distance).
8. L'adresse du site.

## La version photo

- Une photo verticale, visage dans le tiers supérieur, bonne lumière. La
  déposer dans `photo/` (hors dépôt) après réduction : `sips -Z 2200 in.jpg
  --out photo/out.jpg`.
- Le gabarit la place en haut, légèrement désaturée, avec un fondu vers le fond
  de marque sous le menton : le texte reste toujours sur le fond, jamais sur le
  visage. `--photo-y` remonte ou descend la photo (0 = haut de l'image).
- Vérifier sur le rendu **1:1** que le visage n'est pas coupé et que le logo
  ne le chevauche pas.

## Générer

```bash
python3 creatives/generate.py                                        # closer, variantes typographiques
python3 creatives/generate.py --role <poste>                         # un autre poste du bloc ROLES
python3 creatives/generate.py --photo creatives/photo/portrait.jpg   # + variantes photo
python3 creatives/generate.py --only photo --photo-y 30              # une seule famille, réglage vertical
```

- Les textes se changent en tête de `generate.py`, dans `ROLES` : un bloc par
  poste avec ses bénéfices (`benefits`), sa ligne de conditions (`tag`) et ses
  variantes (mention, poste, accroche). Un titre sur deux lignes demande un
  corps plus petit : `typo` et `photo` surchargent les réglages typographiques
  du poste.
- Le texte des annonces (textes principaux, titres, descriptions) peut vivre
  dans `copy/<poste>.md`, relu avec la check-list ci-dessous.
- La marque vit dans `BRAND` : couleurs, police des titres (un TTF), wordmark
  (SVG ou texte), adresse du site. Inter est chargée depuis Google Fonts au
  rendu, Chrome a donc besoin du réseau.
- Les sorties vont dans `png/` et `html/`, hors dépôt.

## Vérifier, puis livrer

- Ouvrir le 9:16 et le 1:1 de chaque variante : contenu entier dans le carré,
  chiffres jamais coupés en fin de ligne (espaces insécables), mots forts en
  accent, rien qui chevauche le visage.
- Relire le copy avec la check-list ci-dessous.
- Livrer `png/` ou un zip ; les fichiers sont nommés
  `<poste>-<variante>[-photo]-<format>.png`.
- Créer la conversion personnalisée sur `hiring_<slug>` dans Events Manager
  avant de lancer l'ad set : un événement personnalisé ne se choisit pas
  directement comme événement d'optimisation.

## Check-list du copy

- Registre d'annonce d'emploi : phrases complètes, pas d'argot, pas de jargon
  interne, pas de chiffres internes (volumes, taux, abonnés).
- Le poste en clair, le niveau attendu, ce que le candidat y gagne.
- « Sans cap » plutôt que « sans plafond » ; jamais « 100 % commission ».
- Le closer est présenté comme celui qui aide le client à prendre la bonne
  décision, pas comme celui qui pousse.
