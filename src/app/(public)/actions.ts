"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { getRole, eventNameFor } from "@/content/roles";
import { asName, asText, type Answers } from "@/lib/answers";
import { publicEnv } from "@/lib/env";
import { normalizePhone } from "@/lib/phone";
import { sendHiringEvent } from "@/lib/meta-capi";
import { computeVerdict, shouldExitNow } from "@/lib/verdict";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES ACTIONS DU QUESTIONNAIRE.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Toutes publiques — la page l'est. Elles ne lisent donc aucune identité et
 * n'exposent rien d'autre que ce que le visiteur vient de saisir. Le token
 * Meta ne quitte jamais ce périmètre.
 *
 * Règle qui gouverne tout ce fichier : **le navigateur ne décide de rien**.
 * Il envoie des réponses, le serveur relit le poste, recalcule le score et le
 * verdict, et c'est ce verdict-là qui commande la redirection et l'événement
 * de conversion.
 */

/** Le rang d'un écran, pour ne jamais rétrograder l'avancement enregistré. */
function stepRank(roleSlug: string, step: string): number {
  if (step === "submitted") return 10_000;
  const role = getRole(roleSlug);
  const index = role?.form.questions.findIndex((q) => q.id === step) ?? -1;
  return index >= 0 ? index : -1; // « intro » et l'inconnu valent -1
}

/** Les champs d'identité, extraits des réponses selon le type de question. */
function identityFrom(roleSlug: string, answers: Answers) {
  const role = getRole(roleSlug);
  const out = {
    firstName: null as string | null,
    lastName: null as string | null,
    email: null as string | null,
    phoneNumber: null as string | null,
  };
  if (!role) return out;

  for (const question of role.form.questions) {
    const value = answers[question.id];
    if (value === undefined) continue;

    if (question.kind === "name") {
      const name = asName(value);
      if (name) {
        out.firstName = name.first.trim() || null;
        out.lastName = name.last.trim() || null;
      }
    }
    if (question.kind === "email") out.email = asText(value).trim() || null;
    if (question.kind === "phone") {
      // Meta apparie sur un téléphone en chiffres, et un lien `tel:` ou
      // WhatsApp veut la forme internationale : une seule forme canonique.
      out.phoneNumber = normalizePhone(asText(value)) ?? null;
    }
  }
  return out;
}

export type ProgressInput = {
  sessionId: string;
  roleSlug: string;
  /** Les réponses de l'écran qui vient d'être validé. */
  answers: Answers;
  /** L'id de la question franchie, ou « intro ». */
  stepReached: string;
  landingUrl?: string;
  utm?: Record<string, string>;
  fbc?: string | null;
  fbp?: string | null;
};

export type ProgressResult = {
  ok: boolean;
  /** Vrai quand la réponse élimine et que le poste coupe le parcours ici. */
  exit?: boolean;
};

/**
 * Enregistre l'avancement, à chaque écran franchi.
 *
 * C'est cette table qui dit où les gens décrochent, et c'est elle qui garde
 * un candidat éliminé : quelqu'un qui n'est pas disponible avant six mois
 * aujourd'hui reste un candidat pour dans six mois.
 */
export async function saveProgress(input: ProgressInput): Promise<ProgressResult> {
  const role = getRole(input.roleSlug);
  if (!role || role.status !== "open") return { ok: false };

  try {
    const [existing] = await db
      .select({
        id: applications.id,
        answers: applications.answers,
        stepReached: applications.stepReached,
        status: applications.status,
      })
      .from(applications)
      .where(eq(applications.sessionId, input.sessionId))
      .limit(1);

    // Les réponses arrivent écran par écran : on fusionne au lieu d'écraser,
    // sinon un retour en arrière effacerait ce qui précède.
    const answers: Answers = {
      ...((existing?.answers as Answers) ?? {}),
      ...input.answers,
    };

    const previous = existing?.stepReached ?? "";
    const best =
      stepRank(input.roleSlug, previous) > stepRank(input.roleSlug, input.stepReached)
        ? previous
        : input.stepReached;

    // Sortie anticipée : la réponse élimine et le poste coupe ici. On clôt la
    // candidature tout de suite plutôt que de faire écrire deux paragraphes à
    // quelqu'un dont on sait déjà qu'on ne le retiendra pas.
    const exit = shouldExitNow(role, input.stepReached, answers);
    const verdict = computeVerdict(role, answers);

    const values = {
      sessionId: input.sessionId,
      roleSlug: input.roleSlug,
      ...identityFrom(input.roleSlug, answers),
      answers,
      stepReached: best,
      status: exit ? "disqualified" : (existing?.status ?? "partial"),
      disqualifiedBy: exit ? verdict.disqualifiedBy : [],
      score: verdict.score,
      landingUrl: input.landingUrl ?? null,
      utm: input.utm ?? {},
      fbc: input.fbc ?? null,
      fbp: input.fbp ?? null,
      updatedAt: new Date(),
      ...(exit ? { submittedAt: new Date() } : {}),
    };

    if (existing) {
      await db.update(applications).set(values).where(eq(applications.id, existing.id));
    } else {
      await db.insert(applications).values(values);
    }

    return { ok: true, exit };
  } catch (error) {
    // Le parcours du candidat ne doit jamais s'arrêter parce que notre
    // journal est en panne.
    console.error("Avancement non enregistré", error);
    return { ok: false };
  }
}

export type SubmitResult =
  | { state: "done"; status: "qualified" | "disqualified" }
  | { state: "error"; message: string };

/**
 * Soumission finale : verdict, enregistrement, puis Meta.
 *
 * L'ordre compte. Le verdict est calculé avant l'envoi et conditionne
 * l'événement de conversion — c'est le seul mécanisme qui garantit qu'une
 * campagne de recrutement n'apprend jamais à ramener les profils qu'on écarte.
 */
export async function submitApplication(input: ProgressInput): Promise<SubmitResult> {
  const role = getRole(input.roleSlug);
  if (!role || role.status !== "open") {
    return { state: "error", message: "Ce poste n'accepte plus de candidatures." };
  }

  let existing;
  try {
    [existing] = await db
      .select({
        id: applications.id,
        answers: applications.answers,
        status: applications.status,
        submittedAt: applications.submittedAt,
      })
      .from(applications)
      .where(eq(applications.sessionId, input.sessionId))
      .limit(1);
  } catch (error) {
    console.error("Candidature illisible", error);
    return { state: "error", message: "Impossible d'enregistrer ta candidature. Réessaie." };
  }

  // Déjà envoyée : un double-clic ne doit créer ni deux candidatures ni deux
  // événements Meta. On renvoie le verdict déjà rendu.
  if (existing?.submittedAt) {
    return {
      state: "done",
      status: existing.status === "qualified" ? "qualified" : "disqualified",
    };
  }

  const answers: Answers = {
    ...((existing?.answers as Answers) ?? {}),
    ...input.answers,
  };

  const verdict = computeVerdict(role, answers);
  const identity = identityFrom(input.roleSlug, answers);

  try {
    const values = {
      sessionId: input.sessionId,
      roleSlug: input.roleSlug,
      ...identity,
      answers,
      stepReached: "submitted",
      status: verdict.status,
      disqualifiedBy: verdict.disqualifiedBy,
      score: verdict.score,
      landingUrl: input.landingUrl ?? null,
      utm: input.utm ?? {},
      fbc: input.fbc ?? null,
      fbp: input.fbp ?? null,
      submittedAt: new Date(),
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(applications).set(values).where(eq(applications.id, existing.id));
    } else {
      await db.insert(applications).values(values);
    }
  } catch (error) {
    console.error("Candidature non enregistrée", error);
    return { state: "error", message: "Impossible d'enregistrer ta candidature. Réessaie." };
  }

  if (verdict.status === "qualified") {
    const head = await headers();
    const result = await sendHiringEvent({
      eventId: input.sessionId,
      eventName: eventNameFor(role.slug),
      roleSlug: role.slug,
      email: identity.email,
      phoneNumber: identity.phoneNumber,
      firstName: identity.firstName,
      lastName: identity.lastName,
      eventSourceUrl: input.landingUrl ?? `${publicEnv.NEXT_PUBLIC_SITE_URL}/postes/${role.slug}`,
      clientIpAddress: head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      clientUserAgent: head.get("user-agent"),
      fbc: input.fbc,
      fbp: input.fbp,
    });

    // L'échec n'annule rien : la candidature existe, et l'administration
    // propose de rejouer l'envoi avec le même `event_id` — donc sans doublon.
    try {
      await db
        .update(applications)
        .set({
          metaEventSentAt: result.ok ? new Date() : null,
          metaEventDetail: result.detail,
        })
        .where(eq(applications.sessionId, input.sessionId));
    } catch (error) {
      console.error("Trace Meta non enregistrée", error);
    }
  }

  return { state: "done", status: verdict.status };
}

/**
 * Le prénom d'une session, pour personnaliser la page de sortie.
 *
 * Passer le prénom dans l'URL serait plus simple, mais il s'afficherait alors
 * n'importe quel prénom tapé dans la barre d'adresse — et surtout, la page de
 * sortie doit de toute façon relire la candidature côté serveur pour décider
 * si l'événement de conversion a le droit de partir.
 */
export async function outcomeFor(
  sessionId: string,
  roleSlug: string
): Promise<{ status: string; firstName: string | null } | null> {
  try {
    const [row] = await db
      .select({
        status: applications.status,
        firstName: applications.firstName,
        roleSlug: applications.roleSlug,
      })
      .from(applications)
      .where(eq(applications.sessionId, sessionId))
      .limit(1);

    if (!row || row.roleSlug !== roleSlug) return null;
    return { status: row.status, firstName: row.firstName };
  } catch (error) {
    console.error("Sortie illisible", error);
    return null;
  }
}
