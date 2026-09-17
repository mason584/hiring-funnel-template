import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { metaEnvFallback } from "@/lib/env";
import { IS_PREVIEW } from "@/lib/preview";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES RÉGLAGES META — pixel et token, modifiables sans redéploiement.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Vercel fige les variables d'environnement au build : « je colle mon pixel
 * et il s'affiche sur tout le site » ne peut donc pas passer par elles. Les
 * valeurs saisies dans /admin/reglages ont la priorité, l'environnement sert
 * de repli pour un déploiement scripté.
 */

export const META_KEY = "meta";

export type MetaSettings = {
  /** Identifiant du dataset (« pixel »). Public : il vit dans la page. */
  pixelId: string;
  /** Token de la Conversions API. Serveur uniquement, jamais réaffiché. */
  capiToken: string;
  /** Code de l'onglet « Événements de test » d'Events Manager. */
  testEventCode: string;
};

const EMPTY: MetaSettings = { pixelId: "", capiToken: "", testEventCode: "" };

function parse(value: unknown): Partial<MetaSettings> {
  const raw = (value ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    pixelId: str(raw.pixelId),
    capiToken: str(raw.capiToken),
    testEventCode: str(raw.testEventCode),
  };
}

/**
 * Les réglages effectifs. Une base injoignable ne doit pas faire tomber une
 * page publique : on retombe sur l'environnement, quitte à perdre le pixel.
 */
export async function getMetaSettings(): Promise<MetaSettings> {
  const fallback: MetaSettings = { ...EMPTY, ...metaEnvFallback() };

  // Aucune base configurée : c'est le cas pendant `next build`, qui prérend
  // les pages statiques sans environnement. Interroger la base y produirait
  // une erreur rattrapée mais bruyante à chaque page.
  if (!IS_PREVIEW && !(process.env.DATABASE_URL ?? process.env.POSTGRES_URL)) {
    return fallback;
  }

  try {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, META_KEY))
      .limit(1);

    const stored = parse(row?.value);
    return {
      pixelId: stored.pixelId || fallback.pixelId,
      capiToken: stored.capiToken || fallback.capiToken,
      testEventCode: stored.testEventCode || "",
    };
  } catch (error) {
    console.error("Réglages Meta illisibles, repli sur l'environnement", error);
    return fallback;
  }
}

/**
 * Enregistre les réglages. Un champ laissé vide **conserve** la valeur
 * existante : le token n'étant jamais réaffiché, un formulaire soumis pour
 * changer le seul pixel l'effacerait autrement.
 */
export async function saveMetaSettings(next: Partial<MetaSettings>): Promise<void> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, META_KEY))
    .limit(1);

  const current = { ...EMPTY, ...parse(row?.value) };
  const value: MetaSettings = {
    pixelId: next.pixelId?.trim() || current.pixelId,
    capiToken: next.capiToken?.trim() || current.capiToken,
    // Le code de test, lui, doit pouvoir se vider : c'est ainsi qu'on repasse
    // en envoi réel après une session de vérification.
    testEventCode: next.testEventCode?.trim() ?? current.testEventCode,
  };

  await db
    .insert(settings)
    .values({ key: META_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

/** « configuré · …a4f2 » — de quoi vérifier sans jamais réafficher le secret. */
export function maskToken(token: string): string {
  if (!token) return "";
  return `…${token.slice(-4)}`;
}
