"use client";

import dynamic from "next/dynamic";
import type { Role } from "@/content/roles";
import { Wordmark } from "@/components/ui/primitives";
import type { ResolvedWordmark } from "@/lib/appearance";
import styles from "./form.module.css";

/**
 * Le questionnaire est chargé côté navigateur uniquement.
 *
 * Son état initial vit dans `sessionStorage` — le brouillon de quelqu'un qui
 * recharge à la question 9. Un rendu serveur ne peut pas le connaître : il
 * produirait l'écran d'accueil, aussitôt remplacé par la bonne question, et le
 * visiteur croirait avoir tout perdu.
 *
 * Le rendre client-seul supprime le problème à la racine plutôt que de le
 * rattraper après coup, et le squelette ci-dessous occupe la place le temps du
 * chargement.
 */
const ApplicationForm = dynamic(
  () => import("./application-form").then((m) => m.ApplicationForm),
  {
    ssr: false,
    loading: () => (
      <div className={styles.shell}>
        <div className={styles.progressTrack} aria-hidden />
        <header className={styles.head}>
          <Wordmark />
        </header>
        <div className={styles.stage} aria-hidden />
      </div>
    ),
  }
);

export function FormLoader({
  role,
  defaultDialCountry,
  wordmark,
}: {
  role: Role;
  defaultDialCountry: string;
  wordmark: ResolvedWordmark;
}) {
  return (
    <ApplicationForm role={role} defaultDialCountry={defaultDialCountry} wordmark={wordmark} />
  );
}
