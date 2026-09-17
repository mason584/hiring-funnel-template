import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BRAND } from "@/brand/brand";
import { ROLES, getRole } from "@/content/roles";
import { VideoPlayer } from "@/components/video";
import { VisitPing } from "@/components/visit-ping";
import { ButtonLink } from "@/components/ui/primitives";

/**
 * La fiche d'un poste — la page que l'ad pointe.
 *
 * Indexable et partageable : contrairement au questionnaire, une annonce
 * gagne à être trouvée. Ses métadonnées de partage sont propres au poste, pour
 * qu'un lien collé dans une conversation affiche le bon titre.
 */
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return ROLES.map((role) => ({ slug: role.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const role = getRole(slug);
  if (!role) return {};

  return {
    title: role.title,
    description: role.teaser,
    alternates: { canonical: `/postes/${role.slug}` },
    openGraph: {
      title: `${role.title} — ${BRAND.name}`,
      description: role.teaser,
      url: `/postes/${role.slug}`,
      images: [role.page.ogImage ?? BRAND.ogImage],
    },
  };
}

export default async function RolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const role = getRole(slug);
  if (!role) notFound();

  const open = role.status === "open";

  return (
    <>
      <VisitPing path={`/postes/${role.slug}`} roleSlug={role.slug} />

      <article className="mx-auto max-w-3xl px-5 pt-14 sm:px-10 sm:pt-20">
        {role.page.tags.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {role.page.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--panel-accent)] px-3 py-1 text-xs text-[var(--text-secondary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h1 className="font-display text-[clamp(32px,5vw,52px)] leading-[1.07]">
          {role.page.headline}
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-[var(--text-secondary)]">
          {role.page.lede}
        </p>

        {open ? (
          <div className="mt-8">
            <ButtonLink href={`/postes/${role.slug}/candidater`}>{role.page.cta}</ButtonLink>
            {role.page.ctaNote && (
              <p className="mt-3 text-sm text-[var(--text-muted)]">{role.page.ctaNote}</p>
            )}
          </div>
        ) : (
          <p className="mt-8 inline-block rounded-md bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn-text)]">
            Les candidatures sont fermées sur ce poste.
          </p>
        )}

        {role.page.video && (
          <div className="mt-14">
            <VideoPlayer source={role.page.video} />
          </div>
        )}

        <div className="mt-16 flex flex-col gap-12">
          {role.page.sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-[clamp(22px,2.8vw,30px)]">{section.title}</h2>
              {section.bullets ? (
                <ul className="mt-4 flex list-none flex-col gap-3 p-0">
                  {section.body.map((line) => (
                    <li key={line} className="flex gap-3 text-[var(--text-secondary)]">
                      <span aria-hidden className="mt-[2px] shrink-0 text-[var(--tan)]">
                        —
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-[var(--text-secondary)]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {open && (
          <div className="mt-16 rounded-lg border border-[var(--border-soft)] bg-[var(--panel-accent)] px-6 py-8 text-center">
            <p className="font-display text-[26px]">Ça te ressemble ?</p>
            <div className="mt-5 flex justify-center">
              <ButtonLink href={`/postes/${role.slug}/candidater`}>{role.page.cta}</ButtonLink>
            </div>
            {role.page.ctaNote && (
              <p className="mt-3 text-sm text-[var(--text-muted)]">{role.page.ctaNote}</p>
            )}
          </div>
        )}
      </article>
    </>
  );
}
