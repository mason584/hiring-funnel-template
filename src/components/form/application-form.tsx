"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Role } from "@/content/roles";
import { validateAnswer, type Answer, type Answers } from "@/lib/answers";
import type { ResolvedWordmark } from "@/lib/appearance";
import { checkPhone, dialFor } from "@/lib/phone";
import { getSessionId, readAttribution, readCookie } from "@/lib/session";
import { saveProgress, submitApplication } from "@/app/(public)/actions";
import { Wordmark } from "@/components/ui/primitives";
import { KEYS } from "./choices";
import { QuestionView } from "./question-view";
import styles from "./form.module.css";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE QUESTIONNAIRE — une question par écran.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce composant ne connaît aucun poste : il déroule `role.form.questions`. Le
 * contenu décide de tout, le moteur ne décide de rien — c'est ce qui permet
 * d'ouvrir un poste sans toucher une ligne de code.
 *
 * Trois choses le rendent rapide à remplir :
 *  · le clavier fait tout (Entrée avance, les lettres choisissent, ↑ recule) ;
 *  · un choix unique avance tout seul, sans clic de validation ;
 *  · chaque écran validé part au serveur, donc un abandon reste mesurable et
 *    un rechargement reprend là où on s'était arrêté.
 */

/** L'écran d'ouverture porte l'index −1 : la première question est 0. */
const INTRO = -1;

/**
 * Le brouillon laissé par une session précédente, borné à des valeurs sûres.
 *
 * Un brouillon illisible ou trafiqué ne doit jamais faire tomber le
 * formulaire : dans le doute, on repart de l'écran d'accueil.
 */
function readDraft(key: string, questionCount: number): { answers: Answers; index: number } {
  const empty = { answers: {} as Answers, index: INTRO };
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return empty;
    const draft = JSON.parse(raw) as { answers?: Answers; index?: number };
    return {
      answers: draft.answers ?? {},
      index:
        typeof draft.index === "number"
          ? Math.min(Math.max(draft.index, INTRO), questionCount - 1)
          : INTRO,
    };
  } catch {
    return empty;
  }
}

const variants = {
  enter: (direction: number) => ({ opacity: 0, y: direction > 0 ? 44 : -44 }),
  center: { opacity: 1, y: 0 },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? -44 : 44,
    transition: { duration: 0.16, ease: "easeIn" as const },
  }),
};

/*
 * Deux régimes, et c'est volontaire. La sortie est un fondu court et
 * mécanique : personne ne regarde une question qu'il vient de valider. L'entrée
 * est un ressort, qui donne la sensation d'un écran qui vient se poser.
 *
 * `AnimatePresence mode="wait"` les enchaîne, donc leurs durées s'ajoutent :
 * un ressort mou des deux côtés faisait attendre près d'une seconde et demie
 * entre deux questions — sur quatorze écrans, une éternité.
 */
const transition = {
  enter: { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 },
  exit: { duration: 0.16, ease: "easeIn" as const },
};

export function ApplicationForm({
  role,
  defaultDialCountry,
  wordmark,
}: {
  role: Role;
  defaultDialCountry: string;
  wordmark: ResolvedWordmark;
}) {
  const router = useRouter();
  const questions = role.form.questions;

  /**
   * Le brouillon est relu au tout premier rendu, pas dans un effet : ce
   * composant ne s'exécute que dans le navigateur (voir `form-loader.tsx`),
   * donc `sessionStorage` est déjà lisible et il n'y a aucun rendu serveur à
   * contredire. Un rechargement à la question 9 rouvre la question 9.
   */
  const draftKey = `hiring_draft_${role.slug}`;
  const [draft] = useState(() => readDraft(draftKey, questions.length));

  const [index, setIndex] = useState(draft.index);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Answers>(draft.answers);

  /**
   * Miroir des réponses, toujours à jour — et la raison d'être de ce commentaire.
   *
   * `advance` peut être appelée depuis un `setTimeout` : c'est l'avance
   * automatique d'un choix unique. La fonction capturée par le minuteur date
   * alors du rendu qui a précédé le clic, donc d'un état où la réponse tout
   * juste cochée n'existe pas encore. La validation refusait « Choisis une
   * réponse » sur la réponse que le candidat venait de choisir.
   *
   * Lire les réponses ici plutôt que dans la fermeture supprime la classe de
   * bug entière, pas seulement ce symptôme : toute validation différée voit
   * désormais l'état réel.
   */
  const answersRef = useRef(draft.answers);
  const [dialCountry, setDialCountry] = useState(defaultDialCountry);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [phase, setPhase] = useState<"form" | "sending">("form");

  /**
   * L'identifiant de session et l'attribution ne sont jamais rendus : ce sont
   * des références, pas des états. En faire des états déclencherait un rendu
   * de plus au montage, pour une valeur que personne ne regarde.
   */
  const attribution = useRef({ landingUrl: "", utm: {} as Record<string, string> });
  const leaving = useRef(false);
  /** Le minuteur de l'avance automatique, pour l'annuler s'il devient caduc. */
  const autoAdvance = useRef<number | undefined>(undefined);

  /* ── Reprise après rechargement ──────────────────────────────────────── */

  useEffect(() => {
    attribution.current = readAttribution();
  }, []);

  useEffect(() => {
    if (index === INTRO && Object.keys(answers).length === 0) return;
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify({ answers, index }));
    } catch {
      /* stockage indisponible : le serveur garde déjà l'avancement */
    }
  }, [answers, index, draftKey]);

  /* ── Enregistrement ──────────────────────────────────────────────────── */

  const payload = useCallback(
    (nextAnswers: Answers, step: string) => ({
      sessionId: getSessionId(),
      roleSlug: role.slug,
      answers: nextAnswers,
      stepReached: step,
      landingUrl: attribution.current.landingUrl,
      utm: attribution.current.utm,
      fbc: readCookie("_fbc"),
      fbp: readCookie("_fbp"),
    }),
    [role.slug]
  );

  const goToOutcome = useCallback(
    (outcome: "merci" | "suite") => {
      leaving.current = true;
      try {
        window.sessionStorage.removeItem(draftKey);
      } catch {
        /* rien à nettoyer */
      }
      const sid = encodeURIComponent(getSessionId());
      router.push(`/postes/${role.slug}/${outcome}?sid=${sid}`);
    },
    [draftKey, role.slug, router]
  );

  /* ── Navigation ──────────────────────────────────────────────────────── */

  const current = index >= 0 ? questions[index] : null;

  const validate = useCallback((): string | null => {
    if (!current) return null;

    // Le téléphone se juge contre le pays choisi dans le menu — seul cet
    // écran connaît ce pays, d'où la vérification ici plutôt que dans
    // `validateAnswer`.
    const value = answersRef.current[current.id];

    if (current.kind === "phone") {
      const raw = typeof value === "string" ? value : "";
      if (!raw.trim()) return "On a besoin d'un numéro pour te joindre.";
      const check = checkPhone(raw, dialCountry);
      return check.ok ? null : check.hint;
    }

    return validateAnswer(current, value);
  }, [current, dialCountry]);

  const advance = useCallback(async () => {
    if (phase !== "form" || leaving.current) return;

    // L'intro n'a rien à valider ni à enregistrer.
    if (index === INTRO) {
      setDirection(1);
      setIndex(0);
      return;
    }
    if (!current) return;

    const problem = validate();
    if (problem) {
      setError(problem);
      setShake((s) => s + 1);
      return;
    }
    setError(null);

    // Le numéro part au serveur complété de son indicatif : sans lui, un
    // « 6 12 34 56 78 » est inutilisable pour rappeler quelqu'un.
    const outgoing: Answers = { ...answersRef.current };
    if (current.kind === "phone") {
      const raw = (outgoing[current.id] as string) ?? "";
      outgoing[current.id] =
        raw.trim().startsWith("+") || raw.trim().startsWith("00")
          ? raw.trim()
          : `${dialFor(dialCountry)} ${raw.trim()}`;
      answersRef.current = outgoing;
      setAnswers(outgoing);
    }

    const last = index === questions.length - 1;

    if (last) {
      setPhase("sending");
      const result = await submitApplication(payload(outgoing, current.id));
      if (result.state === "error") {
        setPhase("form");
        setError(result.message);
        return;
      }
      goToOutcome(result.status === "qualified" ? "merci" : "suite");
      return;
    }

    // L'enregistrement part sans qu'on l'attende : l'écran suivant s'affiche
    // tout de suite, et une latence réseau ne se paie pas en fluidité.
    void saveProgress(payload(outgoing, current.id)).then((result) => {
      // Réponse éliminatoire sur une question qui coupe le parcours : inutile
      // de faire écrire deux paragraphes à quelqu'un qu'on n'appellera pas.
      if (result.exit) goToOutcome("suite");
    });

    setDirection(1);
    setIndex((i) => i + 1);
  }, [phase, index, current, validate, dialCountry, questions.length, payload, goToOutcome]);

  const back = useCallback(() => {
    if (index <= INTRO || phase !== "form") return;
    // Revenir en arrière pendant qu'une avance automatique est armée ferait
    // repartir en avant une demi-seconde plus tard.
    window.clearTimeout(autoAdvance.current);
    setError(null);
    setDirection(-1);
    setIndex((i) => i - 1);
  }, [index, phase]);

  // Un minuteur qui survivrait au démontage ferait avancer un formulaire
  // qui n'est plus à l'écran.
  useEffect(() => () => window.clearTimeout(autoAdvance.current), []);

  /* ── Clavier ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (phase !== "form") return;

      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if (event.key === "Enter" && !typing) {
        event.preventDefault();
        void advance();
        return;
      }

      if (event.key === "ArrowUp" && !typing) {
        event.preventDefault();
        back();
        return;
      }

      // Les lettres choisissent une option — mais jamais pendant qu'on écrit
      // dans un champ de précision.
      if (!typing && current && (current.kind === "single" || current.kind === "multi")) {
        const position = KEYS.indexOf(event.key.toUpperCase());
        const option = current.options?.[position];
        if (position >= 0 && option) {
          event.preventDefault();
          const button = document.querySelectorAll<HTMLButtonElement>(
            `[data-choices] button[role="radio"], [data-choices] button[role="checkbox"]`
          )[position];
          button?.click();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, back, current, phase]);

  /* ── Rendu ───────────────────────────────────────────────────────────── */

  const total = questions.length;
  const progress = useMemo(() => {
    if (index === INTRO) return 0;
    return Math.round(((index + (phase === "sending" ? 1 : 0)) / total) * 100);
  }, [index, total, phase]);

  const setAnswer = (next: Answer) => {
    if (!current) return;
    const merged = { ...answersRef.current, [current.id]: next };
    answersRef.current = merged;
    setAnswers(merged);
    if (error) setError(null);
  };

  return (
    <div className={styles.shell}>
      <div className={styles.progressTrack} aria-hidden>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      <header className={styles.head}>
        <Wordmark mark={wordmark} />
        {index >= 0 && (
          <span className="eyebrow">
            Question {index + 1} / {total}
          </span>
        )}
      </header>

      <div className={styles.stage}>
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={index}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition.enter}
            className={styles.screen}
          >
            {index === INTRO ? (
              <div className={styles.intro}>
                <h1 className={styles.label}>{role.form.intro.title}</h1>
                <p className={styles.introBody}>{role.form.intro.body}</p>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent)] px-6 text-[15px] font-medium text-[var(--text-on-accent)] transition-colors hover:bg-[var(--accent-deep)]"
                    onClick={() => void advance()}
                  >
                    {role.form.intro.cta}
                  </button>
                  <span className={styles.hint}>ou appuie sur Entrée ↵</span>
                </div>
              </div>
            ) : (
              current && (
                <>
                  <h1 className={styles.label}>{current.label}</h1>
                  {current.help && <p className={styles.help}>{current.help}</p>}

                  <motion.div
                    className={styles.fields}
                    data-choices
                    // La secousse signale l'erreur sans déplacer le regard :
                    // le message seul passe inaperçu sur un grand écran.
                    key={`fields-${shake}`}
                    animate={shake > 0 ? { x: [0, -7, 7, -4, 0] } : undefined}
                    transition={{ duration: 0.28 }}
                  >
                    <QuestionView
                      question={current}
                      value={answers[current.id]}
                      error={error}
                      dialCountry={dialCountry}
                      onDialCountry={setDialCountry}
                      onChange={setAnswer}
                      onPick={() => {
                        // Changer d'avis avant que le minuteur ne parte ne doit
                        // pas en armer un second.
                        window.clearTimeout(autoAdvance.current);
                        // Assez pour voir la coche, assez peu pour attendre.
                        autoAdvance.current = window.setTimeout(() => void advance(), 350);
                      }}
                      onSubmit={() => void advance()}
                    />
                  </motion.div>

                  {error && (
                    <p className={styles.error} role="alert" aria-live="assertive">
                      {error}
                    </p>
                  )}

                  <div className={styles.actions}>
                    {phase === "sending" ? (
                      <span className={styles.sending}>
                        <span className={styles.spinner} aria-hidden />
                        Envoi de ta candidature…
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-6 text-[15px] font-medium text-[var(--text-on-accent)] transition-colors hover:bg-[var(--accent-deep)]"
                          onClick={() => void advance()}
                        >
                          {index === total - 1 ? "Envoyer ma candidature" : "OK"}
                          <span aria-hidden>✓</span>
                        </button>
                        <span className={styles.hint}>
                          {current.kind === "long"
                            ? "Cmd/Ctrl + Entrée pour continuer"
                            : "ou appuie sur Entrée ↵"}
                        </span>
                      </>
                    )}
                  </div>
                </>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className={styles.nav} aria-label="Navigation dans le questionnaire">
        <button
          type="button"
          className={styles.navButton}
          onClick={back}
          disabled={index <= INTRO || phase !== "form"}
          aria-label="Question précédente"
        >
          ↑
        </button>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => void advance()}
          disabled={phase !== "form"}
          aria-label="Question suivante"
        >
          ↓
        </button>
      </nav>
    </div>
  );
}
