/**
 * Base d'aperçu — un jeu de démonstration réaliste, pour cliquer dans tout le
 * produit avant d'avoir créé le moindre compte.
 *
 *   pnpm preview:setup
 *
 * Efface et reconstruit `.preview-db`. Le sidecar doit être arrêté.
 */
import { readFileSync, readdirSync, rmSync } from "node:fs";
import { createConnection } from "node:net";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { applications, visits } from "./schema";

const PORT = 5503;

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000);

async function main() {
  // Le sidecar tient la base ouverte : re-seeder pendant qu'il tourne la
  // corromprait. On vérifie que le port est libre avant de toucher à quoi que
  // ce soit.
  const sidecarUp = await new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port: PORT });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 500);
  });
  if (sidecarUp) {
    console.error(`✗ L'aperçu tourne encore (base ouverte sur 127.0.0.1:${PORT}).`);
    console.error("  Arrête `pnpm preview` avant de relancer preview:setup.");
    process.exit(1);
  }

  console.log("→ Réinitialisation de la base d'aperçu…");
  rmSync(".preview-db", { recursive: true, force: true });

  const client = new PGlite(".preview-db");
  const db = drizzle(client, { schema });

  const dir = join(process.cwd(), "drizzle");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }
  console.log(`  ✓ schéma appliqué (${files.length} fichier(s))`);

  /* ── Visites ───────────────────────────────────────────────────────────── */
  const PATHS: [string, string | null, number][] = [
    ["/", null, 1],
    ["/", null, 3],
    ["/postes/closer", "closer", 2],
    ["/postes/closer", "closer", 4],
    ["/postes/closer", "closer", 6],
    ["/postes/closer", "closer", 9],
    ["/postes/closer", "closer", 12],
    ["/postes/closer", "closer", 18],
    ["/postes/closer", "closer", 26],
    ["/postes/closer", "closer", 31],
    ["/postes/closer", "closer", 44],
    ["/postes/closer", "closer", 52],
    ["/postes/closer/candidater", "closer", 5],
    ["/postes/closer/candidater", "closer", 13],
    ["/postes/closer/candidater", "closer", 27],
    ["/postes/closer/candidater", "closer", 45],
  ];
  await db.insert(visits).values(
    PATHS.map(([path, roleSlug, age], i) => ({
      sessionId: `demo-visite-${i}`,
      roleSlug,
      path,
      landingUrl: `https://exemple.com${path}`,
      utm: i % 3 === 0 ? { utm_source: "fb", utm_medium: "paid", utm_campaign: "recrut-closer" } : {},
      country: "FR",
      createdAt: hoursAgo(age),
    }))
  );
  console.log(`  ✓ ${PATHS.length} visites`);

  /* ── Candidatures ──────────────────────────────────────────────────────── */
  // Trois états, pour voir la table, l'entonnoir et les deux fiches :
  // retenue et remontée à Meta, abandonnée en route, éliminée sur la
  // disponibilité.
  await db.insert(applications).values([
    {
      sessionId: "demo-retenue",
      roleSlug: "closer",
      firstName: "Camille",
      lastName: "Verlaine",
      email: "camille@exemple.com",
      phoneNumber: "+33612345678",
      answers: {
        identity: { first: "Camille", last: "Verlaine" },
        phone: "+33612345678",
        email: "camille@exemple.com",
        age: { choice: "25 à 34 ans" },
        availability: { choice: "Sous 2 semaines" },
        frequency: { choice: "Temps plein, 5 jours par semaine" },
        slots: { choices: ["Matin (9 h – 12 h)", "Après-midi (14 h – 18 h)"] },
        training: {
          choices: ["Formation payante (académie, programme)", "Formé en interne dans une entreprise"],
          details: {
            "Formation payante (académie, programme)": "Closer Evolution",
            "Formé en interne dans une entreprise": "Agence Reboot",
          },
        },
        income: { choice: "4 000 à 7 000 € par mois" },
        experience_years: { choice: "2 à 5 ans" },
        experience_offers: { choices: ["Coaching, formation en ligne (infopreneur)", "Agence, prestation de services"] },
        experience_ticket: { choice: "3 000 à 10 000 €" },
        experience_story:
          "14 mois chez Reboot sur du coaching immobilier à 6 000 €, leads Meta avec setting en amont. Une soixantaine d'appels par mois, 22 % de closing sur les six derniers mois. Avant ça, un an de télévente en assurance, ce qui m'a appris le volume et la relance.",
        why_you:
          "Je fais mes suivis. La plupart des closers lâchent après deux relances, moi je tiens un tableau et je rappelle jusqu'à obtenir un oui ou un non clair. Sur mon dernier poste, un tiers de mon chiffre venait de dossiers signés après le troisième contact.",
      },
      stepReached: "submitted",
      status: "qualified",
      disqualifiedBy: [],
      score: 11,
      metaEventSentAt: hoursAgo(26),
      metaEventDetail: "events_received=1 · fbtrace AbCd1234",
      landingUrl: "https://exemple.com/postes/closer?utm_source=fb&utm_medium=paid",
      utm: { utm_source: "fb", utm_medium: "paid", utm_campaign: "recrut-closer" },
      createdAt: hoursAgo(27),
      updatedAt: hoursAgo(26),
      submittedAt: hoursAgo(26),
    },
    {
      sessionId: "demo-en-cours",
      roleSlug: "closer",
      firstName: "Rachid",
      lastName: "Benali",
      email: "rachid@exemple.com",
      phoneNumber: "+33698765432",
      answers: {
        identity: { first: "Rachid", last: "Benali" },
        phone: "+33698765432",
        email: "rachid@exemple.com",
        age: { choice: "35 à 44 ans" },
        availability: { choice: "Sous 1 mois" },
        frequency: { choice: "3 jours par semaine" },
        slots: { choices: ["Soir (18 h – 21 h)", "Week-end"] },
      },
      stepReached: "training",
      status: "partial",
      score: 1,
      landingUrl: "https://exemple.com/postes/closer",
      utm: {},
      createdAt: hoursAgo(9),
      updatedAt: hoursAgo(8.7),
    },
    {
      sessionId: "demo-eliminee",
      roleSlug: "closer",
      firstName: "Léa",
      lastName: "Morin",
      email: "lea@exemple.com",
      phoneNumber: "+33755112233",
      answers: {
        identity: { first: "Léa", last: "Morin" },
        phone: "+33755112233",
        email: "lea@exemple.com",
        age: { choice: "18 à 24 ans" },
        availability: { choice: "Dans plus de 3 mois" },
      },
      stepReached: "availability",
      status: "disqualified",
      disqualifiedBy: ["availability"],
      score: 0,
      landingUrl: "https://exemple.com/postes/closer?utm_source=ig&utm_medium=bio",
      utm: { utm_source: "ig", utm_medium: "bio" },
      createdAt: hoursAgo(50),
      updatedAt: hoursAgo(50),
      submittedAt: hoursAgo(50),
    },
  ]);

  // De quoi donner sa forme à l'entonnoir : prénom, dernier écran, âge en heures.
  const CROWD: [string, string, string, number][] = [
    ["Sonia", "identity", "partial", 3],
    ["Marc", "phone", "partial", 30],
    ["Inès", "age", "partial", 7],
    ["Paul", "availability", "partial", 14],
    ["Nadia", "frequency", "partial", 33],
    ["Hugo", "training", "partial", 16],
    ["Awa", "income", "partial", 40],
    ["Théo", "experience_years", "partial", 18],
    ["Lisa", "experience_story", "partial", 22],
    ["Yanis", "submitted", "qualified", 45],
    ["Bilal", "submitted", "qualified", 61],
    ["Chloé", "frequency", "disqualified", 20],
    ["Ryan", "age", "disqualified", 38],
  ];
  await db.insert(applications).values(
    CROWD.map(([firstName, step, status, age], i) => ({
      sessionId: `demo-foule-${i}`,
      roleSlug: "closer",
      firstName,
      lastName: "Démo",
      email: `${firstName.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}@exemple.com`,
      answers: { identity: { first: firstName, last: "Démo" } },
      stepReached: step,
      status,
      disqualifiedBy: status === "disqualified" ? [step] : [],
      score: status === "qualified" ? 8 : 2,
      submittedAt: step === "submitted" || status === "disqualified" ? hoursAgo(age) : null,
      createdAt: hoursAgo(age),
      updatedAt: hoursAgo(age - 0.2),
    }))
  );
  console.log(`  ✓ ${3 + CROWD.length} candidatures`);

  console.log("\n✓ Base d'aperçu prête. Lance `pnpm preview`.\n");
  await client.close();
  process.exit(0);
}

main().catch((error) => {
  console.error("✗ Échec du seed :", error);
  process.exit(1);
});
