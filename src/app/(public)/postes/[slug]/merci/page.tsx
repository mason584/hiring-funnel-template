import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRole, eventNameFor } from "@/content/roles";
import { HiringPing } from "@/components/hiring-ping";
import { outcomeFor } from "../../../actions";

/**
 * Candidature retenue.
 *
 * L'événement de conversion ne part **que si le serveur** a vérifié que la
 * session correspond à une candidature réellement retenue : arriver ici par
 * l'URL renvoie sur l'autre page de sortie. C'est ce qui empêche un profil
 * écarté de remonter à Meta et d'apprendre à l'algorithme à en ramener
 * d'autres du même genre.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sid?: string }>;
}) {
  const { slug } = await params;
  const { sid } = await searchParams;
  const role = getRole(slug);
  if (!role) notFound();

  const outcome = sid ? await outcomeFor(sid, role.slug) : null;
  if (!outcome) redirect(`/postes/${role.slug}`);
  if (outcome.status !== "qualified") redirect(`/postes/${role.slug}/suite?sid=${sid}`);

  const content = role.outcomes.qualified;
  const firstName = outcome.firstName ?? "";
  const fill = (text: string) => text.replace(/\{prenom\}/g, firstName).replace(/\s+,/, ",");

  return (
    <>
      <HiringPing eventName={eventNameFor(role.slug)} eventId={sid!} roleSlug={role.slug} />

      <section className="mx-auto max-w-2xl px-5 pt-20 sm:px-10 sm:pt-28">
        <span
          aria-hidden
          className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ok-soft)] text-[26px] text-[var(--ok)]"
        >
          ✓
        </span>

        <h1 className="font-display text-[clamp(30px,4.6vw,46px)] leading-[1.08]">
          {fill(content.title)}
        </h1>

        <div className="mt-6 flex flex-col gap-4">
          {content.body.map((paragraph) => (
            <p key={paragraph} className="text-[17px] leading-relaxed text-[var(--text-secondary)]">
              {fill(paragraph)}
            </p>
          ))}
        </div>

        {content.steps && content.steps.length > 0 && (
          <ol className="mt-10 flex list-none flex-col gap-0 p-0">
            {content.steps.map((step, i) => (
              <li
                key={step}
                className="flex gap-4 border-b border-[var(--border-soft)] py-4 last:border-0"
              >
                <span className="font-display text-[20px] text-[var(--tan)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[var(--text-secondary)]">{step}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-10 flex flex-wrap gap-4">
          {content.cta && (
            <a
              href={content.cta.url}
              className="inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-6 text-[15px] font-medium text-[var(--text-on-accent)] no-underline"
            >
              {content.cta.label}
            </a>
          )}
          <Link href="/" className="inline-flex min-h-11 items-center text-[var(--link)]">
            Revenir à l&apos;accueil
          </Link>
        </div>
      </section>
    </>
  );
}
