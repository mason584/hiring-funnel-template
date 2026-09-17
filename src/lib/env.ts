import { z } from "zod";
import { IS_PREVIEW } from "@/lib/preview";

/**
 * L'environnement serveur. L'importer depuis un composant client casse le
 * build — c'est voulu : ce module porte le mot de passe d'administration.
 */

const required = (name: string) =>
  IS_PREVIEW ? z.string().default("") : z.string().min(1, `${name} est requise`);

const serverSchema = z.object({
  DATABASE_URL: required("DATABASE_URL"),
  /** Mot de passe unique de l'administration. */
  ADMIN_PASSWORD: required("ADMIN_PASSWORD"),
  /** Clé de signature du cookie de session. 32 octets aléatoires. */
  AUTH_SECRET: required("AUTH_SECRET"),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
});

let cached: z.infer<typeof serverSchema> | null = null;

/**
 * Validé à la demande, pas à l'import : `next build` importe chaque module de
 * route pour collecter les métadonnées, et ne doit pas exiger une base.
 */
export function serverEnv() {
  if (!cached) {
    cached = serverSchema.parse({
      // L'intégration Supabase de Vercel fournit l'URL sous ce second nom.
      DATABASE_URL: process.env.DATABASE_URL ?? process.env.POSTGRES_URL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      AUTH_SECRET: process.env.AUTH_SECRET,
      META_PIXEL_ID: process.env.META_PIXEL_ID,
      META_CAPI_TOKEN: process.env.META_CAPI_TOKEN,
    });
  }
  return cached;
}

/**
 * Le repli Meta, lu directement dans l'environnement.
 *
 * Volontairement hors du schéma strict : ces deux valeurs sont facultatives,
 * et les pages publiques doivent s'afficher sur un déploiement qui n'a pas
 * encore de mot de passe d'administration — c'est exactement l'état d'un
 * client au premier `vercel deploy`. Les passer par `serverEnv()` faisait
 * échouer le rendu d'une page légale parce qu'une variable sans rapport
 * manquait.
 *
 * Les valeurs saisies dans /admin/reglages restent prioritaires : celles-ci
 * ne servent qu'à un déploiement scripté.
 */
export function metaEnvFallback(): { pixelId: string; capiToken: string } {
  return {
    pixelId: (process.env.META_PIXEL_ID ?? "").trim(),
    capiToken: (process.env.META_CAPI_TOKEN ?? "").trim(),
  };
}
