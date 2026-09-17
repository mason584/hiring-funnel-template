-- Sur Supabase, toute table du schéma public est exposée par l'API REST
-- (PostgREST) avec la clé anonyme, qui est publique par construction. Sans
-- RLS, les candidatures se liraient depuis n'importe quel navigateur. Le
-- tunnel, lui, se connecte avec le rôle postgres, qui contourne RLS : activer
-- RLS sans aucune policy ferme l'API REST et ne change rien pour l'application.
ALTER TABLE "applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Ceinture et bretelles : retirer aussi les droits que Supabase accorde par
-- défaut aux rôles de l'API. Les rôles n'existent pas hors Supabase (aperçu
-- PGlite, Postgres nu), d'où la garde. Même garde pour la table de suivi des
-- migrations, qui n'existe qu'une fois le migrateur passé : son schéma n'est
-- pas exposé, mais le tableau de bord Supabase signale toute table sans RLS.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "applications", "settings", "visits" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "applications", "settings", "visits" FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'drizzle' AND tablename = '__hiring_migrations') THEN
    ALTER TABLE drizzle.__hiring_migrations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
