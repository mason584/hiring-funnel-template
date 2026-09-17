import Link from "next/link";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { applications, type ApplicationRow } from "@/db/schema";
import { ROLES, getRole } from "@/content/roles";
import { answerToText } from "@/lib/answers";
import { requireAdmin } from "@/lib/admin";
import { stagesFor } from "../funnel";
import {
  PAGE_SIZE,
  PERIODES,
  STATUTS,
  STATUT_LABELS,
  chipClass,
  filtersHref,
  filtersOrder,
  filtersQuery,
  filtersWhere,
  formatDate,
  parseFilters,
  utmSummary,
  type Filters,
} from "../filters";

/**
 * La table des candidatures.
 *
 * Une ligne existe dès le premier écran validé : la colonne « étape » dit où
 * chacun a décroché, et c'est toute la valeur de cette vue. Chaque ligne ouvre
 * la fiche complète.
 */
export const dynamic = "force-dynamic";

/** Le libellé de l'écran atteint — les ids de question ne parlent qu'au code. */
function stepLabel(row: ApplicationRow): string {
  if (row.stepReached === "submitted") return "Envoyée";
  const role = getRole(row.roleSlug);
  if (!role) return row.stepReached ?? "—";
  const stage = stagesFor(role).find((s) => s.key === row.stepReached);
  return stage?.label ?? row.stepReached ?? "—";
}

/** La valeur d'une réponse, pour une colonne de synthèse. */
function answerColumn(row: ApplicationRow, questionId: string): string {
  const role = getRole(row.roleSlug);
  const question = role?.form.questions.find((q) => q.id === questionId);
  if (!question) return "—";
  const answers = (row.answers ?? {}) as Record<string, never>;
  return answerToText(question, answers[questionId]) || "—";
}

function Pagination({ filters, total }: { filters: Filters; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pages);

  return (
    <div className="mt-3 flex items-center gap-3 text-xs text-[var(--text-muted)]">
      <span>
        {total} candidature{total > 1 ? "s" : ""} · page {page} / {pages}
      </span>
      <span className="ml-auto flex gap-2">
        {page > 1 && (
          <Link
            href={filtersHref("/admin/candidatures", { ...filters, page: page - 1 })}
            className={chipClass(false)}
          >
            ← Précédentes
          </Link>
        )}
        {page < pages && (
          <Link
            href={filtersHref("/admin/candidatures", { ...filters, page: page + 1 })}
            className={chipClass(false)}
          >
            Suivantes →
          </Link>
        )}
      </span>
    </div>
  );
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const filters = parseFilters(await searchParams);

  let rows: ApplicationRow[] = [];
  let total = 0;
  try {
    const where = filtersWhere(filters);
    const [list, [totals]] = await Promise.all([
      db
        .select()
        .from(applications)
        .where(where)
        .orderBy(...filtersOrder(filters))
        .limit(PAGE_SIZE)
        .offset((filters.page - 1) * PAGE_SIZE),
      db.select({ total: count() }).from(applications).where(where),
    ]);
    rows = list;
    total = totals?.total ?? 0;
  } catch (error) {
    console.error("Candidatures illisibles", error);
    return (
      <div className="max-w-6xl">
        <h1 className="font-display text-[32px]">Candidatures</h1>
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Impossible de lire les candidatures pour le moment.
        </p>
      </div>
    );
  }

  const etapeLabel = filters.etape
    ? filters.etape === "submitted"
      ? "Candidature envoyée"
      : (filters.poste ? getRole(filters.poste) : undefined)?.form.questions.find(
          (q) => q.id === filters.etape
        )?.label
    : null;

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-[32px]">Candidatures</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Une ligne par candidat, dès le premier écran validé. Clique une ligne pour ouvrir la fiche
        complète avec toutes les réponses.
      </p>

      {/* ── Filtres ────────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {PERIODES.map((p) => (
          <Link
            key={p.value}
            href={filtersHref("/admin/candidatures", { ...filters, periode: p.value, page: 1 })}
            className={chipClass(filters.periode === p.value)}
          >
            {p.label}
          </Link>
        ))}

        <span className="mx-1 h-4 w-px bg-[var(--border-soft)]" aria-hidden />

        <Link
          href={filtersHref("/admin/candidatures", { ...filters, statut: null, page: 1 })}
          className={chipClass(filters.statut === null)}
        >
          Tous
        </Link>
        {STATUTS.map((statut) => (
          <Link
            key={statut}
            href={filtersHref("/admin/candidatures", { ...filters, statut, page: 1 })}
            className={chipClass(filters.statut === statut)}
          >
            {STATUT_LABELS[statut]}
          </Link>
        ))}

        {ROLES.length > 1 && (
          <>
            <span className="mx-1 h-4 w-px bg-[var(--border-soft)]" aria-hidden />
            {ROLES.map((role) => (
              <Link
                key={role.slug}
                href={filtersHref("/admin/candidatures", {
                  ...filters,
                  poste: filters.poste === role.slug ? null : role.slug,
                  page: 1,
                })}
                className={chipClass(filters.poste === role.slug)}
              >
                {role.title}
              </Link>
            ))}
          </>
        )}

        <Link
          href={filtersHref("/admin/candidatures", {
            ...filters,
            tri: filters.tri === "score" ? "recent" : "score",
          })}
          className={chipClass(filters.tri === "score")}
        >
          {filters.tri === "score" ? "Meilleur score d'abord ↓" : "Trier par score"}
        </Link>

        {etapeLabel && (
          <Link
            href={filtersHref("/admin/candidatures", { ...filters, etape: null, page: 1 })}
            className={chipClass(true)}
            title="Enlever le filtre d'étape"
          >
            Arrêtés à : {etapeLabel} ✕
          </Link>
        )}

        <a
          href={`/admin/candidatures/export${filtersQuery({ ...filters, page: 1 })}`}
          download
          className="ml-auto inline-flex min-h-9 items-center rounded-md bg-[var(--inverse)] px-4 text-xs text-[var(--text-on-inverse)] no-underline"
        >
          Exporter CSV
        </a>
      </div>

      {/* ── Recherche ──────────────────────────────────────────────────── */}
      <form method="get" className="mt-3 flex flex-wrap gap-2">
        {/* Les autres filtres survivent à la recherche : sans ces champs, une
            recherche remettrait la période et le poste à zéro. */}
        {filters.periode !== "30" && <input type="hidden" name="periode" value={filters.periode} />}
        {filters.poste && <input type="hidden" name="poste" value={filters.poste} />}
        {filters.statut && <input type="hidden" name="statut" value={filters.statut} />}
        {filters.tri !== "recent" && <input type="hidden" name="tri" value={filters.tri} />}
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Chercher un nom ou un email"
          className="min-h-9 w-64 rounded-md border border-[var(--border-input)] bg-[var(--panel)] px-3 text-sm"
        />
        <button
          type="submit"
          className="inline-flex min-h-9 items-center rounded-md border border-[var(--border-input)] px-4 text-xs"
        >
          Chercher
        </button>
        {filters.q && (
          <Link
            href={filtersHref("/admin/candidatures", { ...filters, q: "", page: 1 })}
            className={chipClass(false)}
          >
            Effacer « {filters.q} »
          </Link>
        )}
      </form>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-[var(--border-strong)] px-6 py-10 text-center text-sm text-[var(--text-muted)]">
          Aucune candidature ne correspond à ces filtres.
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border-soft)] bg-[var(--panel)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-medium">Quand</th>
                  <th className="px-4 py-3 font-medium">Qui</th>
                  {ROLES.length > 1 && <th className="px-4 py-3 font-medium">Poste</th>}
                  <th className="px-4 py-3 font-medium">Dispo</th>
                  <th className="px-4 py-3 font-medium">Rythme</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Étape</th>
                  <th className="px-4 py-3 font-medium">Meta</th>
                  <th className="px-4 py-3 font-medium">Provenance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="relative border-b border-[var(--border-soft)] align-top transition-colors last:border-0 hover:bg-[var(--panel-accent)]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[var(--text-muted)]">
                      {formatDate(row.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {/* Le lien s'étire sur toute la ligne : cliquer n'importe où ouvre la fiche. */}
                      <Link
                        href={`/admin/candidatures/${row.id}`}
                        className="font-medium no-underline after:absolute after:inset-0 after:content-['']"
                      >
                        {[row.firstName, row.lastName].filter(Boolean).join(" ") || "Anonyme"}
                      </Link>
                      <div className="text-xs text-[var(--text-muted)]">
                        {row.email ?? "—"}
                        {row.phoneNumber ? ` · ${row.phoneNumber}` : ""}
                      </div>
                    </td>
                    {ROLES.length > 1 && (
                      <td className="whitespace-nowrap px-4 py-3">
                        {getRole(row.roleSlug)?.title ?? row.roleSlug}
                      </td>
                    )}
                    <td className="px-4 py-3">{answerColumn(row, "availability")}</td>
                    <td className="px-4 py-3">{answerColumn(row, "frequency")}</td>
                    <td className="px-4 py-3 tabular-nums">{row.score}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {row.status === "qualified" ? (
                        <span className="rounded bg-[var(--ok-soft)] px-1.5 py-0.5 text-xs text-[var(--ok)]">
                          Retenue
                        </span>
                      ) : row.status === "disqualified" ? (
                        <span className="rounded bg-[var(--warn-bg)] px-1.5 py-0.5 text-xs text-[var(--warn-text)]">
                          Non retenue
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">En cours</span>
                      )}
                    </td>
                    {/* Un libellé de question fait une phrase : dans une
                        colonne étroite, il se tronque et se lit au survol. */}
                    <td
                      className="max-w-40 truncate px-4 py-3 text-xs text-[var(--text-muted)]"
                      title={stepLabel(row)}
                    >
                      {stepLabel(row)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {row.metaEventSentAt ? (
                        <span title={row.metaEventDetail ?? ""}>
                          ✓ {formatDate(row.metaEventSentAt)}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td
                      className="max-w-56 truncate px-4 py-3 text-xs text-[var(--text-muted)]"
                      title={row.landingUrl ?? ""}
                    >
                      {utmSummary(row.utm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination filters={filters} total={total} />
        </>
      )}
    </div>
  );
}
