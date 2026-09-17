import { roleSchema, type Role } from "./types";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLOSER — le premier poste du tunnel.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tout se modifie ici : la fiche, les quatorze questions, les seuils
 * éliminatoires, les deux textes de sortie. Le moteur ne connaît rien de ce
 * fichier — dupliquer ce modèle suffit à ouvrir un poste de setter ou
 * d'assistant marketing.
 *
 * Trois conventions à respecter en éditant :
 *  · un `id` de question ne se renomme pas — c'est la clé de stockage des
 *    réponses déjà reçues ;
 *  · `disqualifies` arrête le parcours sur place (sauf `exitOnDisqualify:
 *    false`) : ne le poser que sur un critère objectif et non négociable ;
 *  · le `score` ne sert qu'à trier dans l'administration tant que `minScore`
 *    vaut 0. Le monter rend le tri automatique plus sévère.
 */

export const closer: Role = roleSchema.parse({
  slug: "closer", // → /postes/closer, événement Meta hiring_closer
  status: "open",
  title: "Closer",
  teaser: "Tu prends des appels qualifiés sur une offre d'accompagnement high ticket.",

  /* ── La fiche du poste ─────────────────────────────────────────────────── */
  page: {
    headline: "Closer — appels qualifiés, offre high ticket",
    lede:
      "Tu prends les appels que notre tunnel génère. Des dirigeants qui font déjà du chiffre, qui ont regardé la vidéo, rempli le formulaire, et choisi leur créneau. Ton travail : comprendre où ils en sont, et leur dire honnêtement si on peut les aider.",
    tags: ["À distance", "Freelance", "Commission"],

    sections: [
      {
        title: "Ta mission",
        bullets: true,
        body: [
          "Prendre les appels de qualification et de vente sur notre offre d'accompagnement.",
          "Mener l'entretien de bout en bout : diagnostic, cadrage, décision.",
          "Faire tes suivis — relances, réponses aux objections, closing des dossiers en attente.",
          "Renseigner le CRM après chaque appel, sans exception.",
          "Débriefer tes appels avec l'équipe et appliquer les retours.",
        ],
      },
      {
        title: "Le profil qu'on cherche",
        bullets: true,
        body: [
          "Tu as déjà closé au téléphone ou en visio, sur des tickets à quatre chiffres au minimum.",
          "Tu sais tenir un cadre sans forcer : nos prospects sont des dirigeants, pas des impulsifs.",
          "Tu es disponible au moins trois jours par semaine, sur des créneaux stables.",
          "Tu écris correctement — tes notes sont lues par toute l'équipe.",
          "Tu acceptes d'être écouté, repris, et de retravailler ta façon de faire.",
        ],
      },
      {
        title: "Ce qu'on met en face",
        body: [
          "Rémunération à la commission, sans plafond. Les closers en place sur ce type d'offre se situent entre 4 000 € et 12 000 € par mois selon leur volume et leur taux de closing.",
          "Des rendez-vous fournis : tu ne prospectes pas, tu ne remplis pas ton agenda toi-même.",
          "Une formation à notre offre et à notre process de vente sur les deux premières semaines, puis un accompagnement continu.",
        ],
      },
      {
        title: "Comment ça se passe ensuite",
        bullets: true,
        body: [
          "Tu remplis ce formulaire — trois minutes.",
          "On lit ta candidature à la main sous 48 h.",
          "Premier échange de quinze minutes en visio.",
          "Mise en situation sur un appel type, puis décision.",
        ],
      },
    ],

    cta: "Candidater",
    ctaNote: "3 minutes · 14 questions · réponse sous 48 h",
  },

  /* ── Le questionnaire ──────────────────────────────────────────────────── */
  form: {
    intro: {
      title: "Candidature — Closer",
      body: "Quatorze questions, trois minutes. Réponds franchement : on cherche un profil précis, et se tromper mutuellement coûte du temps aux deux.",
      cta: "Commencer",
    },

    minScore: 0, // seules les questions éliminatoires tranchent

    questions: [
      {
        id: "identity",
        kind: "name",
        label: "Commençons par toi. Ton prénom et ton nom ?",
      },
      {
        id: "phone",
        kind: "phone",
        label: "Ton numéro de téléphone.",
        help: "De préférence celui sur lequel tu as WhatsApp — c'est là qu'on te répond.",
      },
      {
        id: "email",
        kind: "email",
        label: "Ton adresse email.",
        placeholder: "prenom@exemple.com",
      },
      {
        id: "age",
        kind: "single",
        label: "Ton âge ?",
        options: [
          { label: "Moins de 18 ans", disqualifies: true },
          { label: "18 à 24 ans" },
          { label: "25 à 34 ans" },
          { label: "35 à 44 ans" },
          { label: "45 ans et plus" },
        ],
      },
      {
        id: "availability",
        kind: "single",
        label: "À partir de quand es-tu disponible ?",
        options: [
          { label: "Immédiatement", score: 1 },
          { label: "Sous 2 semaines", score: 1 },
          { label: "Sous 1 mois" },
          { label: "Dans 1 à 3 mois" },
          { label: "Dans plus de 3 mois", disqualifies: true },
        ],
      },
      {
        id: "frequency",
        kind: "single",
        label: "À quelle fréquence peux-tu prendre des appels ?",
        help: "Sois réaliste : c'est ce qu'on inscrira dans le planning.",
        options: [
          { label: "Temps plein, 5 jours par semaine", score: 2 },
          { label: "4 jours par semaine", score: 2 },
          { label: "3 jours par semaine", score: 1 },
          { label: "1 à 2 jours par semaine", disqualifies: true },
          { label: "Ponctuellement, selon mon emploi du temps", disqualifies: true },
        ],
      },
      {
        id: "slots",
        kind: "multi",
        label: "Sur quels créneaux es-tu joignable ?",
        help: "Plusieurs réponses possibles.",
        min: 1,
        options: [
          { label: "Matin (9 h – 12 h)" },
          { label: "Après-midi (14 h – 18 h)" },
          { label: "Soir (18 h – 21 h)" },
          { label: "Week-end" },
        ],
      },
      {
        id: "training",
        kind: "multi",
        label: "Comment t'es-tu formé au closing ?",
        help: "Plusieurs réponses possibles.",
        min: 1,
        options: [
          {
            label: "Formation payante (académie, programme)",
            score: 2,
            followUp: { label: "Laquelle ?", placeholder: "Nom de la formation" },
          },
          {
            label: "Formé en interne dans une entreprise",
            score: 2,
            followUp: { label: "Où ?", placeholder: "Nom de l'entreprise" },
          },
          { label: "Autodidacte (livres, YouTube, terrain)", score: 1 },
          { label: "École ou formation commerciale (BTS, école de commerce)", score: 1 },
          { label: "Pas encore formé, je débute" },
        ],
      },
      {
        id: "income",
        kind: "single",
        label: "Quelle est ta rémunération actuelle ?",
        help: "Ce que tu gagnes en moyenne par mois aujourd'hui, toutes activités confondues.",
        options: [
          { label: "Moins de 2 000 € par mois" },
          { label: "2 000 à 4 000 € par mois", score: 1 },
          { label: "4 000 à 7 000 € par mois", score: 2 },
          { label: "7 000 à 10 000 € par mois", score: 2 },
          { label: "Plus de 10 000 € par mois", score: 2 },
          {
            label: "Je n'ai pas encore de revenu de closing",
            followUp: {
              label: "Tu fais quoi aujourd'hui ?",
              placeholder: "Ton activité actuelle",
            },
          },
        ],
      },
      {
        id: "experience_years",
        kind: "single",
        label: "Depuis combien de temps tu closes ?",
        options: [
          { label: "Je débute" },
          { label: "Moins de 6 mois" },
          { label: "6 mois à 1 an", score: 1 },
          { label: "1 à 2 ans", score: 1 },
          { label: "2 à 5 ans", score: 2 },
          { label: "Plus de 5 ans", score: 2 },
        ],
      },
      {
        id: "experience_offers",
        kind: "multi",
        label: "Sur quels types d'offres as-tu vendu ?",
        help: "Plusieurs réponses possibles.",
        min: 1,
        options: [
          { label: "Coaching, formation en ligne (infopreneur)", score: 1 },
          { label: "Agence, prestation de services", score: 1 },
          { label: "Immobilier" },
          { label: "Assurance, finance" },
          { label: "SaaS, logiciel B2B" },
          { label: "Télévente, retail" },
          { label: "Autre", followUp: { label: "Précise", placeholder: "Le secteur" } },
        ],
      },
      {
        id: "experience_ticket",
        kind: "single",
        label: "Le ticket le plus élevé que tu aies vendu ?",
        help: "Le montant d'une seule vente, pas ton chiffre cumulé.",
        options: [
          { label: "Moins de 1 000 €" },
          { label: "1 000 à 3 000 €", score: 1 },
          { label: "3 000 à 10 000 €", score: 2 },
          { label: "Plus de 10 000 €", score: 2 },
        ],
      },
      {
        id: "experience_story",
        kind: "long",
        label: "Raconte tes expériences les plus marquantes.",
        help: "L'entreprise ou l'infopreneur, l'offre, d'où venaient les leads, combien de temps tu es resté, et les résultats que tu as faits.",
        placeholder:
          "Ex : 14 mois chez X, coaching immobilier à 6 000 €, leads Meta + setting. Environ 60 appels par mois, 22 % de closing sur la fin.",
        minLength: 60,
      },
      {
        id: "why_you",
        kind: "long",
        label: "Pourquoi devrions-nous travailler avec toi plutôt qu'un autre closer ?",
        help: "C'est la question qu'on lit en premier. Sois concret.",
        minLength: 80,
      },
    ],
  },

  /* ── Les deux sorties ──────────────────────────────────────────────────── */
  outcomes: {
    qualified: {
      title: "Candidature reçue, {prenom}.",
      body: [
        "On lit chaque candidature à la main. Si ton profil correspond à ce qu'on cherche, tu reçois un message sous 48 heures pour un premier échange de quinze minutes.",
        "En attendant, garde ton téléphone joignable sur les créneaux que tu nous as indiqués.",
      ],
      steps: [
        "Lecture de ta candidature — sous 48 h",
        "Premier échange de 15 minutes en visio",
        "Mise en situation sur un appel type",
        "Décision et démarrage",
      ],
    },
    disqualified: {
      title: "Merci, {prenom}.",
      body: [
        "Sur ce poste, on cherche un profil différent de celui que tu décris aujourd'hui. On préfère te le dire tout de suite plutôt que de te laisser attendre une réponse qui ne viendrait pas.",
        "Ta candidature est conservée. Si ta situation change — ta disponibilité, ton rythme, ton expérience — reviens candidater, on la relira avec plaisir.",
      ],
    },
  },
});
