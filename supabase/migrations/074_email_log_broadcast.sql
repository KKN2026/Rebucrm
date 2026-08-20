-- Broadcast-mails hebben geen individuele relatie; de app logt ze zonder
-- relatie_id. Door de NOT NULL-constraint faalde die insert altijd stilletjes
-- (Supabase-fout werd genegeerd), waardoor broadcasts nooit in het logboek
-- verschenen. KKN heeft relatie_id al nullable.
ALTER TABLE email_log ALTER COLUMN relatie_id DROP NOT NULL;
