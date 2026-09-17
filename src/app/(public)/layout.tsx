import Link from "next/link";
import { BRAND } from "@/brand/brand";
import { BrandStyle } from "@/components/brand-style";
import { PublicTracking } from "@/components/public-tracking";
import { Wordmark } from "@/components/ui/primitives";
import { resolveWordmark } from "@/lib/appearance";
import { getAppearance, getLogoVersion } from "@/lib/appearance-store";

/**
 * Le site public : en-tête, pied de page, traceurs.
 *
 * Le questionnaire a son propre layout, sans ce décor — une question par écran
 * suppose que l'écran n'appartienne qu'à la question.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [appearance, logoVersion] = await Promise.all([getAppearance(), getLogoVersion()]);
  const mark = resolveWordmark(appearance, logoVersion);

  return (
    <>
      <BrandStyle appearance={appearance} />

      <header className="flex items-center justify-between gap-6 border-b border-[var(--border-soft)] px-5 py-5 sm:px-10">
        <Link href="/" className="text-[var(--text)] no-underline">
          <Wordmark mark={mark} />
        </Link>
        <span className="eyebrow">Recrutement</span>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-24 border-t border-[var(--border-soft)] bg-[var(--bg-deep)] px-5 py-10 text-sm text-[var(--text-secondary)] sm:px-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <span>
            © {new Date().getFullYear()} {BRAND.legalName}
          </span>
          <nav className="flex flex-wrap gap-5">
            <Link href="/mentions-legales" className="text-[var(--link)]">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="text-[var(--link)]">
              Confidentialité
            </Link>
            {BRAND.social.map((s) => (
              <a key={s.url} href={s.url} className="text-[var(--link)]" rel="noreferrer">
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>

      <PublicTracking />
    </>
  );
}
