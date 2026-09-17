"use client";

import { useActionState } from "react";
import { resendMetaEvent } from "../../actions";

/**
 * Rejoue l'envoi d'un événement de conversion.
 *
 * Utile quand Meta était injoignable ou le token absent au moment de la
 * candidature. Le même `event_id` est réutilisé, donc Meta dédoublonne : on ne
 * peut pas compter deux conversions en cliquant deux fois.
 */
export function ResendButton({ applicationId, sent }: { applicationId: string; sent: boolean }) {
  const [state, action, pending] = useActionState(resendMetaEvent, null as
    | { ok: boolean; detail: string }
    | null);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={applicationId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-md border border-[var(--border-input)] px-5 text-sm disabled:opacity-60"
      >
        {pending ? "Envoi…" : sent ? "Renvoyer l'événement" : "Envoyer l'événement"}
      </button>

      {state && (
        <p
          className={`mt-3 rounded-md px-4 py-3 text-sm ${
            state.ok
              ? "bg-[var(--ok-soft)] text-[var(--ok)]"
              : "bg-[var(--warn-bg)] text-[var(--warn-text)]"
          }`}
          role="status"
        >
          {state.ok ? "✓ Meta a accepté — " : "✗ Échec — "}
          {state.detail}
        </p>
      )}
    </form>
  );
}
