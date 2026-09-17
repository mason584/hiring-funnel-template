import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE SCHÉMA — trois tables, rien de plus.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les questions d'un poste ne sont PAS des colonnes : elles vivent dans
 * `src/content/roles/`, et les réponses sont un objet JSON indexé par id de
 * question. Ajouter une question n'est donc jamais une migration.
 */

/**
 * Une visite d'une page publique.
 *
 * Comptée chez nous plutôt que déléguée à un outil tiers : le tableau de bord
 * doit pouvoir afficher « 420 visites, 38 candidatures » sans dépendre d'un
 * compte externe, et sans poser un traceur de plus. Aucun cookie : un
 * rechargement compte pour une visite, exactement comme sur le tunnel VSL.
 */
export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Session du navigateur — relie la visite à la candidature qui suivra. */
    sessionId: text("session_id").notNull(),
    /** Le poste concerné, quand la page en dépend. Null sur l'accueil. */
    roleSlug: text("role_slug"),
    /** Chemin visité, sans la query. */
    path: text("path").notNull(),

    referrer: text("referrer"),
    landingUrl: text("landing_url"),
    /** utm_*, fbclid, gclid relevés à l'arrivée. */
    utm: jsonb("utm").notNull().default({}),
    country: text("country"),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("visits_created_idx").on(t.createdAt),
    index("visits_role_idx").on(t.roleSlug, t.createdAt),
  ]
);

export type VisitRow = typeof visits.$inferSelect;

/**
 * Une candidature.
 *
 * La ligne est créée dès le premier écran validé, bien avant l'envoi : c'est
 * ce qui rend l'entonnoir mesurable et garde un candidat rappelable même s'il
 * abandonne au milieu.
 */
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * Session du navigateur. Sert de clé d'idempotence : sans cet index
     * unique, un double-clic sur « Envoyer » créerait deux candidatures et
     * deux événements Meta.
     */
    sessionId: text("session_id").notNull(),
    roleSlug: text("role_slug").notNull(),

    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    /** Format international strict, normalisé avant écriture. */
    phoneNumber: text("phone_number"),

    /** Toutes les réponses, indexées par id de question du poste. */
    answers: jsonb("answers").notNull().default({}),

    /** Dernier écran atteint — l'id de la question, ou « intro » / « submitted ». */
    stepReached: text("step_reached"),
    /** `partial` · `qualified` · `disqualified`. */
    status: text("status").notNull().default("partial"),
    /** Les ids des questions dont la réponse a éliminé. */
    disqualifiedBy: jsonb("disqualified_by").notNull().default([]),
    /** Score de tri, recalculé côté serveur à chaque enregistrement. */
    score: integer("score").notNull().default(0),

    /** Renseigné une fois l'événement accepté par Meta. */
    metaEventSentAt: timestamp("meta_event_sent_at", { withTimezone: true }),
    /** Trace Meta, ou motif d'échec — pour l'afficher dans l'administration. */
    metaEventDetail: text("meta_event_detail"),

    landingUrl: text("landing_url"),
    utm: jsonb("utm").notNull().default({}),
    /** Cookies Meta relevés par le navigateur, pour l'appariement de la CAPI. */
    fbc: text("fbc"),
    fbp: text("fbp"),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("applications_session_idx").on(t.sessionId),
    index("applications_role_idx").on(t.roleSlug, t.createdAt),
    index("applications_status_idx").on(t.status),
  ]
);

export type ApplicationRow = typeof applications.$inferSelect;

/**
 * Réglages modifiables sans redéploiement.
 *
 * Clé/valeur plutôt que des colonnes : Vercel fige les variables
 * d'environnement au moment du build, et « je colle mon pixel et il s'affiche
 * partout » exige une lecture en base.
 */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SettingRow = typeof settings.$inferSelect;
