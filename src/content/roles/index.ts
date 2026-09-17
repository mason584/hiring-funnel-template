import { eventNameFor, type Role } from "./types";
import { closer } from "./closer";

/**
 * Le catalogue des postes.
 *
 * Ouvrir un poste : créer `src/content/roles/<slug>.ts` sur le modèle de
 * `closer.ts`, puis l'ajouter à ce tableau. C'est tout — routes, questionnaire,
 * entonnoir de l'administration, colonnes de l'export et événement Meta en
 * découlent.
 */
export const ROLES: Role[] = [closer];

/** Deux postes ne peuvent pas partager un slug : les URL et les événements Meta se confondraient. */
{
  const seen = new Set<string>();
  for (const role of ROLES) {
    if (seen.has(role.slug)) {
      throw new Error(`Deux postes portent le slug « ${role.slug} »`);
    }
    seen.add(role.slug);
  }
}

export function getRole(slug: string): Role | undefined {
  return ROLES.find((r) => r.slug === slug);
}

/** Les postes qui acceptent des candidatures, dans l'ordre du catalogue. */
export function openRoles(): Role[] {
  return ROLES.filter((r) => r.status === "open");
}

export { eventNameFor };
export type { Role };
export * from "./types";
