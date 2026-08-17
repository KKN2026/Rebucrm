-- Losse aan/uit-schakelaar voor de universele BCC, naast het bcc-adres zelf.
-- Zo kan een BCC-adres bewaard blijven terwijl je 'm tijdelijk uitzet, zonder
-- het veld leeg te hoeven maken (en zo de instelling kwijt te raken).
-- Default true zodat een al ingevuld mail_bcc-adres actief blijft na deze migratie.
alter table administraties
  add column if not exists mail_bcc_actief boolean not null default true;
