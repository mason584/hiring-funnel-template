import type { Role } from "@/content/roles";
import {
  isDisqualifying,
  totalScore,
  validateAnswer,
  type Answers,
} from "@/lib/answers";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE VERDICT — retenu ou non.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Calculé **à partir des réponses enregistrées**, jamais d'un drapeau envoyé
 * par le navigateur : c'est lui qui décide si un événement de conversion part
 * à Meta, et un formulaire est modifiable par qui le remplit.
 *
 * Trois causes d'élimination, et une seule suffit :
 *  · une option marquée éliminatoire a été choisie ;
 *  · une réponse requise manque ou ne passe pas sa validation — réponse vide,
 *    clavier écrasé, motif répété ;
 *  · le score n'atteint pas le minimum du poste (à 0 par défaut, donc inerte).
 *
 * La validation est refaite ici sur TOUTES les questions, pas seulement sur
 * les questions ouvertes, et pas seulement à l'écran. Le formulaire empêche
 * déjà d'avancer sans répondre, mais il tourne dans le navigateur : une
 * requête forgée qui n'enverrait que les deux paragraphes libres serait sinon
 * jugée « retenue » et déclencherait un événement de conversion pour un
 * candidat qui n'existe pas.
 */

export type Verdict = {
  status: "qualified" | "disqualified";
  /** Les ids des questions fautives — affichés dans l'administration. */
  disqualifiedBy: string[];
  score: number;
};

export function computeVerdict(role: Role, answers: Answers): Verdict {
  const disqualifiedBy: string[] = [];

  for (const question of role.form.questions) {
    const value = answers[question.id];

    if (isDisqualifying(question, value)) {
      disqualifiedBy.push(question.id);
      continue;
    }

    if (validateAnswer(question, value)) {
      disqualifiedBy.push(question.id);
    }
  }

  const score = totalScore(role, answers);
  const belowScore = score < role.form.minScore;

  return {
    status: disqualifiedBy.length === 0 && !belowScore ? "qualified" : "disqualified",
    disqualifiedBy,
    score,
  };
}

/**
 * Le verdict partiel d'un candidat encore dans le formulaire.
 *
 * Sert uniquement à décider d'une sortie anticipée : dès qu'une réponse
 * éliminatoire tombe sur une question qui coupe le parcours, inutile de lui
 * faire écrire deux paragraphes.
 */
export function shouldExitNow(role: Role, questionId: string, answers: Answers): boolean {
  const question = role.form.questions.find((q) => q.id === questionId);
  if (!question || !question.exitOnDisqualify) return false;
  return isDisqualifying(question, answers[questionId]);
}
