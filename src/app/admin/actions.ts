"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { eventNameFor } from "@/content/roles";
import { requireAdmin } from "@/lib/admin";
import { publicEnv } from "@/lib/env";
import { sendHiringEvent } from "@/lib/meta-capi";
import { saveMetaSettings } from "@/lib/settings";

/**
 * Les actions de l'administration.
 *
 * Le garde est dans CHAQUE action, pas seulement dans les pages : une action
 * serveur est une route publique, et la protéger au rendu ne la protège pas à
 * l'appel.
 */

export type ActionResult = { ok: boolean; detail: string };

/**
 * Rejoue l'événement de conversion d'une candidature retenue.
 *
 * Le même `event_id` est réutilisé — Meta dédoublonne, donc un double clic ne
 * peut pas compter deux conversions. Sert quand le token manquait ou que Meta
 * était injoignable au moment de la candidature.
 */
export async function resendMetaEvent(
  _prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, detail: "Candidature introuvable." };

  const [row] = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  if (!row) return { ok: false, detail: "Candidature introuvable." };

  // Le garde qui compte : seule une candidature retenue remonte à Meta.
  // Sans lui, ce bouton contournerait toute la logique de verdict.
  if (row.status !== "qualified") {
    return { ok: false, detail: "Cette candidature n'est pas retenue — aucun envoi possible." };
  }

  const result = await sendHiringEvent({
    eventId: row.sessionId,
    eventName: eventNameFor(row.roleSlug),
    roleSlug: row.roleSlug,
    email: row.email,
    phoneNumber: row.phoneNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    eventSourceUrl:
      row.landingUrl ?? `${publicEnv.NEXT_PUBLIC_SITE_URL}/postes/${row.roleSlug}`,
    clientUserAgent: row.userAgent,
    fbc: row.fbc,
    fbp: row.fbp,
  });

  await db
    .update(applications)
    .set({
      metaEventSentAt: result.ok ? new Date() : row.metaEventSentAt,
      metaEventDetail: result.detail,
    })
    .where(eq(applications.id, id));

  revalidatePath(`/admin/candidatures/${id}`);
  return result;
}

/** Enregistre les réglages Meta. Un champ vide conserve la valeur en place. */
export async function updateMetaSettings(
  _prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  try {
    await saveMetaSettings({
      pixelId: String(formData.get("pixelId") ?? ""),
      capiToken: String(formData.get("capiToken") ?? ""),
      testEventCode: String(formData.get("testEventCode") ?? ""),
    });
  } catch (error) {
    console.error("Réglages Meta non enregistrés", error);
    return { ok: false, detail: "Enregistrement impossible — la base est injoignable." };
  }

  // Le pixel est lu par le layout public : sans purge, les pages déjà rendues
  // continueraient de servir l'ancien identifiant.
  revalidatePath("/", "layout");
  return { ok: true, detail: "Réglages enregistrés. Ils s'appliquent à la page suivante." };
}

/**
 * Envoie un événement de test, depuis le serveur — le seul endroit où vit le
 * token.
 *
 * Avec un code de l'onglet « Événements de test », il s'affiche en quelques
 * secondes sans compter nulle part. Sans code, il entre dans le vrai pipeline :
 * c'est lui qui fait exister le nom de l'événement dans Events Manager, où il
 * faut ensuite créer une conversion personnalisée pour l'optimiser.
 */
export async function sendTestEvent(
  _prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const slug = String(formData.get("roleSlug") ?? "");
  const code = String(formData.get("testEventCode") ?? "").trim();
  if (!slug) return { ok: false, detail: "Aucun poste choisi." };

  const result = await sendHiringEvent({
    eventId: `test-admin-${Date.now()}`,
    eventName: eventNameFor(slug),
    roleSlug: slug,
    email: "zztest@exemple.com",
    firstName: "Test",
    lastName: "Recrutement",
    eventSourceUrl: `${publicEnv.NEXT_PUBLIC_SITE_URL}/postes/${slug}`,
    testEventCode: code || null,
  });

  return result;
}
