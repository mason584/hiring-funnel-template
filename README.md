# Tunnel de recrutement

Un modèle de tunnel de recrutement complet : page d'entreprise, fiche par
poste, questionnaire qualifiant, deux pages de sortie, tracking Meta, et une
administration avec tableau de bord, entonnoir et export.

Le branding est une couche remplaçable : deux fichiers et un dossier
d'images suffisent à le passer d'une marque à une autre.

Next.js 16 · React 19 · Postgres (Drizzle) · Tailwind 4 · Vercel.

---

## Partir de ce modèle

1. Sur GitHub : **Use this template → Create a new repository**, en privé. Le
   nouveau repo t'appartient, sans lien avec celui-ci.
2. Le cloner et l'essayer sans aucun compte (section suivante).
3. Pour la charte : `/admin/apparence` — couleurs, polices, logo — sans toucher
   au code.
4. Pour tout le reste, l'ouvrir dans Claude Code. Le fichier `CLAUDE.md` lui
   donne les règles du projet ; ce genre de demande marche telle quelle :
   - « Remplace le poste de closer par un poste de setter, avec ces questions… »
   - « Passe tout le site au vouvoiement. »
   - « Ajoute une question éliminatoire sur le niveau d'anglais. »
   - « Réécris la page d'accueil pour mon entreprise : … »
5. Déployer : section « Mise en production ».

---

## Essayer en local, sans aucun compte

```bash
pnpm install
pnpm preview:setup   # base embarquée + données de démonstration
pnpm preview
```

→ http://localhost:3000 — le site, le questionnaire, et l'administration
ouverte sur http://localhost:3000/admin. Aucune clé requise ; les événements
Meta ne partent nulle part tant qu'aucun pixel n'est configuré.

---

## Le parcours

```
ad Meta ──► /postes/closer ──► /postes/closer/candidater ──┬──► …/merci   retenu · événement hiring_closer
                               (une question par écran)    └──► …/suite   non retenu · aucun événement
```

Seule une candidature **retenue** remonte à Meta. C'est le point du montage :
sur une campagne de recrutement, la catégorie spéciale « Emploi » interdit le
ciblage par âge, genre, code postal et audience similaire — le signal de
conversion devient le principal levier, et lui envoyer les profils qu'on
écarte apprend à l'algorithme à en ramener d'autres.

---

## Ce qui se modifie, et où

| Ce que tu veux changer | Où |
|---|---|
| **Couleurs, polices, logo, angles** | **`/admin/apparence`, sans code ni redéploiement** |
| La charte par défaut (celle qui s'applique quand rien n'est saisi) | `src/brand/tokens.css` et `src/brand/brand.ts` |
| Nom, mentions légales, réseaux | `src/brand/brand.ts` |
| Polices auto-hébergées, image de partage, favicon | `public/brand/` |
| Textes de la page d'accueil | `src/content/company.ts` |
| Un poste : fiche, questions, seuils, textes de sortie | `src/content/roles/<slug>.ts` |
| La liste des postes ouverts | `src/content/roles/index.ts` |
| Pixel Meta, token Conversions API | `/admin/reglages`, sans redéploiement |

Aucun composant n'écrit de couleur ni de nom de marque en dur. Tout passe par
les variables de `tokens.css` et par `BRAND` — et `pnpm check:brand`, lancé
avant chaque build, refuse toute teinte écrite en dur ailleurs.

### Rebrander sans toucher au code

`/admin/apparence` : cinq couleurs (fond, texte, accent, sombre, panneaux),
deux polices (Google Fonts ou installées), un wordmark texte ou un logo
téléversé, et le rayon des angles. Un aperçu d'un écran du questionnaire suit
chaque modification. Les gris, bordures et ombres se calculent à partir des
cinq couleurs ; un champ laissé vide garde la valeur de la charte par défaut.
Ce qui est enregistré s'applique à la page suivante du site, jamais à
l'administration, qui reste lisible quelle que soit la charte choisie.

### Ouvrir un nouveau poste

Copier `src/content/roles/closer.ts`, changer le `slug`, les questions et les
textes, puis l'ajouter au tableau de `src/content/roles/index.ts`. C'est tout :
la route, le questionnaire, l'entonnoir de l'administration, les colonnes de
l'export et le nom de l'événement Meta (`hiring_<slug>`) en découlent.

Les types de questions disponibles : `name`, `phone`, `email`, `single`,
`multi`, `short`, `long`. Une option peut porter `disqualifies`, `score` et
`followUp` (champ de précision).

---

## Mise en production

### 1. Base de données

N'importe quel Postgres. Avec Supabase : créer un projet, puis récupérer
Project Settings → Database → Connection string (URI, pooler).

```bash
cp .env.example .env.local   # remplir DATABASE_URL, ADMIN_PASSWORD, AUTH_SECRET
pnpm db:migrate              # crée les tables
```

`AUTH_SECRET` se génère avec `openssl rand -base64 32`. La changer révoque
toutes les sessions d'administration ouvertes.

### 2. Vercel

Projet Vercel avec **Root Directory = ce dossier**. Reporter les variables de
`.env.example`, plus `NEXT_PUBLIC_SITE_URL` sur le domaine de production.
Déployer.

### 3. Meta

1. `/admin/reglages` → coller l'identifiant du pixel (dataset) et le token
   Conversions API (Business Manager → utilisateur système, autorisé sur le
   dataset).
2. Cliquer **Envoyer un test** avec un code de l'onglet « Événements de test »
   d'Events Manager : l'événement s'affiche en quelques secondes sans compter
   nulle part.
3. Renvoyer un test **sans** code : il entre dans le vrai pipeline et fait
   exister le nom `hiring_<slug>` (compter une quinzaine de minutes).
4. Events Manager → créer une **conversion personnalisée** sur cet événement.
   Un nom d'événement personnalisé n'est pas sélectionnable directement comme
   objectif de campagne.
5. Campagne : catégorie spéciale **Emploi**, objectif Prospects, événement de
   conversion = la conversion personnalisée.

**Vider le code de test avant de lancer les campagnes** : tant qu'il est
renseigné, tous les événements partent en test et ne comptent nulle part.

### 4. Vérifier

- Une candidature retenue en préprod : Events Manager la montre **une fois**,
  avec « Navigateur · Serveur » dédupliqués sur le même identifiant.
- Une candidature non retenue : **rien** ne doit apparaître.
- `/admin` : les chiffres du tableau de bord et l'export CSV correspondent.

---

## Commandes

| Commande | Ce qu'elle fait |
|---|---|
| `pnpm preview` | site + administration sur la base embarquée |
| `pnpm preview:setup` | **efface** et reconstruit la base d'aperçu |
| `pnpm dev` | serveur de développement sur la vraie base |
| `pnpm db:generate` | génère une migration après édition du schéma |
| `pnpm db:migrate` | applique les migrations à `DATABASE_URL` |
| `pnpm check` | vérifie les règles de qualification d'un poste |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | contrôles habituels |

---

## Ce que le tunnel ne fait pas (encore)

- Pas de notification email à la réception d'une candidature.
- Pas de prise de rendez-vous d'entretien sur la page « retenu ».
- Pas de bandeau de consentement aux cookies : le pixel se pose sans, comme
  sur la plupart des tunnels publicitaires. À ajouter si le contexte
  l'exige.
- Pas de purge automatique des candidatures anciennes ; la politique de
  confidentialité annonce une conservation de deux ans, à faire respecter à
  la main pour l'instant.
