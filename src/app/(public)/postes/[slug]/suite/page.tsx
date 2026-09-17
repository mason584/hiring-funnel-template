import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRole } from "@/content/roles";
import { outcomeFor } from "../../../actions";

/**
 * Candidature non retenue.
 *
 * Aucun événement de conversion n'est tiré ici — c'est le point même du
 * montage. La page reste honnête : elle dit non sans faire miroiter une
 * réponse qui ne viendra pas, et annonce que la candidature est conservée.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function NextPage({
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

  const content = role.outcomes.disqualified;
  const firstName = outcome.firstName ?? "";
  const fill = (text: string) => text.replace(/\{prenom\}/g, firstName).replace(/\s+,/, ",");

  return (
    <section className="mx-auto max-w-2xl px-5 pt-20 sm:px-10 sm:pt-28">
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
          Voir les autres postes
        </Link>
      </div>
    </section>
  );
}
