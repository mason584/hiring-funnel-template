import { z } from "zod";
import { videoSchema } from "./roles/types";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LA PAGE D'ACCUEIL — l'entreprise, avant les postes.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tout le texte de `/` vit ici. C'est le premier fichier qu'un client
 * remplace, avec `src/brand/brand.ts`.
 */

const companySchema = z.object({
  /** Sur-titre en mono au-dessus du grand titre. */
  eyebrow: z.string().optional(),
  headline: z.string().min(1),
  lede: z.string().min(1),
  /** Vidéo de présentation, facultative. Sans elle, la section disparaît. */
  video: z
    .object({
      title: z.string().min(1),
      note: z.string().optional(),
      source: videoSchema,
    })
    .optional(),
  /** « Pourquoi nous rejoindre » — trois à cinq raisons, pas plus. */
  reasons: z
    .array(z.object({ title: z.string().min(1), body: z.string().min(1) }))
    .default([]),
  /** Chiffres affichés en bandeau. Vide = pas de bandeau. */
  figures: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })).default([]),
  /** Titre de la section des postes. */
  rolesTitle: z.string().min(1),
  rolesLede: z.string().optional(),
  /** Affiché quand aucun poste n'est ouvert. */
  rolesEmpty: z.string().min(1),
});

export const COMPANY = companySchema.parse({
  eyebrow: "Recrutement",

  headline: "On cherche les gens qui vont porter la croissance de Savoire.",

  lede:
    "Savoire accompagne des entreprises high ticket dans leur acquisition et leur vente. On travaille avec des dirigeants qui font déjà des résultats, et on construit les systèmes qui les font passer au palier au-dessus. Pour tenir ce rythme, on recrute des profils qui savent vendre — vraiment.",

  // Pour brancher la vidéo de présentation :
  // video: {
  //   title: "Savoire en trois minutes",
  //   note: "Ce qu'on fait, comment on travaille, et ce qu'on attend de toi.",
  //   source: {
  //     provider: "vidalytics",
  //     embedId: "XXXXXXXXXXXX",
  //     baseUrl: "https://fast.vidalytics.com/embeds/VOTRE_COMPTE/XXXXXXXXXXXX/",
  //   },
  // },

  reasons: [
    {
      title: "Des leads qualifiés, pas du démarchage",
      body: "Les rendez-vous arrivent d'un tunnel qui tourne. Tu ne prospectes pas : tu prends des appels avec des gens qui ont déjà regardé une vidéo de trente minutes et rempli un formulaire de qualification.",
    },
    {
      title: "Une offre qui se vend parce qu'elle marche",
      body: "Nos clients obtiennent des résultats mesurables et le disent. Tu vends avec des preuves, pas avec de la promesse.",
    },
    {
      title: "Une équipe qui forme, pas qui surveille",
      body: "Débriefs d'appels, scripts vivants, retours sur tes enregistrements. Ceux qui progressent ici progressent vite.",
    },
    {
      title: "À distance, résultats seuls",
      body: "On ne compte pas tes heures. On regarde ton taux de closing et la qualité de tes suivis.",
    },
  ],

  figures: [],

  rolesTitle: "Les postes ouverts",
  rolesLede: "Une candidature prend trois minutes. On répond à tout le monde.",
  rolesEmpty:
    "Aucun poste n'est ouvert en ce moment. Reviens dans quelques semaines — l'équipe s'agrandit régulièrement.",
});

export type Company = z.infer<typeof companySchema>;
