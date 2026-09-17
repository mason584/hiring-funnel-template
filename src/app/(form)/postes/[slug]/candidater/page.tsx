import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getRole } from "@/content/roles";
import { FormLoader } from "@/components/form/form-loader";
import { VisitPing } from "@/components/visit-ping";
import { resolveWordmark } from "@/lib/appearance";
import { getAppearance, getLogoVersion } from "@/lib/appearance-store";
import { defaultCountry } from "@/lib/phone";

/**
 * Le questionnaire.
 *
 * En `noindex` : une annonce gagne à être trouvée, un formulaire non. Il n'a
 * aucun contenu utile à un moteur, et une candidature indexée serait au mieux
 * du bruit.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const role = getRole(slug);
  if (!role) notFound();

  // Un poste fermé renvoie sur sa fiche, qui l'explique : laisser le
  // formulaire ouvert collecterait des candidatures que personne ne lira.
  if (role.status !== "open") redirect(`/postes/${role.slug}`);

  // Vercel géolocalise chaque requête : le menu d'indicatifs démarre sur le
  // pays du visiteur. En local l'en-tête est absent — la France par défaut.
  const country = defaultCountry((await headers()).get("x-vercel-ip-country"));

  // Le questionnaire est un composant client : il ne peut pas lire la base.
  // Le wordmark lui arrive résolu.
  const [appearance, logoVersion] = await Promise.all([getAppearance(), getLogoVersion()]);
  const mark = resolveWordmark(appearance, logoVersion);

  return (
    <>
      <VisitPing path={`/postes/${role.slug}/candidater`} roleSlug={role.slug} />
      <FormLoader role={role} defaultDialCountry={country} wordmark={mark} />
    </>
  );
}
