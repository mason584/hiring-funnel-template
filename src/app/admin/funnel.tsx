import Link from "next/link";
import { and, count, eq, gte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { applications, visits } from "@/db/schema";
import { getRole, ROLES, type Role } from "@/content/roles";
import { filtersHref, periodeSince, type Filters } from "./filters";

/**
 * L'entonnoir d'un poste.
 *
 * Les étages ne sont pas codés en dur : ce sont les visites, puis chaque
 * question du poste dans l'ordre, puis l'envoi. Ajouter une question au
 * fichier d'un poste ajoute donc un étage — l'entonnoir suit le contenu, il
 * ne le décrit pas de son côté.
 *
 * Largeur d'un étage = les gens qui l'ont AU MOINS atteint. Les points posés
 * dedans = ceux qui se sont arrêtés LÀ. Cliquer un étage filtre la table sur
 * ces personnes.
 */

const W = 640;
const BAND_H = 46;
const GAP = 4;
const TOP = 6;
const MAX_W = 600;
const MIN_W = 140;
const DOT_R = 4;
const DOT_GAP = 12;
const MAX_DOTS = 20;

type Stage = { key: string; label: string; rank: number };

/** Les étages, dérivés du poste. */
export function stagesFor(role: Role): Stage[] {
  return [
    ...role.form.questions.map((q, i) => ({
      key: q.id,
      // Un libellé de question fait une phrase : dans un entonnoir, il faut
      // une étiquette. On garde le début, tronqué proprement.
      label: `${i + 1}. ${shorten(q.label)}`,
      rank: i,
    })),
    { key: "submitted", label: "Candidature envoyée", rank: role.form.questions.length },
  ];
}

function shorten(label: string): string {
  const clean = label.replace(/\s*\?$/, "");
  return clean.length > 30 ? `${clean.slice(0, 29)}…` : clean;
}

export async function FunnelViz({ filters, role }: { filters: Filters; role: Role }) {
  const stages = stagesFor(role);
  const rankOf = new Map(stages.map((s) => [s.key, s.rank]));
  const since = periodeSince(filters);

  let rows: { stepReached: string | null }[] = [];
  let visitCount = 0;

  try {
    const where: SQL[] = [eq(applications.roleSlug, role.slug)];
    if (since) where.push(gte(applications.createdAt, since));

    const visitWhere: SQL[] = [eq(visits.roleSlug, role.slug)];
    if (since) visitWhere.push(gte(visits.createdAt, since));

    const [applicationRows, visitRows] = await Promise.all([
      db
        .select({ stepReached: applications.stepReached })
        .from(applications)
        .where(and(...where)),
      db
        .select({ total: count() })
        .from(visits)
        .where(and(...visitWhere, sql`${visits.path} like ${`/postes/${role.slug}%`}`)),
    ]);
    rows = applicationRows;
    visitCount = visitRows[0]?.total ?? 0;
  } catch (error) {
    console.error("Entonnoir illisible", error);
    return null;
  }

  const ranks = rows.map((r) => rankOf.get(r.stepReached ?? "") ?? -1);
  const reached = stages.map((s) => ranks.filter((r) => r >= s.rank).length);
  const parked = stages.map((s) => ranks.filter((r) => r === s.rank).length);

  // L'échelle se cale sur les visites quand il y en a : sans ça, le premier
  // étage occupe toute la largeur et l'entonnoir n'a plus de pente.
  const maxCount = Math.max(1, visitCount, ...reached);
  const height = TOP + (stages.length + 1) * (BAND_H + GAP);

  const widths = [visitCount, ...reached].map(
    (c) => MIN_W + ((MAX_W - MIN_W) * c) / maxCount
  );
  const bands = [
    { key: "__visites", label: "Visites de la page", count: visitCount, parked: 0, clickable: false },
    ...stages.map((s, i) => ({
      key: s.key,
      label: s.label,
      count: reached[i],
      parked: parked[i],
      clickable: true,
    })),
  ];

  return (
    <section className="mt-8 rounded-lg border border-[var(--border-soft)] bg-[var(--panel)] p-6">
      <h2 className="font-display text-[24px]">Entonnoir — {role.title}</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Un point = une personne arrêtée à cette étape. Clique un étage pour voir qui s&apos;y
        trouve ; le pourcentage se lit contre la marche précédente.
      </p>

      <svg
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label={`Entonnoir du poste ${role.title}`}
        className="mx-auto mt-5 block w-full max-w-2xl"
      >
        <defs>
          <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--panel-accent)" />
            <stop offset="100%" stopColor="var(--panel)" />
          </linearGradient>
        </defs>

        {bands.map((band, i) => {
          const y = TOP + i * (BAND_H + GAP);
          const topW = widths[i];
          const botW = i + 1 < widths.length ? widths[i + 1] : widths[i] * 0.9;
          const cx = W / 2;
          const path = [
            `M ${cx - topW / 2},${y}`,
            `L ${cx + topW / 2},${y}`,
            `L ${cx + botW / 2},${y + BAND_H}`,
            `L ${cx - botW / 2},${y + BAND_H}`,
            "Z",
          ].join(" ");

          const active = filters.etape === band.key;
          const href = filtersHref("/admin/candidatures", {
            ...filters,
            poste: role.slug,
            etape: active ? null : band.key,
            page: 1,
          });

          const prev = i > 0 ? bands[i - 1].count : band.count;
          const pct = i > 0 && prev > 0 ? Math.round((band.count / prev) * 100) : null;

          const dots = Math.min(band.parked, MAX_DOTS);
          const perRow = Math.max(6, Math.floor((Math.min(topW, botW) * 0.8) / DOT_GAP));

          const shape = (
            <>
              <path
                d={path}
                fill={active ? "var(--panel-accent)" : "url(#band)"}
                stroke={active ? "var(--accent)" : "var(--border-soft)"}
                strokeWidth={active ? 1.5 : 1}
              />
              <text
                x={cx}
                y={y + 18}
                textAnchor="middle"
                fontSize={11.5}
                fill="var(--text)"
                fontWeight={active ? 600 : 400}
              >
                {band.label} — {band.count}
              </text>
              {pct !== null && (
                <text
                  x={W - 4}
                  y={y + BAND_H / 2 + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--text-muted)"
                >
                  {pct} %
                </text>
              )}
              {Array.from({ length: dots }, (_, j) => {
                const row = Math.floor(j / perRow);
                const inRow = Math.min(dots - row * perRow, perRow);
                const col = j % perRow;
                const x = cx - ((inRow - 1) * DOT_GAP) / 2 + col * DOT_GAP;
                return (
                  <circle
                    key={j}
                    cx={x}
                    cy={y + 32 + row * 10}
                    r={DOT_R}
                    fill="var(--accent)"
                    opacity={0.85}
                  />
                );
              })}
              {band.parked > MAX_DOTS && (
                <text
                  x={cx + ((perRow - 1) * DOT_GAP) / 2 + 12}
                  y={y + 36}
                  fontSize={10}
                  fill="var(--text-muted)"
                >
                  +{band.parked - MAX_DOTS}
                </text>
              )}
            </>
          );

          // Les visites ne sont pas une étape de candidature : rien à filtrer.
          return band.clickable ? (
            <Link key={band.key} href={href} className="cursor-pointer">
              {shape}
            </Link>
          ) : (
            <g key={band.key}>{shape}</g>
          );
        })}
      </svg>
    </section>
  );
}

/** L'entonnoir de chaque poste, ou du seul poste filtré. */
export function funnelRoles(filters: Filters): Role[] {
  const one = filters.poste ? getRole(filters.poste) : undefined;
  return one ? [one] : ROLES;
}
