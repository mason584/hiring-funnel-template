"use client";

import { useEffect, useRef } from "react";
import { getSessionId, readAttribution } from "@/lib/session";

/**
 * Compte une visite dès l'arrivée sur une page publique.
 *
 * C'est la première marche de l'entonnoir : sans elle, impossible de dire
 * combien de personnes voient une fiche de poste pour une candidature
 * démarrée. Un chargement de page compte pour une visite — pas de cookie, pas
 * de dédoublonnage entre sessions, la mesure reste volontairement simple et
 * lisible.
 *
 * `sendBeacon` plutôt que `fetch` : la requête survit à une navigation
 * immédiate, et n'entre jamais en concurrence avec le rendu.
 */
export function VisitPing({ path, roleSlug }: { path: string; roleSlug?: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const { landingUrl, utm } = readAttribution();
    const body = JSON.stringify({
      sessionId: getSessionId(),
      path,
      roleSlug: roleSlug ?? null,
      referrer: document.referrer || null,
      landingUrl,
      utm,
    });

    try {
      const blob = new Blob([body], { type: "application/json" });
      if (!navigator.sendBeacon("/api/visite", blob)) {
        void fetch("/api/visite", { method: "POST", body, keepalive: true });
      }
    } catch {
      /* le comptage n'est jamais bloquant */
    }
  }, [path, roleSlug]);

  return null;
}
