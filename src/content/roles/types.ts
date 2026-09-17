import { z } from "zod";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LA FORME D'UN POSTE — le contrat entre le contenu et le moteur.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un poste, c'est un fichier dans `src/content/roles/`. Il porte sa page
 * publique, son questionnaire, ses règles de qualification et ses deux textes
 * de sortie. Aucun code du moteur ne connaît « closer » : ajouter un poste
 * n'est jamais une modification du moteur.
 *
 * Les schémas zod ci-dessous sont vérifiés **au chargement du module**
 * (`roles/index.ts`) : une faute de frappe dans un fichier de contenu casse
 * le build, pas la production.
 */

/* ── Questions ──────────────────────────────────────────────────────────── */

/**
 * `name` et `phone` rendent deux champs sur un même écran ; les autres, un.
 * Le type décide du rendu, du clavier et de la validation — le contenu n'a
 * jamais à décrire une interface.
 */
export const questionKindSchema = z.enum([
  "name", // prénom + nom
  "phone", // indicatif + numéro
  "email",
  "single", // un choix, avance toute seule
  "multi", // plusieurs choix, bouton de validation
  "short", // une ligne
  "long", // paragraphe
]);
export type QuestionKind = z.infer<typeof questionKindSchema>;

export const optionSchema = z.object({
  /** Ce que lit le candidat, et ce qui est stocké tel quel. */
  label: z.string().min(1),
  /**
   * Cette réponse élimine. Par défaut le parcours s'arrête là
   * (voir `exitOnDisqualify` sur la question).
   */
  disqualifies: z.boolean().optional(),
  /** Points ajoutés au score de tri. Jamais éliminatoire à lui seul. */
  score: z.number().int().optional(),
  /** Champ de précision qui s'ouvre sous l'option choisie — « Laquelle ? ». */
  followUp: z
    .object({
      label: z.string().min(1),
      placeholder: z.string().optional(),
      multiline: z.boolean().optional(),
    })
    .optional(),
});
export type Option = z.infer<typeof optionSchema>;

export const questionSchema = z
  .object({
    /** Clé de stockage de la réponse. Stable : la renommer perd l'historique. */
    id: z
      .string()
      .regex(/^[a-z][a-z0-9_]*$/, "id de question : minuscules, chiffres et _"),
    kind: questionKindSchema,
    /** La question posée, telle quelle. */
    label: z.string().min(1),
    /** Précision sous le libellé — l'exemple, l'unité, le cadrage. */
    help: z.string().optional(),
    placeholder: z.string().optional(),
    required: z.boolean().default(true),

    /** `single` et `multi` uniquement. */
    options: z.array(optionSchema).optional(),
    /** `multi` : bornes du nombre de cases cochées. */
    min: z.number().int().positive().optional(),
    max: z.number().int().positive().optional(),

    /** `short` et `long` : longueur minimale acceptée. */
    minLength: z.number().int().nonnegative().optional(),

    /**
     * Une réponse éliminatoire arrête le parcours ici (défaut). Le passer à
     * `false` laisse le candidat finir : utile quand mentir est facile et
     * qu'on préfère juger sur l'ensemble.
     */
    exitOnDisqualify: z.boolean().default(true),
  })
  .refine(
    (q) => !["single", "multi"].includes(q.kind) || (q.options?.length ?? 0) >= 2,
    { message: "une question à choix demande au moins deux options" }
  )
  .refine((q) => !["short", "long"].includes(q.kind) || q.minLength !== undefined, {
    message: "une question ouverte doit fixer minLength",
  });
export type Question = z.infer<typeof questionSchema>;

/* ── Page publique du poste ─────────────────────────────────────────────── */

export const videoSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("vidalytics"),
    embedId: z.string().min(1),
    /** Base de l'embed, barre oblique finale comprise. */
    baseUrl: z.string().url(),
  }),
  z.object({ provider: z.literal("youtube"), id: z.string().min(1) }),
  z.object({ provider: z.literal("vimeo"), id: z.string().min(1) }),
  z.object({ provider: z.literal("file"), src: z.string().min(1), poster: z.string().optional() }),
]);
export type Video = z.infer<typeof videoSchema>;

export const rolePageSchema = z.object({
  /** Le titre de la page — la promesse du poste. */
  headline: z.string().min(1),
  /** Deux ou trois phrases sous le titre. */
  lede: z.string().min(1),
  /** Étiquettes de l'en-tête : « À distance », « Freelance », « Temps plein ». */
  tags: z.array(z.string()).default([]),
  video: videoSchema.optional(),
  /**
   * Image de partage propre au poste (1200 × 630, chemin sous `public/`).
   * Sans elle, la fiche partage l'image de la marque (`BRAND.ogImage`).
   */
  ogImage: z.string().min(1).optional(),
  /** Blocs de la fiche. L'ordre est celui du tableau. */
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        /** Paragraphes, ou puces si `bullets` est vrai. */
        body: z.array(z.string().min(1)).min(1),
        bullets: z.boolean().optional(),
      })
    )
    .min(1),
  /** Le texte du bouton qui ouvre le questionnaire. */
  cta: z.string().min(1),
  /** Réassurance sous le bouton — « 3 minutes, 14 questions ». */
  ctaNote: z.string().optional(),
});
export type RolePage = z.infer<typeof rolePageSchema>;

/* ── Textes de sortie ───────────────────────────────────────────────────── */

export const outcomeSchema = z.object({
  title: z.string().min(1),
  /** Paragraphes. `{prenom}` y est remplacé par le prénom du candidat. */
  body: z.array(z.string().min(1)).min(1),
  /** Les prochaines étapes, en liste numérotée. */
  steps: z.array(z.string().min(1)).optional(),
  cta: z.object({ label: z.string().min(1), url: z.string().min(1) }).optional(),
});
export type Outcome = z.infer<typeof outcomeSchema>;

/* ── Le poste ───────────────────────────────────────────────────────────── */

/**
 * Le slug fait trois choses à la fois : l'URL (`/postes/closer`), la clé de
 * stockage, et le nom de l'événement Meta (`hiring_closer`). Meta plafonne un
 * nom d'événement personnalisé à 50 caractères ; avec le préfixe, il reste 43
 * caractères au slug. Minuscules et tirets seulement, pour ne pas créer deux
 * événements qui ne diffèrent que par la casse dans Events Manager.
 */
export const roleSlugSchema = z
  .string()
  .min(1)
  .max(43, "slug trop long : le nom d'événement Meta dépasserait 50 caractères")
  .regex(/^[a-z][a-z0-9-]*$/, "slug : minuscules, chiffres et tirets");

export const roleSchema = z.object({
  slug: roleSlugSchema,
  /** `open` accepte les candidatures ; `closed` affiche la fiche sans le bouton. */
  status: z.enum(["open", "closed"]).default("open"),
  /** Nom du poste, tel qu'il apparaît dans les listes et l'administration. */
  title: z.string().min(1),
  /** Une ligne pour la carte de l'accueil. */
  teaser: z.string().min(1),

  page: rolePageSchema,

  form: z.object({
    /** Écran d'accueil du questionnaire, avant la première question. */
    intro: z.object({
      title: z.string().min(1),
      body: z.string().min(1),
      cta: z.string().min(1),
    }),
    questions: z.array(questionSchema).min(1),
    /**
     * Score minimal pour être retenu. À 0, seules les réponses éliminatoires
     * tranchent — le score ne sert alors qu'à trier dans l'administration.
     */
    minScore: z.number().int().nonnegative().default(0),
  }),

  outcomes: z.object({
    qualified: outcomeSchema,
    disqualified: outcomeSchema,
  }),
});
export type Role = z.infer<typeof roleSchema>;

/** Le nom d'événement Meta d'un poste. Un seul endroit le calcule. */
export function eventNameFor(slug: string): string {
  return `hiring_${slug.replace(/-/g, "_")}`;
}
