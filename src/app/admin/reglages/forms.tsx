"use client";

import { useActionState } from "react";
import { sendTestEvent, updateMetaSettings, type ActionResult } from "../actions";

function Notice({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return (
    <p
      role="status"
      className={`mt-4 rounded-md px-4 py-3 text-sm ${
        state.ok ? "bg-[var(--ok-soft)] text-[var(--ok)]" : "bg-[var(--warn-bg)] text-[var(--warn-text)]"
      }`}
    >
      {state.ok ? "✓ " : "✗ "}
      {state.detail}
    </p>
  );
}

const inputClass =
  "w-full rounded-md border border-[var(--border-input)] bg-[var(--bg)] px-3 py-2 text-sm";

export function MetaForm({
  pixelId,
  tokenSet,
  tokenHint,
  testEventCode,
}: {
  pixelId: string;
  tokenSet: boolean;
  tokenHint: string;
  testEventCode: string;
}) {
  const [state, action, pending] = useActionState(
    updateMetaSettings,
    null as ActionResult | null
  );

  return (
    <form action={action} className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel)] p-6">
      <h2 className="font-display text-[20px]">Meta</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Le pixel est public, il vit dans la page. Le token ne quitte jamais le serveur.
      </p>

      <label className="mt-5 flex flex-col gap-1">
        <span className="text-xs text-[var(--text-muted)]">
          Identifiant du pixel (dataset)
        </span>
        <input
          name="pixelId"
          defaultValue={pixelId}
          placeholder="123456789012345"
          inputMode="numeric"
          className={inputClass}
        />
      </label>

      <label className="mt-4 flex flex-col gap-1">
        <span className="text-xs text-[var(--text-muted)]">
          Token Conversions API
          {tokenSet && (
            <span className="ml-2 text-[var(--ok)]">configuré · {tokenHint}</span>
          )}
        </span>
        <input
          name="capiToken"
          type="password"
          autoComplete="off"
          placeholder={tokenSet ? "Laisser vide pour conserver le token actuel" : "EAAG…"}
          className={inputClass}
        />
        {/* Le token n'est jamais réaffiché : un champ vide conserve la valeur
            en place, sinon enregistrer le seul pixel l'effacerait. */}
      </label>

      <label className="mt-4 flex flex-col gap-1">
        <span className="text-xs text-[var(--text-muted)]">
          Code d&apos;événement de test (facultatif)
        </span>
        <input
          name="testEventCode"
          defaultValue={testEventCode}
          placeholder="TEST12345"
          className={`${inputClass} w-48`}
        />
        <span className="text-xs text-[var(--text-muted)]">
          Tant qu&apos;il est renseigné, <strong>tous</strong> les événements partent en test et ne
          comptent nulle part. À vider avant de lancer les campagnes.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[var(--inverse)] px-5 text-sm text-[var(--text-on-inverse)] disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>

      <Notice state={state} />
    </form>
  );
}

export function TestForm({ roles }: { roles: { slug: string; title: string }[] }) {
  const [state, action, pending] = useActionState(sendTestEvent, null as ActionResult | null);

  return (
    <form action={action} className="rounded-lg border border-[var(--border-soft)] bg-[var(--panel)] p-6">
      <h2 className="font-display text-[20px]">Événement de test</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Envoie un événement factice par la Conversions API, depuis le serveur. Avec un code de
        test, il s&apos;affiche dans Events Manager en quelques secondes sans compter nulle part.
        Sans code, il entre dans le vrai pipeline — c&apos;est ce qui fait exister le nom de
        l&apos;événement, à compter d&apos;une quinzaine de minutes.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-muted)]">Poste</span>
          <select name="roleSlug" className={`${inputClass} w-56`} defaultValue={roles[0]?.slug}>
            {roles.map((role) => (
              <option key={role.slug} value={role.slug}>
                {role.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-muted)]">Code de test (facultatif)</span>
          <input name="testEventCode" placeholder="TEST12345" className={`${inputClass} w-40`} />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-md bg-[var(--inverse)] px-5 text-sm text-[var(--text-on-inverse)] disabled:opacity-60"
        >
          {pending ? "Envoi…" : "Envoyer un test"}
        </button>
      </div>

      <Notice state={state} />
    </form>
  );
}
