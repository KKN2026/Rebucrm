-- Beheer-instellingen die voorheen alleen via env-vars/hardcoded defaults
-- werden geregeld, nu per administratie instelbaar vanuit het CRM (/beheer).
-- Alle kolommen zijn nullable: leeg = val terug op de bestaande env var /
-- hardcoded default, zodat bestaande omgevingen niet breken totdat een admin
-- de waarde expliciet invult.

alter table administraties
  add column if not exists standaard_btw_percentage integer default 21,
  add column if not exists standaard_betaaltermijn_dagen integer default 7,
  add column if not exists smtp_host text,
  add column if not exists smtp_port integer,
  add column if not exists smtp_user text,
  add column if not exists smtp_pass text,
  add column if not exists smtp_from text,
  add column if not exists mail_bcc text,
  add column if not exists imap_host text,
  add column if not exists imap_port integer,
  add column if not exists imap_user text,
  add column if not exists imap_pass text,
  add column if not exists mollie_api_key text,
  add column if not exists snelstart_client_key text,
  add column if not exists snelstart_subscription_key text;
