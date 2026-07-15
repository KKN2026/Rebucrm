import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFactuurEmailDefaults, sendFactuurEmail } from '@/lib/actions'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * TIJDELIJK herstel-endpoint (concept-PDF-bug, 27 mei t/m 15 juli 2026).
 *
 * Facturen die per mail verstuurd werden terwijl ze nog op 'concept' stonden
 * kregen een PDF-bijlage met 'CONCEPT FACTUUR' erop, zonder factuur- en
 * vervaldatum. Dit endpoint mailt die klanten een gecorrigeerd exemplaar.
 *
 * Detectie: de eerste 'factuur.email_verzonden' audit-entry viel op dezelfde
 * dag als de factuurdatum — concept-facturen kregen hun datum immers pas op
 * het moment van verzenden. Latere hermails gingen wél met een correcte PDF.
 *
 * Beschermd met service-role key header (x-admin-key), net als
 * /api/admin/hermail-openstaand. Aanroepen met:
 *   { dryRun?: boolean, nummers?: string[], limit?: number, bcc?: string }
 * - dryRun: alleen de lijst teruggeven, niets mailen
 * - nummers: alleen deze factuurnummers behandelen
 * - limit: max aantal mails per call (batchen i.v.m. maxDuration)
 * - bcc: extra bcc-adres per mail
 *
 * Na afloop van de herstelactie kan dit bestand weer weg.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-key')
  if (!secret || secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as {
    dryRun?: boolean; nummers?: string[]; limit?: number; bcc?: string
  }

  const sb = createAdminClient()

  // Alle mail-verzendingen sinds de introductie van de concept-PDF (27 mei).
  // Herstelmails van dit endpoint zelf (details.herzending) tellen niet mee.
  const { data: audits } = await sb
    .from('audit_log')
    .select('entiteit_id, created_at, details')
    .eq('actie', 'factuur.email_verzonden')
    .gte('created_at', '2026-05-27')
    .order('created_at', { ascending: true })
    .limit(2000)

  const eerste = new Map<string, { created_at: string; details: Record<string, unknown> | null }>()
  const alHersteld = new Set<string>()
  for (const a of audits || []) {
    const id = a.entiteit_id as string
    if ((a.details as Record<string, unknown> | null)?.herzending) { alHersteld.add(id); continue }
    if (!eerste.has(id)) eerste.set(id, { created_at: a.created_at as string, details: a.details as Record<string, unknown> | null })
  }

  const ids = [...eerste.keys()]
  const { data: facturen } = await sb
    .from('facturen')
    .select('id, factuurnummer, status, datum, totaal, betaald_bedrag, factuur_type, relatie:relaties(contactpersoon, bedrijfsnaam)')
    .in('id', ids)

  type Kandidaat = {
    id: string; factuurnummer: string; status: string; datum: string
    totaal: number; betaald: number; isCredit: boolean; klantNaam: string
  }
  const kandidaten: Kandidaat[] = []
  for (const f of facturen || []) {
    const e = eerste.get(f.id as string)
    if (!e || !f.datum) continue
    // Eerste mail op de dag van de factuurdatum ⇒ die mail bevatte de CONCEPT-PDF
    if ((e.created_at as string).slice(0, 10) !== f.datum) continue
    if (alHersteld.has(f.id as string)) continue
    const rel = f.relatie as { contactpersoon?: string | null; bedrijfsnaam?: string | null } | null
    kandidaten.push({
      id: f.id as string,
      factuurnummer: f.factuurnummer as string,
      status: f.status as string,
      datum: f.datum as string,
      totaal: Number(f.totaal || 0),
      betaald: Number(f.betaald_bedrag || 0),
      isCredit: (f.factuur_type as string | null) === 'credit' || Number(f.totaal || 0) < 0,
      klantNaam: rel?.contactpersoon || rel?.bedrijfsnaam || '',
    })
  }
  kandidaten.sort((a, b) => a.factuurnummer.localeCompare(b.factuurnummer))

  let selectie = kandidaten
  if (body.nummers && body.nummers.length > 0) {
    const set = new Set(body.nummers)
    selectie = selectie.filter(k => set.has(k.factuurnummer))
  }
  if (body.limit && body.limit > 0) selectie = selectie.slice(0, body.limit)

  if (body.dryRun) {
    return NextResponse.json({
      totaalKandidaten: kandidaten.length,
      selectie: selectie.map(k => ({ nr: k.factuurnummer, status: k.status, datum: k.datum, totaal: k.totaal })),
    })
  }

  const datumNL = (d: string) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  let verzonden = 0
  const fouten: { nr: string; error: string }[] = []

  for (const k of selectie) {
    try {
      const defaults = await getFactuurEmailDefaults(k.id)
      if (defaults.error || !defaults.to) {
        fouten.push({ nr: k.factuurnummer, error: defaults.error || 'geen e-mailadres' })
        continue
      }
      const soort = k.isCredit ? 'creditfactuur' : 'factuur'
      const openstaand = k.totaal - k.betaald
      const slotzin = k.isCredit
        ? 'U hoeft verder niets te doen.'
        : openstaand <= 0.01
          ? 'Deze factuur is al door u voldaan — u hoeft verder niets te doen. Dit exemplaar is uitsluitend bedoeld voor uw administratie.'
          : 'Staat de factuur nog open, dan kunt u eenvoudig betalen via de knop hieronder.'
      const mailBody = `Beste ${k.klantNaam},

Onlangs ontving u van ons ${soort} ${k.factuurnummer}. Door een technische fout in ons facturatiesysteem stond op de meegestuurde PDF ten onrechte "CONCEPT FACTUUR" en ontbrak de factuurdatum. Onze excuses voor het ongemak.

In de bijlage vindt u het definitieve exemplaar van dezelfde ${soort}, met factuurdatum ${datumNL(k.datum)}. Het factuurnummer en het bedrag zijn ongewijzigd — dit is dus géén nieuwe ${soort}. ${slotzin}

Heeft u vragen? Neem dan gerust contact met ons op.

Met vriendelijke groet,
Rebu Kozijnen`

      const result = await sendFactuurEmail(k.id, {
        to: defaults.to,
        subject: `Gecorrigeerde ${soort} ${k.factuurnummer} - Rebu Kozijnen`,
        body: mailBody,
        bcc: body.bcc ? [body.bcc] : undefined,
        herzending: true,
        skipSnelStart: true,
      })
      if (result.error) fouten.push({ nr: k.factuurnummer, error: result.error })
      else verzonden++
    } catch (err) {
      fouten.push({ nr: k.factuurnummer, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({
    totaalKandidaten: kandidaten.length,
    behandeld: selectie.length,
    verzonden,
    resterend: kandidaten.length - selectie.length,
    fouten,
  })
}
