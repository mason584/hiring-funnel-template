import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, type ApplicationRow } from "@/db/schema";
import { eventNameFor, getRole } from "@/content/roles";
import { answerToText } from "@/lib/answers";
import { requireAdmin } from "@/lib/admin";
import { formatDuration, formatLongDate, STATUT_LABELS } from "../../filters";
import { ResendButton } from "./resend-button";

/**
 * La fiche d'une candidature : toutes les réponses dans les termes exacts
 * posés au candidat, le verdict et ce qui l'a produit, l'événement Meta et sa
 * trace. C'est la page qu'on ouvre avant d'appeler quelqu'un.
 */
export const dynamic = "force-dynamic";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel)] p-6">
      <h2 className="font-display text-[20px]">{title}</h2>
      {children}
    </section>
  );
}

/** Pourquoi l'événement n'est pas parti — la question qu'on se pose devant la fiche. */
function metaAbsenceReason(row: ApplicationRow): string {
  if (row.status === "disqualified")
    return "Candidature non retenue — aucun événement n'est envoyé, c'est le principe du montage.";
  if (row.status === "partial")
    return "Candidature encore en cours — l'événement part à l'envoi.";
  if (row.metaEventDetail) return row.metaEventDetail;
  return "L'envoi n'a pas encore abouti — voir les journaux du serveur.";
}

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  let row: ApplicationRow | undefined;
  try {
    [row] = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  } catch {
    // Un id qui n'est pas un uuid fait échouer la requête : même réponse qu'un id inconnu.
    notFound();
  }
  if (!row) notFound();

  const role = getRole(row.roleSlug);
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ") || "Candidature anonyme";
  const answers = (row.answers ?? {}) as Record<string, never>;
  const utm = (row.utm ?? {}) as Record<string, string>;
  const utmEntries = Object.entries(utm).filter(([, v]) => Boolean(v));
  const faulty = new Set((row.disqualifiedBy ?? []) as string[]);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/candidatures" className="text-sm text-[var(--text-muted)]">
        ← Candidatures
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-display text-[32px]">{name}</h1>
        <span className="text-sm text-[var(--text-muted)]">
          {role?.title ?? row.roleSlug} · {STATUT_LABELS[row.status] ?? row.status} · score{" "}
          {row.score}
        </span>
      </div>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Arrivé le {formatLongDate(row.createdAt)} · dernière action le{" "}
        {formatLongDate(row.updatedAt)} · {formatDuration(row)} sur le formulaire
      </p>

      <div className="mt-8 grid gap-6">
        <Card title="Coordonnées">
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email">
              {row.email ? (
                <a href={`mailto:${row.email}`} className="underline underline-offset-2">
                  {row.email}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Téléphone">
              {row.phoneNumber ? (
                <>
                  <a href={`tel:${row.phoneNumber}`} className="underline underline-offset-2">
                    {row.phoneNumber}
                  </a>
                  <a
                    href={`https://wa.me/${row.phoneNumber.replace(/\D/g, "")}`}
                    rel="noreferrer"
                    target="_blank"
                    className="ml-3 text-xs text-[var(--link)]"
                  >
                    WhatsApp ↗
                  </a>
                </>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Session">
              <span className="font-mono text-xs">{row.sessionId}</span>
            </Field>
          </dl>
        </Card>

        <Card title="Réponses">
          {role ? (
            <dl className="mt-4 grid gap-5">
              {role.form.questions.map((question) => {
                const value = answerToText(question, answers[question.id]);
                return (
                  <div key={question.id}>
                    <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      {question.label}
                      {faulty.has(question.id) && (
                        <span className="ml-2 rounded bg-[var(--warn-bg)] px-1.5 py-0.5 normal-case tracking-normal text-[var(--warn-text)]">
                          éliminatoire
                        </span>
                      )}
                    </dt>
                    <dd className="mt-1 text-sm">
                      {value ? (
                        <span className="whitespace-pre-wrap">{value}</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">Pas atteint</span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Le poste « {row.roleSlug} » n&apos;existe plus dans le contenu — les réponses brutes
              restent en base.
            </p>
          )}
        </Card>

        <Card title="Verdict">
          <p className="mt-4 text-sm">
            {row.status === "qualified" && (
              <span className="rounded bg-[var(--ok-soft)] px-1.5 py-0.5 text-[var(--ok)]">
                Retenue
              </span>
            )}
            {row.status === "disqualified" && (
              <span className="rounded bg-[var(--warn-bg)] px-1.5 py-0.5 text-[var(--warn-text)]">
                Non retenue
              </span>
            )}
            {row.status === "partial" && (
              <span className="text-[var(--text-muted)]">Questionnaire en cours</span>
            )}
            <span className="ml-2 text-[var(--text-muted)]">
              score {row.score}
              {role && role.form.minScore > 0 ? ` / minimum ${role.form.minScore}` : ""}
            </span>
          </p>
          {faulty.size > 0 && role && (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Écartée sur :{" "}
              {[...faulty]
                .map((qid) => role.form.questions.find((q) => q.id === qid)?.label ?? qid)
                .join(" · ")}
            </p>
          )}
        </Card>

        <Card title="Événement Meta">
          <dl className="mt-4 grid gap-4">
            <Field label="Nom de l'événement">
              <span className="font-mono text-xs">{eventNameFor(row.roleSlug)}</span>
            </Field>
            <Field label="Statut">
              {row.metaEventSentAt ? (
                <>✓ Envoyé le {formatLongDate(row.metaEventSentAt)}</>
              ) : (
                <span className="text-[var(--text-muted)]">{metaAbsenceReason(row)}</span>
              )}
            </Field>
            {row.metaEventDetail && (
              <Field label="Trace">
                <span className="break-all font-mono text-xs">{row.metaEventDetail}</span>
              </Field>
            )}
          </dl>

          {row.status === "qualified" && (
            <div className="mt-5">
              <ResendButton applicationId={row.id} sent={Boolean(row.metaEventSentAt)} />
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Le renvoi utilise le même identifiant d&apos;événement : Meta le dédoublonne, il
                n&apos;y a aucun risque de compter deux conversions.
              </p>
            </div>
          )}
        </Card>

        <Card title="Provenance">
          <dl className="mt-4 grid gap-4">
            <Field label="Page d'arrivée">
              {row.landingUrl ? (
                <span className="break-all font-mono text-xs">{row.landingUrl}</span>
              ) : (
                "—"
              )}
            </Field>
            {utmEntries.length > 0 ? (
              utmEntries.map(([key, value]) => (
                <Field key={key} label={key}>
                  <span className="break-all font-mono text-xs">{value}</span>
                </Field>
              ))
            ) : (
              <Field label="UTM">—</Field>
            )}
          </dl>
        </Card>
      </div>
    </div>
  );
}
