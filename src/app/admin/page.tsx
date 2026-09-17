import Link from "next/link";
import { and, count, eq, gte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { applications, visits } from "@/db/schema";
import { ROLES } from "@/content/roles";
import { requireAdmin } from "@/lib/admin";
import { FunnelViz, funnelRoles } from "./funnel";
import {
  PERIODES,
  chipClass,
  filtersHref,
  formatDate,
  parseFilters,
  periodeSince,
  STATUT_LABELS,
  type Filters,
} from "./filters";

/**
 * Le tableau de bord : combien de gens voient les annonces, combien
 * candidatent, combien sont retenus, et où les autres décrochent.
 */
export const dynamic = "force-dynamic";

type Totals = {
  visites: number;
  demarrees: number;
  envoyees: number;
  retenues: number;
};

async function totals(filters: Filters): Promise<Totals> {
  const since = periodeSince(filters);

  const appWhere: SQL[] = [];
  const visitWhere: SQL[] = [];
  if (since) {
    appWhere.push(gte(applications.createdAt, since));
    visitWhere.push(gte(visits.createdAt, since));
  }
  if (filters.poste) {
    appWhere.push(eq(applications.roleSlug, filters.poste));
    visitWhere.push(eq(visits.roleSlug, filters.poste));
  }

  const where = appWhere.length > 0 ? and(...appWhere) : undefined;

  const [[v], [d], [e], [r]] = await Promise.all([
    db
      .select({ total: count() })
      .from(visits)
      .where(visitWhere.length > 0 ? and(...visitWhere) : undefined),
    db.select({ total: count() }).from(applications).where(where),
    db
      .select({ total: count() })
      .from(applications)
      .where(and(...appWhere, sql`${applications.submittedAt} is not null`)),
    db
      .select({ total: count() })
      .from(applications)
      .where(and(...appWhere, eq(applications.status, "qualified"))),
  ]);

  return {
    visites: v?.total ?? 0,
    demarrees: d?.total ?? 0,
    envoyees: e?.total ?? 0,
    retenues: r?.total ?? 0,
  };
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel)] p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 font-display text-[32px] leading-none tabular-nums">{value}</p>
      {note && <p className="mt-2 text-xs text-[var(--text-muted)]">{note}</p>}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const filters = parseFilters(await searchParams);

  let t: Totals;
  let recent: (typeof applications.$inferSelect)[] = [];
  try {
    const since = periodeSince(filters);
    const conds: SQL[] = [];
    if (since) conds.push(gte(applications.createdAt, since));
    if (filters.poste) conds.push(eq(applications.roleSlug, filters.poste));

    [t, recent] = await Promise.all([
      totals(filters),
      db
        .select()
        .from(applications)
        .where(conds.length > 0 ? and(...conds) : undefined)
        .orderBy(sql`${applications.updatedAt} desc`)
        .limit(10),
    ]);
  } catch (error) {
    console.error("Tableau de bord illisible", error);
    return (
      <div className="max-w-6xl">
        <h1 className="font-display text-[32px]">Tableau de bord</h1>
        <p className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] p-6 text-sm text-[var(--text-muted)]">
          La base de données est injoignable. Vérifie <code>DATABASE_URL</code>, puis recharge.
        </p>
      </div>
    );
  }

  // Ce qu'on regarde vraiment : la part des visiteurs qui deviennent des
  // candidats retenus. Les taux intermédiaires se lisent dans l'entonnoir.
  const tauxRetenu = t.envoyees > 0 ? Math.round((t.retenues / t.envoyees) * 100) : null;
  const tauxCandidature = t.visites > 0 ? Math.round((t.demarrees / t.visites) * 100) : null;

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-[32px]">Tableau de bord</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Le trafic et les candidatures sur la période choisie. La livraison des événements de
        conversion se vérifie dans Meta Events Manager.
      </p>

      {/* ── Filtres ────────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {PERIODES.map((p) => (
          <Link
            key={p.value}
            href={filtersHref("/admin", { ...filters, periode: p.value, page: 1 })}
            className={chipClass(filters.periode === p.value)}
          >
            {p.label}
          </Link>
        ))}

        {ROLES.length > 1 && (
          <>
            <span className="mx-1 h-4 w-px bg-[var(--border-soft)]" aria-hidden />
            <Link
              href={filtersHref("/admin", { ...filters, poste: null, page: 1 })}
              className={chipClass(filters.poste === null)}
            >
              Tous les postes
            </Link>
            {ROLES.map((role) => (
              <Link
                key={role.slug}
                href={filtersHref("/admin", { ...filters, poste: role.slug, page: 1 })}
                className={chipClass(filters.poste === role.slug)}
              >
                {role.title}
              </Link>
            ))}
          </>
        )}
      </div>

      {/* ── Chiffres ───────────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Visites"
          value={t.visites.toLocaleString("fr-FR")}
          note="Chargements des pages publiques"
        />
        <Tile
          label="Candidatures démarrées"
          value={t.demarrees.toLocaleString("fr-FR")}
          note={tauxCandidature !== null ? `${tauxCandidature} % des visites` : undefined}
        />
        <Tile
          label="Candidatures envoyées"
          value={t.envoyees.toLocaleString("fr-FR")}
          note="Parcours menés au bout ou arrêtés par une réponse éliminatoire"
        />
        <Tile
          label="Retenues"
          value={t.retenues.toLocaleString("fr-FR")}
          note={tauxRetenu !== null ? `${tauxRetenu} % des envoyées` : undefined}
        />
      </div>

      {/* ── Entonnoirs ─────────────────────────────────────────────────── */}
      {funnelRoles(filters).map((role) => (
        <FunnelViz key={role.slug} filters={filters} role={role} />
      ))}

      {/* ── Dernières candidatures ─────────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-[24px]">Dernières candidatures</h2>
          <Link
            href={filtersHref("/admin/candidatures", filters)}
            className="text-sm text-[var(--link)]"
          >
            Tout voir →
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] px-6 py-10 text-center text-sm text-[var(--text-muted)]">
            Aucune candidature sur cette période. La première ligne apparaît dès qu&apos;un
            visiteur commence le questionnaire.
          </p>
        ) : (
          <ul className="mt-4 flex list-none flex-col gap-2 p-0">
            {recent.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/admin/candidatures/${row.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--panel)] px-4 py-3 no-underline transition-colors hover:border-[var(--accent)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="text-sm font-medium">
                      {[row.firstName, row.lastName].filter(Boolean).join(" ") || "Anonyme"}
                    </span>
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      {row.email ?? "—"}
                    </span>
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {STATUT_LABELS[row.status] ?? row.status} · {formatDate(row.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
