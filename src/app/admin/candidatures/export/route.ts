import { db } from "@/db";
import { applications } from "@/db/schema";
import { ROLES, getRole } from "@/content/roles";
import { answerToText } from "@/lib/answers";
import { isSignedIn } from "@/lib/auth";
import { filtersOrder, filtersWhere, parseFilters } from "../../filters";

/**
 * Export CSV des candidatures, avec exactement les filtres de la table : ce
 * qu'on voit à l'écran est ce qui part dans le fichier.
 *
 * Format pensé pour Excel en français : séparateur « ; », BOM UTF-8 pour que
 * les accents s'affichent, dates en heure de Paris.
 */
export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

function cell(value: string | null | undefined): string {
  const v = (value ?? "").replace(/\r?\n/g, " ").trim();
  return /[;"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(request: Request) {
  // Un export est la sortie la plus sensible de l'application : le garde est
  // ici, dans la route elle-même, et pas seulement dans le middleware.
  if (!(await isSignedIn())) {
    return new Response("Non autorisé", { status: 401 });
  }

  const url = new URL(request.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams));

  const rows = await db
    .select()
    .from(applications)
    .where(filtersWhere(filters))
    .orderBy(...filtersOrder(filters));

  /*
   * Les colonnes de réponses dépendent du poste. Filtré sur un poste, on
   * déplie ses questions ; sur plusieurs, on prend l'union — un fichier avec
   * des colonnes vides reste lisible, un fichier où deux questions
   * différentes partagent une colonne ne l'est pas.
   */
  const roles = filters.poste ? [getRole(filters.poste)].filter(Boolean) : ROLES;
  const questions = roles.flatMap((role) =>
    role!.form.questions.map((q) => ({ roleSlug: role!.slug, question: q }))
  );

  const header = [
    "Arrivé le",
    "Dernière action",
    "Envoyée le",
    "Poste",
    "Prénom",
    "Nom",
    "Email",
    "Téléphone",
    "Statut",
    "Score",
    "Écartée sur",
    "Dernière étape",
    ...questions.map(({ question, roleSlug }) =>
      roles.length > 1 ? `[${roleSlug}] ${question.label}` : question.label
    ),
    "Événement Meta envoyé le",
    "Trace Meta",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "URL d'arrivée",
  ];

  const lines = rows.map((row) => {
    const answers = (row.answers ?? {}) as Record<string, never>;
    const utm = (row.utm ?? {}) as Record<string, string>;
    const faulty = (row.disqualifiedBy ?? []) as string[];

    return [
      DATE_FMT.format(row.createdAt),
      DATE_FMT.format(row.updatedAt),
      row.submittedAt ? DATE_FMT.format(row.submittedAt) : "",
      getRole(row.roleSlug)?.title ?? row.roleSlug,
      row.firstName,
      row.lastName,
      row.email,
      row.phoneNumber,
      row.status,
      String(row.score),
      faulty.join(" · "),
      row.stepReached,
      ...questions.map(({ roleSlug, question }) =>
        // Une colonne d'un autre poste reste vide plutôt que de recevoir la
        // réponse d'une question homonyme.
        row.roleSlug === roleSlug ? answerToText(question, answers[question.id]) : ""
      ),
      row.metaEventSentAt ? DATE_FMT.format(row.metaEventSentAt) : "",
      row.metaEventDetail,
      utm.utm_source,
      utm.utm_medium,
      utm.utm_campaign,
      row.landingUrl,
    ]
      .map(cell)
      .join(";");
  });

  const csv = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="candidatures-${today}.csv"`,
    },
  });
}
