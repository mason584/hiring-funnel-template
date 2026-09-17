import Link from "next/link";
import { COMPANY } from "@/content/company";
import { openRoles } from "@/content/roles";
import { VideoPlayer } from "@/components/video";
import { VisitPing } from "@/components/visit-ping";
import { ButtonLink } from "@/components/ui/primitives";

/**
 * L'accueil : l'entreprise, puis les postes.
 *
 * Tout le texte vient de `src/content/company.ts`. Cette page ne décide de
 * rien — elle met en page, et affiche ce que le catalogue contient.
 */
export const dynamic = "force-dynamic";

export default function HomePage() {
  const roles = openRoles();

  return (
    <>
      <VisitPing path="/" />

      {/* ── Ouverture ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 pt-16 sm:px-10 sm:pt-24">
        {COMPANY.eyebrow && <p className="eyebrow mb-5">{COMPANY.eyebrow}</p>}
        <h1 className="font-display text-[clamp(34px,5.5vw,58px)] leading-[1.06]">
          {COMPANY.headline}
        </h1>
        <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-[var(--text-secondary)]">
          {COMPANY.lede}
        </p>

        {roles.length > 0 && (
          <div className="mt-9">
            <ButtonLink href="#postes">Voir les postes ouverts</ButtonLink>
          </div>
        )}
      </section>

      {/* ── Chiffres ───────────────────────────────────────────────────── */}
      {COMPANY.figures.length > 0 && (
        <section className="mx-auto mt-16 max-w-5xl px-5 sm:px-10">
          <dl className="grid grid-cols-2 gap-8 border-y border-[var(--border-soft)] py-8 sm:grid-cols-4">
            {COMPANY.figures.map((f) => (
              <div key={f.label}>
                <dt className="font-display text-[32px] leading-none">{f.value}</dt>
                <dd className="mt-2 text-sm text-[var(--text-muted)]">{f.label}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ── Vidéo ──────────────────────────────────────────────────────── */}
      {COMPANY.video && (
        <section className="mx-auto mt-20 max-w-3xl px-5 sm:px-10">
          <h2 className="font-display text-[clamp(24px,3vw,34px)]">{COMPANY.video.title}</h2>
          {COMPANY.video.note && (
            <p className="mt-2 max-w-xl text-[var(--text-secondary)]">{COMPANY.video.note}</p>
          )}
          <div className="mt-6">
            <VideoPlayer source={COMPANY.video.source} />
          </div>
        </section>
      )}

      {/* ── Pourquoi nous rejoindre ────────────────────────────────────── */}
      {COMPANY.reasons.length > 0 && (
        <section className="mx-auto mt-24 max-w-5xl px-5 sm:px-10">
          <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {COMPANY.reasons.map((reason, i) => (
              <div key={reason.title}>
                <span className="font-display text-[26px] text-[var(--tan)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-display text-[22px]">{reason.title}</h3>
                <p className="mt-2 text-[var(--text-secondary)]">{reason.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Les postes ─────────────────────────────────────────────────── */}
      <section id="postes" className="mx-auto mt-24 max-w-5xl scroll-mt-8 px-5 sm:px-10">
        <h2 className="font-display text-[clamp(26px,3.4vw,38px)]">{COMPANY.rolesTitle}</h2>
        {COMPANY.rolesLede && (
          <p className="mt-2 text-[var(--text-secondary)]">{COMPANY.rolesLede}</p>
        )}

        {roles.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-[var(--border-strong)] px-6 py-10 text-center text-[var(--text-muted)]">
            {COMPANY.rolesEmpty}
          </p>
        ) : (
          <ul className="mt-8 grid list-none gap-4 p-0">
            {roles.map((role) => (
              <li key={role.slug}>
                <Link
                  href={`/postes/${role.slug}`}
                  className="group flex flex-wrap items-center justify-between gap-5 rounded-lg border border-[var(--border-soft)] bg-[var(--panel)] px-6 py-6 no-underline transition-colors hover:border-[var(--accent)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[24px] text-[var(--text)]">
                      {role.title}
                    </span>
                    <span className="mt-1 block text-[var(--text-secondary)]">{role.teaser}</span>
                    {role.page.tags.length > 0 && (
                      <span className="mt-3 flex flex-wrap gap-2">
                        {role.page.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[var(--panel-accent)] px-3 py-1 text-xs text-[var(--text-secondary)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[15px] font-medium text-[var(--accent)]">
                    Voir le poste →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
