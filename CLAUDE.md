# Tunnel de recrutement

Ce fichier note ce qui ne se déduit pas du code : les pièges rencontrés, les
frontières à ne pas franchir, et les décisions déjà prises. Le reste se lit
dans les sources et dans `README.md`.

## Ce que c'est

Un **modèle** de tunnel de recrutement, transmissible à un client. L'instance
de ce dossier est brandée Savoire et recrute des closers ; un client la
redéploie avec sa charte et ses postes. Deux conséquences permanentes :

- **Rien de spécifique à Savoire hors de `src/brand/` et `src/content/`.**
  Aucun composant n'écrit une couleur, une police ou le mot « Savoire ».
- **Rien qui exige un compte que le client n'a pas.** Pas de fournisseur
  d'identité, pas de clé d'IA, pas de service tiers obligatoire. Un Postgres
  et un mot de passe suffisent à faire tourner l'ensemble.

Application autonome : aucune dépendance à un autre projet, tout ce qu'il faut
pour la faire tourner est dans ce dossier.

## La règle qui gouverne tout

**Seule une candidature retenue remonte à Meta.**

Une candidature non retenue part sur `/postes/<slug>/suite`, qui ne tire rien.
Ce n'est pas un détail de propreté : sur une campagne de recrutement, la
catégorie spéciale « Emploi » de Meta interdit le ciblage par âge, genre, code
postal et audience similaire. Le signal de conversion est donc le seul levier
d'optimisation qui reste, et lui envoyer les profils qu'on écarte apprend à
l'algorithme à en ramener d'autres.

Trois gardes appliquent cette règle, et il faut les trois :

1. `computeVerdict` (`src/lib/verdict.ts`) recalcule tout **côté serveur**, à
   partir des réponses enregistrées. Il revalide **toutes** les questions, pas
   seulement celles à réponse libre : sans ça, une requête forgée qui
   n'enverrait que les deux paragraphes libres passerait pour une candidature
   retenue.
2. `/merci` relit la candidature par son `sid` et **redirige** vers `/suite`
   si le verdict n'est pas « retenue ». Forcer l'URL ne déclenche rien.
3. `resendMetaEvent` refuse toute candidature non retenue — sinon ce bouton
   contournerait les deux premiers gardes.

## L'apparence

Deux couches, et il faut savoir laquelle on touche :

- **`src/brand/tokens.css` + `brand.ts`** : la charte par défaut, écrite à la
  main. C'est ce que voit un client qui n'a rien réglé, et c'est ce que voit
  toujours l'administration.
- **`/admin/apparence`** : des **surcharges** en base (`settings.appearance`
  et `settings.logo`), lues côté serveur et injectées par `<BrandStyle>` dans
  les layouts publics uniquement. Même mécanisme que le pixel Meta.

Règles qui ne se déduisent pas du code :

- **Cinq couleurs, le reste est dérivé** (`src/lib/appearance.ts`). Une
  variable dérivée n'est surchargée que si l'un de ses boutons l'a été : un
  client qui change seulement l'accent garde les gris réglés à la main de la
  charte. Les cinq valeurs par défaut sont **dupliquées** entre `tokens.css`
  et `brand.ts` — le code ne lit pas le CSS. Les changer dans un fichier sans
  l'autre désynchronise l'aperçu et le site.
- **`appearance.ts` est pur**, sans `server-only` : l'aperçu en direct de
  l'administration recalcule exactement les mêmes surcharges dans le
  navigateur. Une seule fonction, deux consommateurs. Y mettre une lecture de
  base casserait l'aperçu.
- **Les polices Google se chargent par `<link>`**, jamais par `@import` dans
  une feuille : Tailwind inline `tokens.css` au milieu de la feuille compilée,
  et un `@import` qui n'est pas en tête est ignoré. `DefaultFonts` (layout
  racine) charge celles de `brand.ts`, `BrandStyle` celles de l'administration.
  Deux liens par famille surchargée : Google renvoie 400 sur toute requête
  dont une graisse manque, le lien sans graisse sert de filet.
- **Le logo vit en base**, servi par `/api/logo` avec une politique de
  sécurité qui empêche un SVG d'exécuter du script s'il est ouvert
  directement. Aucun service de stockage : un client n'a qu'un Postgres.
- **`pnpm check:brand` tourne avant chaque build** et refuse toute teinte en
  dur hors de `src/brand/` (seule exception : `appearance.ts`, qui a besoin du
  noir et du blanc pour dériver). Une couleur oubliée dans un composant ne
  se voit qu'à la charte sombre du prochain client — trop tard.

- **Trois rôles facultatifs, lus avec repli par le moteur** :
  `--display-transform` (titres en capitales), `--eyebrow` (couleur des
  sur-titres) et `--sidebar` / `--text-on-sidebar` (barre latérale de
  l'administration, qu'un « bouton inversé » clair ferait mal). Une marque qui
  ne les définit pas retrouve le comportement d'origine ; la question du
  formulaire reste en bas-de-casse dans tous les cas. Apparus avec une première
  instance à charte sombre, aux titres en capitales grasses.

## Le contenu est du code

Un poste est un fichier de `src/content/roles/`, validé par zod **au
chargement du module** : une faute de frappe casse le build, pas la
production. Ajouter un poste ne touche jamais au moteur — routes,
questionnaire, entonnoir de l'administration, colonnes de l'export et nom
d'événement Meta en découlent.

- **Un `id` de question ne se renomme pas.** C'est la clé de stockage des
  réponses déjà reçues ; le changer les rend illisibles.
- **`disqualifies` arrête le parcours sur place** (sauf `exitOnDisqualify:
  false`). À ne poser que sur un critère objectif et non négociable.
- **`minScore` vaut 0 par défaut**, donc le score ne fait que trier dans
  l'administration. Le monter rend le tri automatique plus sévère, ce qui
  écarte des gens sans qu'ils le sachent : à faire en connaissance de cause.
- **Une image de partage par poste** est possible (`page.ogImage`, repli sur
  `BRAND.ogImage`) : utile dès que l'image de la marque cite un poste ou une
  rémunération qu'un autre poste ne partage pas.

## Meta

- **Nom d'événement : `hiring_<slug>`**, calculé par `eventNameFor` et nulle
  part ailleurs. Meta plafonne un nom personnalisé à **50 caractères** ; le
  schéma du slug borne donc à 43. Minuscules et tirets seulement, pour ne pas
  créer deux événements qui ne diffèrent que par la casse.
- **Un nom d'événement personnalisé ne s'optimise pas directement.** Il faut
  créer une **conversion personnalisée** dessus dans Events Manager. Et le nom
  n'apparaît qu'après réception d'un premier événement réel — d'où le bouton
  de test des réglages.
- **Version de l'API : `v26.0`** (publiée le 29 juillet 2026). Chaque version
  vit environ deux ans ; à relire quand Meta annonce le remplacement.
- **Le pixel et le token vivent en base**, pas dans l'environnement : Vercel
  fige les variables au build, et « je colle mon pixel et il s'affiche
  partout » exige une lecture en base. L'environnement ne sert que de repli.
- **Le token n'est jamais réaffiché.** Un champ vide dans le formulaire
  conserve la valeur en place — sinon enregistrer le seul pixel l'effacerait.
- **Le code d'événement de test s'applique à TOUS les envois** tant qu'il est
  renseigné, y compris aux vraies candidatures. À vider avant les campagnes.
- **Jamais de donnée sensible dans un événement** : ni l'âge, ni la
  rémunération, ni les réponses. Uniquement l'identité hachée et le slug.

## Le questionnaire

- **Client-seul** (`form-loader.tsx`, `dynamic` avec `ssr: false`). Son état
  initial vit dans `sessionStorage` — le brouillon de quelqu'un qui recharge à
  la question 9. Un rendu serveur produirait l'écran d'accueil, aussitôt
  remplacé : le visiteur croirait avoir tout perdu. C'est pour ça que le
  brouillon est relu dans un initialiseur de `useState` et non dans un effet.
- **Il a son propre layout** (`src/app/(form)/`), sans en-tête ni pied de
  page : une question par écran suppose que l'écran n'appartienne qu'à la
  question. Le pixel y est monté quand même.
- **`100dvh`, pas `100vh`** : sur iOS, `vh` compte la barre d'adresse
  rétractée et le bas de l'écran passe sous le pli.
- **Champs à 16 px minimum** : en dessous, iOS zoome au focus et casse la mise
  en page.
- **Deux régimes d'animation.** Sortie en fondu court (0,16 s), entrée en
  ressort. `AnimatePresence mode="wait"` les enchaîne, donc les durées
  s'additionnent : un ressort mou des deux côtés faisait attendre près d'une
  seconde et demie entre deux questions.
- **La validation lit `answersRef`, jamais l'état `answers`.** Un choix unique
  avance tout seul après 350 ms, donc `advance` part d'un `setTimeout` : la
  fonction capturée date du rendu qui a précédé le clic, où la réponse cochée
  n'existe pas encore. Le formulaire refusait « Choisis une réponse » sur la
  réponse tout juste choisie. L'état `answers` ne sert plus qu'à l'affichage et
  à l'écriture du brouillon ; toute décision passe par le miroir. Y revenir
  ramènerait le bug.

## Vérifier dans un navigateur

L'aperçu (`pnpm preview`) sert tout, base embarquée comprise. Deux pièges du
panneau d'aperçu quand il n'est **pas affiché** :

- `setTimeout` et `requestAnimationFrame` sont **gelés**. Les transitions ne
  progressent qu'à chaque capture d'écran forcée, et l'avance automatique
  d'un choix unique (350 ms) ne se déclenche jamais.
- Les frappes clavier envoyées par l'outil n'atteignent pas toujours la page.

Conséquence pratique : pour dérouler le questionnaire, poser directement le
brouillon dans `sessionStorage` puis recharger, plutôt que de simuler
quatorze écrans. Les promesses, elles, se résolvent normalement — une
soumission complète se teste sans problème.

## Base de données

Trois tables : `visits`, `applications`, `settings`. Les questions ne sont
**pas** des colonnes — les réponses sont un objet JSON indexé par id de
question, donc ajouter une question n'est jamais une migration.

L'aperçu local est un PGlite dans `.preview-db`, servi par un sidecar sur
**`127.0.0.1:5503`** (port volontairement inhabituel, pour ne heurter ni un
Postgres local ni un autre aperçu). La socket n'accepte **qu'une connexion** : arrêter
`pnpm preview` avant de toucher la base à la main ou de relancer
`pnpm preview:setup`, qui **efface** et reconstruit.

Après un `drizzle-kit generate`, la prod se met à jour avec `pnpm db:migrate`.

Deux gardes valent pour tout déploiement, et surtout sur Supabase :

- **Table de migrations dédiée** (`drizzle.__hiring_migrations`, dans
  `scripts/migrate.ts` et `drizzle.config.ts`). Si la base est partagée avec
  une autre application Drizzle, la table par défaut ferait lire à chacune la
  date de la dernière migration de l'autre, et sauter les siennes.
- **RLS activé sans policy sur `applications`, `settings`, `visits`**
  (`drizzle/0001_rls.sql`). Sur Supabase, le schéma public est exposé par
  l'API REST avec la clé anonyme, publique par construction : sans RLS, les
  candidatures se liraient depuis n'importe quel navigateur. L'application se
  connecte avec le rôle postgres, qui contourne RLS. Migration écrite à la main
  (pas de snapshot `0001`) : RLS n'est pas dans le schéma Drizzle,
  `drizzle-kit generate` ne la verra ni ne la contredira.

`scripts/check-db.ts` vérifie la base de production avec l'URL poolée et les
options de l'application : `vercel env pull .env.production.local
--environment production`, `pnpm tsx --env-file=.env.production.local
scripts/check-db.ts`, puis supprimer le fichier.

## Créatives

Les visuels des campagnes de recrutement se génèrent dans `creatives/`
(`generate.py` + Chrome headless) ; le process, les règles Meta de la catégorie
Emploi (aucun chiffre de rémunération, aucun critère qui exclut, pas de bouton)
et la check-list du copy sont dans `creatives/README.md`. Tout le contenu tient
dans le carré central de 1080 px pour que le 9:16 se recadre en 4:5 et 1:1.
La marque du générateur (`BRAND`) se règle à part de `src/brand/` : c'est un
outil de campagne, pas le site.

## Habitudes

- Écrire en français : commentaires, copy, messages de commit.
- Vérifier dans le navigateur avant d'annoncer que quelque chose marche —
  capture ou mesure, pas seulement un build qui passe.
- `pnpm check` vérifie les règles de qualification. Le lancer après toute
  édition d'un fichier de poste.
