/**
 * Vérification du verdict — la décision qui commande l'événement Meta.
 *
 *   pnpm tsx scripts/check-verdict.ts
 *
 * Ce n'est pas une suite de tests complète : c'est le filet sur la seule règle
 * qu'on ne peut pas se permettre de casser en éditant un fichier de poste. Un
 * profil éliminé qui remonterait à Meta apprendrait à l'algorithme à en
 * ramener d'autres — et sur une campagne d'emploi, où le ciblage est bridé,
 * c'est le seul signal qu'on maîtrise.
 */
import { closer } from "@/content/roles/closer";
import { computeVerdict } from "@/lib/verdict";
import type { Answers } from "@/lib/answers";

const complet: Answers = {
  identity: { first: "Camille", last: "Verlaine" },
  phone: "+33612345678",
  email: "camille@exemple.com",
  age: { choice: "25 à 34 ans" },
  availability: { choice: "Sous 2 semaines" },
  frequency: { choice: "Temps plein, 5 jours par semaine" },
  slots: { choices: ["Matin (9 h – 12 h)"] },
  training: {
    choices: ["Formation payante (académie, programme)"],
    details: { "Formation payante (académie, programme)": "Closer Evolution" },
  },
  income: { choice: "4 000 à 7 000 € par mois" },
  experience_years: { choice: "2 à 5 ans" },
  experience_offers: { choices: ["Coaching, formation en ligne (infopreneur)"] },
  experience_ticket: { choice: "3 000 à 10 000 €" },
  experience_story:
    "14 mois chez Reboot sur du coaching immobilier à 6 000 €, leads Meta avec setting en amont. Une soixantaine d'appels par mois, 22 % de closing.",
  why_you:
    "Je fais mes suivis. La plupart des closers lâchent après deux relances, moi je tiens un tableau et je rappelle jusqu'à obtenir un oui ou un non clair.",
};

type Case = {
  nom: string;
  answers: Answers;
  attendu: "qualified" | "disqualified";
  /** Les ids de questions attendus dans `disqualifiedBy`. */
  fautives?: string[];
};

const cas: Case[] = [
  { nom: "Profil complet et sérieux", answers: complet, attendu: "qualified" },
  {
    nom: "Mineur",
    answers: { ...complet, age: { choice: "Moins de 18 ans" } },
    attendu: "disqualified",
    fautives: ["age"],
  },
  {
    nom: "Disponible dans plus de 3 mois",
    answers: { ...complet, availability: { choice: "Dans plus de 3 mois" } },
    attendu: "disqualified",
    fautives: ["availability"],
  },
  {
    nom: "Moins de 3 jours par semaine",
    answers: { ...complet, frequency: { choice: "1 à 2 jours par semaine" } },
    attendu: "disqualified",
    fautives: ["frequency"],
  },
  {
    nom: "Clavier écrasé sur les deux questions ouvertes",
    answers: {
      ...complet,
      experience_story: "azertyazertyazertyazertyazertyazertyazertyazertyazertyazerty",
      why_you:
        "qsdfghjklmqsdfghjklmqsdfghjklmqsdfghjklmqsdfghjklmqsdfghjklmqsdfghjklmqsdfghjklm",
    },
    attendu: "disqualified",
    fautives: ["experience_story", "why_you"],
  },
  {
    nom: "Réponse ouverte trop courte",
    answers: { ...complet, why_you: "Je suis motivé." },
    attendu: "disqualified",
    fautives: ["why_you"],
  },
  {
    nom: "Débutant sincère — retenu, le score ne tranche pas",
    answers: {
      ...complet,
      training: { choices: ["Pas encore formé, je débute"] },
      income: { choice: "Moins de 2 000 € par mois" },
      experience_years: { choice: "Je débute" },
      experience_ticket: { choice: "Moins de 1 000 €" },
    },
    attendu: "qualified",
  },
  {
    nom: "Questionnaire à peine entamé",
    answers: { identity: { first: "Léa", last: "Morin" } },
    attendu: "disqualified",
  },
  {
    // Une requête forgée qui sauterait les questions à choix ne doit pas
    // produire une candidature retenue — et donc un événement Meta.
    nom: "Requête forgée : seules les questions ouvertes remplies",
    answers: {
      identity: complet.identity,
      phone: complet.phone,
      email: complet.email,
      experience_story: complet.experience_story,
      why_you: complet.why_you,
    },
    attendu: "disqualified",
    fautives: [
      "age",
      "availability",
      "frequency",
      "slots",
      "training",
      "income",
      "experience_years",
      "experience_offers",
      "experience_ticket",
    ],
  },
  {
    // Une précision demandée mais laissée vide vaut une réponse manquante.
    nom: "Option à précision, précision absente",
    answers: {
      ...complet,
      training: { choices: ["Formation payante (académie, programme)"] },
    },
    attendu: "disqualified",
    fautives: ["training"],
  },
];

let echecs = 0;

for (const c of cas) {
  const verdict = computeVerdict(closer, c.answers);
  const statutOk = verdict.status === c.attendu;
  const fautivesOk =
    !c.fautives ||
    (c.fautives.every((id) => verdict.disqualifiedBy.includes(id)) &&
      verdict.disqualifiedBy.length === c.fautives.length);

  if (statutOk && fautivesOk) {
    console.log(`  ✓ ${c.nom} → ${verdict.status} (score ${verdict.score})`);
  } else {
    echecs += 1;
    console.error(`  ✗ ${c.nom}`);
    console.error(`     attendu  : ${c.attendu} ${c.fautives ? `par [${c.fautives}]` : ""}`);
    console.error(`     obtenu   : ${verdict.status} par [${verdict.disqualifiedBy}]`);
  }
}

// Le score doit départager, sans jamais éliminer seul tant que minScore vaut 0.
const scoreFort = computeVerdict(closer, complet).score;
const scoreFaible = computeVerdict(closer, {
  ...complet,
  training: { choices: ["Pas encore formé, je débute"] },
  income: { choice: "Moins de 2 000 € par mois" },
  experience_years: { choice: "Je débute" },
  experience_ticket: { choice: "Moins de 1 000 €" },
}).score;

if (scoreFort > scoreFaible) {
  console.log(`  ✓ Le score classe : confirmé ${scoreFort} > débutant ${scoreFaible}`);
} else {
  echecs += 1;
  console.error(`  ✗ Le score ne classe pas : ${scoreFort} vs ${scoreFaible}`);
}

console.log(echecs === 0 ? "\n✓ Verdict conforme.\n" : `\n✗ ${echecs} écart(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
