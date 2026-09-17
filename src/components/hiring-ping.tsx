"use client";

import { useEffect } from "react";

type FbqWindow = Window & { fbq?: (...args: unknown[]) => void };

/**
 * Tire l'événement de conversion au pixel, sur la page « candidature
 * retenue ».
 *
 * Ce composant n'est monté que si le **serveur** a vérifié que la session
 * correspond à une candidature retenue : visiter l'URL à la main ne déclenche
 * rien. C'est ce qui garantit qu'un profil non retenu ne remonte jamais.
 *
 * L'`eventID` est le même identifiant que celui de l'envoi Conversions API :
 * Meta dédoublonne les deux sur cette clé, et compte une conversion, pas deux.
 * Le garde en `sessionStorage` évite un second envoi au rechargement.
 */
export function HiringPing({
  eventName,
  eventId,
  roleSlug,
}: {
  eventName: string;
  eventId: string;
  roleSlug: string;
}) {
  useEffect(() => {
    const guard = `hiring_fired_${eventId}`;
    try {
      if (window.sessionStorage.getItem(guard) === "1") return;
    } catch {
      /* stockage indisponible : Meta dédoublonnera sur event_id de toute façon */
    }

    // Le pixel se charge en différé — quelques tentatives avant d'abandonner.
    let tries = 0;
    let timer: number | undefined;

    const attempt = () => {
      const fbq = (window as FbqWindow).fbq;
      if (typeof fbq === "function") {
        fbq("trackCustom", eventName, { content_name: roleSlug }, { eventID: eventId });
        try {
          window.sessionStorage.setItem(guard, "1");
        } catch {
          /* tant pis pour le garde local */
        }
        return;
      }
      tries += 1;
      if (tries < 25) timer = window.setTimeout(attempt, 200);
    };
    attempt();

    return () => window.clearTimeout(timer);
  }, [eventName, eventId, roleSlug]);

  return null;
}
