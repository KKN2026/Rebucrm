import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// React's cache() dedupliceert binnen één request. getAdministratieId wordt
// in praktisch elke server-action aangeroepen — zonder cache betekent dat
// 5-10× per pagina-load een auth.getUser() + profielen-query. Met cache
// wordt het 1× per request.
export const getAdministratieIdCached = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const supabaseAdmin = createAdminClient()
  const { data: profiel } = await supabaseAdmin
    .from('profielen')
    .select('administratie_id')
    .eq('id', user.id)
    .single()

  return profiel?.administratie_id || null
})

// Idem voor de user-record zelf — wordt eveneens vaak los opgehaald.
export const getCurrentUserCached = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export interface AdministratieIntegratieInstellingen {
  standaard_btw_percentage: number | null
  standaard_betaaltermijn_dagen: number | null
  smtp_host: string | null
  smtp_port: number | null
  smtp_user: string | null
  smtp_pass: string | null
  smtp_from: string | null
  mail_bcc: string | null
  mail_bcc_actief: boolean
  broadcast_bcc_actief: boolean
  imap_host: string | null
  imap_port: number | null
  imap_user: string | null
  imap_pass: string | null
  mollie_api_key: string | null
  snelstart_client_key: string | null
  snelstart_subscription_key: string | null
}

// Instellingen (SMTP/IMAP/Mollie/SnelStart/BTW/betaaltermijn) die in /beheer
// per administratie zijn in te stellen. Gebruikt door de integratielagen
// (email.ts, imap.ts, mollie.ts, snelstart.ts) als DB-first bron, met de
// bestaande env-vars/hardcoded defaults als fallback zodra een veld leeg is.
//
// Zonder expliciete administratieId wordt de administratie van de huidige
// ingelogde gebruiker gebruikt (getAdministratieIdCached) — dat werkt voor
// interactief door een medewerker getriggerde acties. In cron-/webhook-
// context is er geen gebruikerssessie; daar valt dit terug op env-vars, tenzij
// de aanroeper zelf al een administratie_id bij de hand heeft en die expliciet
// meegeeft.
export const getIntegratieInstellingenCached = cache(async (
  administratieId?: string
): Promise<AdministratieIntegratieInstellingen | null> => {
  const adminId = administratieId || await getAdministratieIdCached()
  if (!adminId) return null

  const supabaseAdmin = createAdminClient()
  const { data } = await supabaseAdmin
    .from('administraties')
    .select(`
      standaard_btw_percentage, standaard_betaaltermijn_dagen,
      smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, mail_bcc, mail_bcc_actief, broadcast_bcc_actief,
      imap_host, imap_port, imap_user, imap_pass,
      mollie_api_key, snelstart_client_key, snelstart_subscription_key
    `)
    .eq('id', adminId)
    .maybeSingle()

  return data as AdministratieIntegratieInstellingen | null
})

// Standaard BTW-percentage bij het aanmaken van nieuwe product-/offerte-
// /factuurregels zonder expliciet gekozen percentage. Instelbaar via
// /beheer/algemeen; 21 blijft de fallback zodat bestaand gedrag niet wijzigt.
export async function getStandaardBtwPercentage(administratieId?: string): Promise<number> {
  const inst = await getIntegratieInstellingenCached(administratieId)
  return inst?.standaard_btw_percentage ?? 21
}

// Standaard betaaltermijn (dagen) voor nieuwe facturen zonder expliciet
// ingestelde vervaldatum. Instelbaar via /beheer/algemeen; 7 blijft de
// fallback zodat bestaand gedrag niet wijzigt.
export async function getStandaardBetaaltermijnDagen(administratieId?: string): Promise<number> {
  const inst = await getIntegratieInstellingenCached(administratieId)
  return inst?.standaard_betaaltermijn_dagen ?? 7
}

// Of een broadcast-mail ontvangers via BCC verstuurt (adressen verborgen voor
// elkaar) of niet. Instelbaar via /beheer/email; default true — uitzetten is
// een bewuste, apart gelabelde keuze omdat het e-mailadressen van ontvangers
// voor elkaar zichtbaar maakt.
export async function getBroadcastBccActief(administratieId?: string): Promise<boolean> {
  const inst = await getIntegratieInstellingenCached(administratieId)
  return inst?.broadcast_bcc_actief !== false
}
