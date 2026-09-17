import { BRAND } from "@/brand/brand";
import { ROLES, eventNameFor } from "@/content/roles";
import { requireAdmin } from "@/lib/admin";
import { getMetaSettings, maskToken } from "@/lib/settings";
import { MetaForm, TestForm } from "./forms";

/**
 * Les réglages Meta — le pixel et le token, saisis ici plutôt qu'en variables
 * d'environnement.
 *
 * Vercel fige les variables au build : « je colle mon pixel et il s'affiche
 * partout » ne peut pas passer par elles. Ce qui est saisi ici s'applique à la
 * page suivante, sans redéploiement.
 */
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const meta = await getMetaSettings();

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-[32px]">Réglages</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Le pixel s&apos;applique à toutes les pages publiques. Le token sert aux événements
        envoyés depuis le serveur, à la validation d&apos;une candidature.
      </p>

      <div className="mt-8 grid gap-6">
        <MetaForm
          pixelId={meta.pixelId}
          tokenSet={Boolean(meta.capiToken)}
          tokenHint={maskToken(meta.capiToken)}
          testEventCode={meta.testEventCode}
        />

        <TestForm roles={ROLES.map((r) => ({ slug: r.slug, title: r.title }))} />

        <section className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel)] p-6">
          <h2 className="font-display text-[20px]">Les événements de ce site</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Un événement par poste, envoyé uniquement pour une candidature retenue. Pour optimiser
            une campagne dessus, crée une <strong>conversion personnalisée</strong> sur ce nom dans
            Events Manager — un nom d&apos;événement personnalisé n&apos;est pas sélectionnable
            directement.
          </p>

          <ul className="mt-4 flex list-none flex-col gap-2 p-0">
            {ROLES.map((role) => (
              <li
                key={role.slug}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border-soft)] px-4 py-3"
              >
                <span className="text-sm">{role.title}</span>
                <code className="font-mono text-xs text-[var(--text-secondary)]">
                  {eventNameFor(role.slug)}
                </code>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Rappel : une annonce de recrutement doit être déclarée dans la catégorie spéciale
            « Emploi » de Meta. Le ciblage y est bridé (ni âge, ni genre, ni code postal, ni
            audience similaire) — le signal de conversion devient le principal levier, d&apos;où
            l&apos;intérêt de ne remonter que les candidatures retenues.
          </p>
        </section>

        <section className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel)] p-6">
          <h2 className="font-display text-[20px]">Ce site</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[var(--text-muted)]">Adresse</dt>
              <dd className="font-mono text-xs">{BRAND.siteUrl}</dd>
            </div>
            {ROLES.map((role) => (
              <div key={role.slug} className="flex flex-wrap justify-between gap-2">
                <dt className="text-[var(--text-muted)]">
                  {role.title} · {role.status === "open" ? "ouvert" : "fermé"}
                </dt>
                <dd className="font-mono text-xs">
                  {BRAND.siteUrl}/postes/{role.slug}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Les postes, les questions et les textes se modifient dans{" "}
            <code>src/content/</code> ; les couleurs et les polices dans{" "}
            <code>src/brand/</code>.
          </p>
        </section>
      </div>
    </div>
  );
}
