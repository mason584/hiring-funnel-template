import type { Metadata } from "next";
import { BRAND } from "@/brand/brand";

/**
 * Politique de confidentialité — gabarit alimenté par `brand.ts`.
 *
 * Obligatoire dès lors qu'on collecte des candidatures et qu'on pose un pixel
 * publicitaire. Le texte couvre les mentions attendues par le RGPD :
 * responsable, finalité, base légale, durée, destinataires, droits. À faire
 * relire par un juriste avant une mise en production sérieuse.
 */
export const metadata: Metadata = {
  title: "Confidentialité",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  const years = Math.round(BRAND.retentionMonths / 12);

  const sections: { title: string; body: string[] }[] = [
    {
      title: "Qui traite tes données",
      body: [
        `${BRAND.legalName} est responsable du traitement des données collectées sur ce site de recrutement. Pour toute question, écris à ${BRAND.contact.email}.`,
      ],
    },
    {
      title: "Ce qu'on collecte, et pourquoi",
      body: [
        "Les réponses que tu donnes dans le formulaire de candidature : ton identité, tes coordonnées, et les éléments qui décrivent ton parcours professionnel. Ces informations servent uniquement à étudier ta candidature et à te recontacter.",
        "Des données de fréquentation : les pages consultées, la provenance de ta visite (campagne publicitaire, lien direct) et des identifiants techniques. Elles servent à mesurer l'efficacité de nos annonces.",
      ],
    },
    {
      title: "Sur quelle base légale",
      body: [
        "L'étude de ta candidature relève des mesures précontractuelles prises à ta demande. La mesure d'audience publicitaire repose sur notre intérêt légitime à savoir quelles annonces trouvent des candidats.",
      ],
    },
    {
      title: "Combien de temps",
      body: [
        `Ta candidature est conservée ${BRAND.retentionMonths} mois (soit ${years} an${years > 1 ? "s" : ""}) après notre dernier échange, conformément à la recommandation de la CNIL en matière de recrutement. Passé ce délai, elle est supprimée.`,
      ],
    },
    {
      title: "Qui d'autre y a accès",
      body: [
        `L'équipe de ${BRAND.legalName} chargée du recrutement. Nos prestataires techniques hébergent les données pour notre compte : ${BRAND.host.name} (hébergement du site et de la base).`,
        "Si tu es retenu, une information de conversion est transmise à Meta pour mesurer nos campagnes publicitaires. Elle ne contient ni tes réponses, ni ton âge, ni ta rémunération : uniquement des identifiants chiffrés à sens unique et l'intitulé du poste.",
      ],
    },
    {
      title: "Tes droits",
      body: [
        `Tu peux demander l'accès à tes données, leur correction, leur suppression, ou t'opposer à leur traitement, en écrivant à ${BRAND.contact.email}. Tu peux également introduire une réclamation auprès de la CNIL.`,
      ],
    },
    {
      title: "Cookies et traceurs",
      body: [
        "Ce site utilise le pixel de mesure Meta pour attribuer les candidatures aux campagnes publicitaires. Tu peux le bloquer via les réglages de ton navigateur ou une extension de blocage : le formulaire de candidature fonctionne sans lui.",
      ],
    },
  ];

  return (
    <article className="mx-auto max-w-2xl px-5 py-16 sm:px-10 sm:py-24">
      <h1 className="font-display text-[clamp(30px,4.4vw,44px)]">Confidentialité</h1>
      <p className="mt-4 text-[var(--text-muted)]">
        Comment {BRAND.legalName} traite les données des candidats.
      </p>

      <div className="mt-12 flex flex-col gap-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-[22px]">{section.title}</h2>
            <div className="mt-3 flex flex-col gap-3">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-[var(--text-secondary)]">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
