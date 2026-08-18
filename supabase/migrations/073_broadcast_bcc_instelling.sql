-- Losse instelling voor de broadcast-mail: standaard verstuurt een broadcast
-- alle ontvangers via BCC, zodat klanten elkaars e-mailadres niet zien. Deze
-- schakelaar is bewust apart van mail_bcc_actief (de interne bewakingskopie)
-- omdat uitzetten hier een privacy-impact heeft: ontvangers zien dan elkaars
-- adres in het aan-veld. Default true = huidige (veilige) gedrag blijft
-- ongewijzigd totdat een admin dit expliciet uitzet.
alter table administraties
  add column if not exists broadcast_bcc_actief boolean not null default true;
